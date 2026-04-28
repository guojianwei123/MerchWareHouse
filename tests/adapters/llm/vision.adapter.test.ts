import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '../../../src/adapters/logging/logger';
import { cleanOcrText, GlmOcrDeepseekVisionAdapter } from '../../../src/adapters/llm/vision.adapter';

const createTestLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const adapter = (logger: Logger = createTestLogger()) =>
  new GlmOcrDeepseekVisionAdapter({
    zhipuApiKey: 'zhipu-key',
    zhipuLayoutParsingUrl: 'https://open.bigmodel.cn/api/paas/v4/layout_parsing',
    deepseekApiKey: 'deepseek-key',
    deepseekBaseUrl: 'https://api.deepseek.com',
    logger,
  });

const jsonResponse = (body: unknown, status = 200): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

const requestBody = (call: unknown[]): Record<string, unknown> => {
  const init = call[1] as RequestInit;
  return JSON.parse(String(init.body)) as Record<string, unknown>;
};

describe('GlmOcrDeepseekVisionAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends images through GLM-OCR and DeepSeek with OCR markdown', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          md_results: '# Birthday Badge\n\n![](page=0,bbox=[1, 2, 3, 4])\n\nPrice: ¥58\n\nx2',
          layout_details: [[{ label: 'text', content: 'Birthday Badge Price 58' }]],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [{ finish_reason: 'stop', message: { content: '{"name":"Birthday Badge","type":"badge"}' } }],
          usage: {
            completion_tokens_details: { reasoning_tokens: 0 },
            prompt_cache_hit_tokens: 128,
            prompt_cache_miss_tokens: 64,
            total_tokens: 256,
            prompt_tokens_details: { cached_tokens: 32 },
          },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const logger = createTestLogger();

    const result = await adapter(logger).extractGuziInfo('https://example.com/item.png', 'Extract guzi JSON.');

    expect(result).toBe('{"name":"Birthday Badge","type":"badge"}');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://open.bigmodel.cn/api/paas/v4/layout_parsing',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(requestBody(fetchMock.mock.calls[0])).toMatchObject({
      model: 'glm-ocr',
      file: 'https://example.com/item.png',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    const deepseekBody = requestBody(fetchMock.mock.calls[1]);
    const messages = deepseekBody.messages as Array<{ role: string; content: string }>;

    expect(deepseekBody.model).toBe('deepseek-v4-flash');
    expect(deepseekBody.thinking).toEqual({ type: 'disabled' });
    expect(deepseekBody.response_format).toEqual({ type: 'json_object' });
    expect(messages[0].content).toContain('Extract guzi JSON.');
    expect(messages[0].content).toContain('No markdown, no explanations, no reasoning');
    expect(messages[1].content).toContain('# Birthday Badge');
    expect(messages[1].content).toContain('Price: ¥58');
    expect(messages[1].content).toContain('x2');
    expect(messages[1].content).not.toContain('![](page=');
    expect(messages[1].content).toContain('[text] Birthday Badge Price 58');
    expect(logger.info).toHaveBeenCalledWith(
      'GLM-OCR request',
      expect.objectContaining({
        module: 'ai.ocr',
        requestBody: {
          model: 'glm-ocr',
          file: 'https://example.com/item.png',
        },
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      'GLM-OCR response',
      expect.objectContaining({
        module: 'ai.ocr',
        statusCode: 200,
        responseBody: expect.objectContaining({
          mdPreview: expect.stringContaining('# Birthday Badge'),
          layoutItems: 1,
        }),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      'DeepSeek extraction request',
      expect.objectContaining({
        module: 'ai.deepseek',
        requestBody: expect.objectContaining({
          model: 'deepseek-v4-flash',
          thinking: { type: 'disabled' },
          response_format: { type: 'json_object' },
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('# Birthday Badge'),
            }),
          ]),
        }),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      'DeepSeek extraction response',
      expect.objectContaining({
        module: 'ai.deepseek',
        statusCode: 200,
        responseBody: expect.objectContaining({
          contentPreview: expect.stringContaining('Birthday Badge'),
          finishReason: 'stop',
          reasoningTokens: 0,
        }),
        usage: {
          promptCacheHitTokens: 128,
          promptCacheMissTokens: 64,
          cachedTokens: 32,
          reasoningTokens: 0,
          totalTokens: 256,
        },
      }),
    );
  });

  it('throws when GLM-OCR request fails', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ error: {} }, 500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(adapter().extractGuziInfo('https://example.com/item.png', 'Extract.')).rejects.toThrow(
      'GLM-OCR request failed: 500',
    );
  });

  it('throws when DeepSeek request fails', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ md_results: 'Badge text' }))
      .mockResolvedValueOnce(jsonResponse({ error: {} }, 502));
    vi.stubGlobal('fetch', fetchMock);

    await expect(adapter().extractGuziInfo('https://example.com/item.png', 'Extract.')).rejects.toThrow(
      'DeepSeek extraction request failed: 502',
    );
  });

  it('throws when provider responses omit expected text content', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ layout_details: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(adapter().extractGuziInfo('https://example.com/item.png', 'Extract.')).rejects.toThrow(
      'GLM-OCR response did not include markdown results',
    );

    const secondFetchMock = vi.fn<typeof fetch>();
    secondFetchMock
      .mockResolvedValueOnce(jsonResponse({ md_results: 'Badge text' }))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: {} }] }));
    vi.stubGlobal('fetch', secondFetchMock);

    await expect(adapter().extractGuziInfo('https://example.com/item.png', 'Extract.')).rejects.toThrow(
      'DeepSeek extraction response did not include text content',
    );
  });
});

describe('cleanOcrText', () => {
  it('removes image placeholders and blank noise while preserving key text', () => {
    const text = cleanOcrText(`
      商品

      ![](page=0,bbox=[1, 2, 3, 4])

      　¥9.19　
      x2
      赠品布袋
      台历
    `);

    expect(text).not.toContain('![](page=');
    expect(text).toContain('¥9.19');
    expect(text).toContain('x2');
    expect(text).toContain('赠品布袋');
    expect(text).toContain('台历');
    expect(text.split('\n')).toEqual(['商品', '¥9.19', 'x2', '赠品布袋', '台历']);
  });
});
