import type { GuziItem } from '../../types/models/guzi.schema';
import { appLogger, type Logger } from '../logging/logger';

export interface VisionAdapter {
  extractGuziInfo(imageUrl: string, prompt: string): Promise<unknown>;
}

export class MockVisionAdapter implements VisionAdapter {
  async extractGuziInfo(imageUrl: string): Promise<GuziItem> {
    return {
      id: `guzi_${Date.now()}`,
      name: 'Mock Badge',
      type: 'badge',
      ip: 'Mock IP',
      character: 'Mock Character',
      series: 'Mock Series',
      imageUrl,
      purchasePrice: 50,
      diameter: 58,
      shape: 'round',
    };
  }
}

interface GlmOcrResponse {
  md_results?: unknown;
  layout_details?: unknown;
}

interface DeepseekChatCompletionResponse {
  choices?: Array<{
    finish_reason?: unknown;
    message?: {
      content?: unknown;
    };
  }>;
  usage?: {
    completion_tokens_details?: {
      reasoning_tokens?: unknown;
    };
    prompt_cache_hit_tokens?: unknown;
    prompt_cache_miss_tokens?: unknown;
    total_tokens?: unknown;
    prompt_tokens_details?: {
      cached_tokens?: unknown;
    };
  };
}

const imagePlaceholderPattern = /^!\[\]\(page=\d+,bbox=\[[^\)]*\]\)$/i;

export const cleanOcrText = (text: string): string => {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u00A0\u3000]/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !imagePlaceholderPattern.test(line))
    .join('\n');
};

export class GlmOcrDeepseekVisionAdapter implements VisionAdapter {
  private readonly zhipuApiKey: string;
  private readonly zhipuLayoutParsingUrl: string;
  private readonly deepseekApiKey: string;
  private readonly deepseekBaseUrl: string;
  private readonly deepseekModel: string;
  private readonly logger: Logger;

  constructor(
    options: {
      zhipuApiKey?: string;
      zhipuLayoutParsingUrl?: string;
      deepseekApiKey?: string;
      deepseekBaseUrl?: string;
      deepseekModel?: string;
      logger?: Logger;
    } = {},
  ) {
    const zhipuApiKey = options.zhipuApiKey ?? process.env.ZHIPU_API_KEY;
    const deepseekApiKey = options.deepseekApiKey ?? process.env.DEEPSEEK_API_KEY;

    if (!zhipuApiKey) {
      throw new Error('ZHIPU_API_KEY is required for GlmOcrDeepseekVisionAdapter');
    }

    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY is required for GlmOcrDeepseekVisionAdapter');
    }

