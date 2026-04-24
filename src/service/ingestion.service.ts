import { MockVisionAdapter, type VisionAdapter } from '../adapters/llm/vision.adapter';
import { GuziUnionSchema, type GuziItem } from '../types/models/guzi.schema';

export class IngestionService {
  constructor(private readonly visionAdapter: VisionAdapter = new MockVisionAdapter()) {}

  async processScreenshot(screenshotUrl: string): Promise<GuziItem> {
    const extracted = await this.visionAdapter.extractGuziInfo(screenshotUrl);
    return this.createDraftItem(extracted);
  }

  async validateExtractedJson(data: unknown): Promise<GuziItem> {
    return GuziUnionSchema.parse(data);
  }

  async createDraftItem(data: unknown): Promise<GuziItem> {
    return this.validateExtractedJson(data);
  }
}
