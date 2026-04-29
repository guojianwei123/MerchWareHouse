import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '../../../src/adapters/logging/logger';
import { DeepseekChatAdapter } from '../../../src/adapters/llm/chat.adapter';

const createTestLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
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

describe('DeepseekChatAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a guzi-scoped chat request and returns text content', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        choices: [{ finish_reason: 'stop', message: { content: '吧唧通常指徽章类谷子。' } }],
        usage: { total_tokens: 42 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const logger = createTestLogger();
    const adapter = new DeepseekChatAdapter({
      apiKey: 'deepseek-key',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
      logger,
    });

    await expect(adapter.chat('什么是吧唧？')).resolves.toBe('吧唧通常指徽章类谷子。');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );

    const body = requestBody(fetchMock.mock.calls[0]);
    const messages = body.messages as Array<{ role: string; content: string }>;

    expect(body.model).toBe('deepseek-v4-flash');
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(messages[0].content).toContain('谷子仓库');
    expect(messages[0].content).toContain('不要编造实时市场数据');
    expect(messages[1]).toEqual({ role: 'user', content: '什么是吧唧？' });
    expect(logger.info).toHaveBeenCalledWith('DeepSeek chat response', expect.objectContaining({ statusCode: 200 }));
  });

  it('throws when DeepSeek chat request fails', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(jsonResponse({ error: {} }, 502));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new DeepseekChatAdapter({ apiKey: 'deepseek-key' });

    await expect(adapter.chat('吧唧怎么收纳？')).rejects.toThrow('DeepSeek chat request failed: 502');
  });
});
