import { appLogger, type Logger } from '../logging/logger';

export interface ChatAdapter {
  chat(message: string): Promise<string>;
}

interface DeepseekChatCompletionResponse {
  choices?: Array<{
    finish_reason?: unknown;
    message?: {
      content?: unknown;
    };
  }>;
  usage?: {
    total_tokens?: unknown;
  };
}

const SYSTEM_PROMPT = `你是“谷子仓库”的 AI 助手，只回答二次元周边收藏相关问题。
你可以解释谷子术语、品类、IP/角色收藏背景、收纳和入库建议。
如果涉及市场价格、行情、真假或官方信息，必须提示用户以可靠来源或自己的确认结果为准。
使用简洁中文回答，不要编造实时市场数据。`;

export class MockChatAdapter implements ChatAdapter {
  async chat(message: string): Promise<string> {
    return `这是谷子助手的模拟回答：${message}`;
  }
}

export class DeepseekChatAdapter implements ChatAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly logger: Logger;

  constructor(
    options: {
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      logger?: Logger;
    } = {},
  ) {
    const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required for DeepseekChatAdapter');
    }

    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
    this.model = options.model ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';
    this.logger = options.logger ?? appLogger;
  }

  async chat(message: string): Promise<string> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const startedAt = Date.now();
    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.3,
      thinking: { type: 'disabled' },
      stream: false,
    };

    this.logger.info('DeepSeek chat request', {
      module: 'ai.chat',
      provider: 'deepseek',
      url,
      requestBody,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const responseBody = await response.text();
    const data = this.tryParseResponse(responseBody);

    this.logger.info('DeepSeek chat response', {
      module: 'ai.chat',
      provider: 'deepseek',
      url,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      responseBody: data
        ? {
            finishReason: data.choices?.[0]?.finish_reason,
            contentPreview: this.previewText(
              typeof data.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content : '',
            ),
            usage: data.usage,
          }
        : { rawPreview: this.previewText(responseBody) },
    });

    if (!response.ok) {
      throw new Error(`DeepSeek chat request failed: ${response.status}`);
    }

    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('DeepSeek chat response did not include text content');
    }

    return content.trim();
  }

  private tryParseResponse(responseBody: string): DeepseekChatCompletionResponse | null {
    try {
      return JSON.parse(responseBody) as DeepseekChatCompletionResponse;
    } catch {
      return null;
    }
  }

  private previewText(value: string, maxLength = 500): string {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...<truncated chars=${value.length}>` : value;
  }
}

export const createChatAdapterFromEnv = (): ChatAdapter => {
  if (process.env.AI_PROVIDER === 'mock') {
    return new MockChatAdapter();
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return new DeepseekChatAdapter();
  }

  throw new Error('DEEPSEEK_API_KEY is required for AI chat, or set AI_PROVIDER=mock for local tests');
};
