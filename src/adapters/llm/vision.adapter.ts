import type { GuziItem } from '../../types/models/guzi.schema';

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

interface QwenChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

export class QwenVisionAdapter implements VisionAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(options: { apiKey?: string; baseUrl?: string; model?: string } = {}) {
    const apiKey = options.apiKey ?? process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      throw new Error('DASHSCOPE_API_KEY is required for QwenVisionAdapter');
    }

    this.apiKey = apiKey;
    this.baseUrl =
      options.baseUrl ??
      process.env.DASHSCOPE_BASE_URL ??
      'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.model = options.model ?? process.env.DASHSCOPE_VISION_MODEL ?? 'qwen-vl-plus';
  }

  async extractGuziInfo(imageUrl: string, prompt: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Qwen vision request failed: ${response.status}`);
    }

    const data = (await response.json()) as QwenChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== 'string') {
      throw new Error('Qwen vision response did not include text content');
    }

    return content;
  }
}

export const createVisionAdapterFromEnv = (): VisionAdapter => {
  if (process.env.AI_PROVIDER === 'mock') {
    return new MockVisionAdapter();
  }

  if (process.env.AI_PROVIDER === 'dashscope' || process.env.DASHSCOPE_API_KEY) {
    return new QwenVisionAdapter();
  }

  throw new Error('AI_PROVIDER must be set to dashscope for real AI extraction, or mock for local tests');
};