    this.zhipuApiKey = zhipuApiKey;
    this.zhipuLayoutParsingUrl =
      options.zhipuLayoutParsingUrl ??
      process.env.ZHIPU_LAYOUT_PARSING_URL ??
      'https://open.bigmodel.cn/api/paas/v4/layout_parsing';
    this.deepseekApiKey = deepseekApiKey;
    this.deepseekBaseUrl = options.deepseekBaseUrl ?? process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
    this.deepseekModel = options.deepseekModel ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';
    this.logger = options.logger ?? appLogger;
  }

  async extractGuziInfo(imageUrl: string, prompt: string): Promise<unknown> {
    const ocrResult = await this.parseLayout(imageUrl);
    return this.extractStructuredJson(prompt, ocrResult);
  }

  private async parseLayout(imageUrl: string): Promise<{ mdResults: string; layoutSummary: string }> {
    const startedAt = Date.now();
    const requestBody = {
      model: 'glm-ocr',
      file: imageUrl,
    };
    this.logger.info('GLM-OCR request', {
      module: 'ai.ocr',
      provider: 'glm-ocr',
      url: this.zhipuLayoutParsingUrl,
      requestBody,
    });

    const response = await fetch(this.zhipuLayoutParsingUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.zhipuApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const responseBody = await response.text();

    this.logger.info('GLM-OCR response', {
      module: 'ai.ocr',
      provider: 'glm-ocr',
      url: this.zhipuLayoutParsingUrl,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      responseBody: this.summarizeOcrResponse(responseBody),
    });

    if (!response.ok) {
      throw new Error(`GLM-OCR request failed: ${response.status}`);
    }

    const data = JSON.parse(responseBody) as GlmOcrResponse;

    if (typeof data.md_results !== 'string') {
      throw new Error('GLM-OCR response did not include markdown results');
    }

    const mdResults = cleanOcrText(data.md_results);
    const layoutSummary = cleanOcrText(this.summarizeLayoutDetails(data.layout_details));

    this.logger.info('OCR cleaned text', {
      module: 'ai.ocr',
      provider: 'glm-ocr',
      mdResults,
      layoutSummary,
    });

    return { mdResults, layoutSummary };
  }

  private async extractStructuredJson(
    prompt: string,
    ocrResult: { mdResults: string; layoutSummary: string },
  ): Promise<unknown> {
    const url = `${this.deepseekBaseUrl.replace(/\/$/, '')}/chat/completions`;
    const startedAt = Date.now();
    const requestBody = {
      model: this.deepseekModel,
      messages: [
        {
          role: 'system',
          content: `You convert OCR markdown and layout text into one strict JSON object. Return ONLY one valid JSON object. No markdown, no explanations, no reasoning.

${prompt}`,
        },
        {
          role: 'user',
          content: `OCR markdown:
${ocrResult.mdResults}

Layout details:
${ocrResult.layoutSummary}`,
        },
      ],
      temperature: 0,
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      stream: false,
    };
    this.logger.info('DeepSeek extraction request', {
      module: 'ai.deepseek',
      provider: 'deepseek',
      url,
      requestBody,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const responseBody = await response.text();
    const parsedResponse = this.tryParseDeepseekResponse(responseBody);

    this.logger.info('DeepSeek extraction response', {
      module: 'ai.deepseek',
      provider: 'deepseek',
      url,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      responseBody: this.summarizeDeepseekResponse(parsedResponse, responseBody),
      usage: parsedResponse?.usage
        ? {
            promptCacheHitTokens: parsedResponse.usage.prompt_cache_hit_tokens,
            promptCacheMissTokens: parsedResponse.usage.prompt_cache_miss_tokens,
            cachedTokens: parsedResponse.usage.prompt_tokens_details?.cached_tokens,
            reasoningTokens: parsedResponse.usage.completion_tokens_details?.reasoning_tokens,
            totalTokens: parsedResponse.usage.total_tokens,
          }
        : undefined,
    });

    if (!response.ok) {
      throw new Error(`DeepSeek extraction request failed: ${response.status}`);
    }

    const data = parsedResponse ?? (JSON.parse(responseBody) as DeepseekChatCompletionResponse);
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== 'string') {
      throw new Error('DeepSeek extraction response did not include text content');
    }

    return content;
  }

  private tryParseDeepseekResponse(responseBody: string): DeepseekChatCompletionResponse | null {
    try {
      return JSON.parse(responseBody) as DeepseekChatCompletionResponse;
    } catch {
      return null;
    }
  }

  private summarizeOcrResponse(responseBody: string): Record<string, unknown> {
    try {
      const data = JSON.parse(responseBody) as GlmOcrResponse & {
        id?: unknown;
        model?: unknown;
        usage?: unknown;
        data_info?: unknown;
      };

      return {
        id: data.id,
        model: data.model,
        dataInfo: data.data_info,
        usage: data.usage,
        mdPreview: typeof data.md_results === 'string' ? this.previewText(cleanOcrText(data.md_results)) : undefined,
        layoutItems: this.countLayoutItems(data.layout_details),
      };
    } catch {
      return {
        rawPreview: this.previewText(responseBody),
      };
    }
  }

  private summarizeDeepseekResponse(
    response: DeepseekChatCompletionResponse | null,
    responseBody: string,
  ): Record<string, unknown> {
    if (!response) {
      return {
        rawPreview: this.previewText(responseBody),
      };
    }

    return {
      usage: response.usage,
      finishReason: response.choices?.[0]?.finish_reason,
      reasoningTokens: response.usage?.completion_tokens_details?.reasoning_tokens,
      contentPreview: this.previewText(
        typeof response.choices?.[0]?.message?.content === 'string' ? response.choices[0].message.content : '',
      ),
    };
  }

  private previewText(value: string, maxLength = 500): string {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...<truncated chars=${value.length}>` : value;
  }

  private countLayoutItems(layoutDetails: unknown): number {
    if (!Array.isArray(layoutDetails)) {
      return 0;
    }

    return layoutDetails.reduce((count, page) => count + (Array.isArray(page) ? page.length : 0), 0);
  }

  private summarizeLayoutDetails(layoutDetails: unknown): string {
    if (!Array.isArray(layoutDetails)) {
      return '';
    }

    return layoutDetails
      .flatMap((page) => (Array.isArray(page) ? page : []))
      .map((item) => {
        if (!this.isRecord(item)) {
          return '';
        }

        const label = typeof item.label === 'string' ? item.label : 'unknown';
        const content = typeof item.content === 'string' ? item.content : '';

        return content ? `[${label}] ${content}` : `[${label}]`;
      })
      .filter(Boolean)
      .join('\n')
      .slice(0, 8000);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

export const createVisionAdapterFromEnv = (): VisionAdapter => {
  if (process.env.AI_PROVIDER === 'mock') {
    return new MockVisionAdapter();
  }

  if (
    process.env.AI_PROVIDER === 'glm-ocr-deepseek' ||
    (process.env.ZHIPU_API_KEY && process.env.DEEPSEEK_API_KEY)
  ) {
    return new GlmOcrDeepseekVisionAdapter();
  }

  throw new Error('AI_PROVIDER must be set to glm-ocr-deepseek for real AI extraction, or mock for local tests');
};
