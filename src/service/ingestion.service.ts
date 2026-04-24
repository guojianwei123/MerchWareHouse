import { createVisionAdapterFromEnv, type VisionAdapter } from '../adapters/llm/vision.adapter';
import { GUZI_EXTRACTION_PROMPT } from '../config/ai-prompts';
import { GuziUnionSchema, type GuziItem } from '../types/models/guzi.schema';

export class IngestionService {
  constructor(private readonly visionAdapter: VisionAdapter = createVisionAdapterFromEnv()) {}

  async processScreenshot(screenshotUrl: string): Promise<GuziItem> {
    const imageUrl = this.parseImageUrl(screenshotUrl);
    const extracted = await this.visionAdapter.extractGuziInfo(imageUrl, GUZI_EXTRACTION_PROMPT);
    return this.createDraftItem(extracted, imageUrl);
  }

  async validateExtractedJson(data: unknown): Promise<GuziItem> {
    return GuziUnionSchema.parse(data);
  }

  async createDraftItem(data: unknown, imageUrl?: string): Promise<GuziItem> {
    const parsed = this.parseAdapterOutput(data);

    if (!this.isRecord(parsed)) {
      throw new Error('AI extraction result must be an object');
    }

    return this.validateExtractedJson({
      ...parsed,
      id: this.toOptionalString(parsed.id) ?? this.createDraftId(),
      imageUrl: imageUrl ?? this.toOptionalString(parsed.imageUrl),
    });
  }

  private parseImageUrl(imageUrl: string): string {
    try {
      return new URL(imageUrl).toString();
    } catch {
      throw new Error('imageUrl must be a valid URL');
    }
  }

  private parseAdapterOutput(data: unknown): unknown {
    if (typeof data !== 'string') {
      return data;
    }

    const jsonText = data
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    return JSON.parse(jsonText);
  }

  private createDraftId(): string {
    return `guzi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private toOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
