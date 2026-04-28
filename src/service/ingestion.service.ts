import { createVisionAdapterFromEnv, type VisionAdapter } from '../adapters/llm/vision.adapter';
import { appLogger, type Logger } from '../adapters/logging/logger';
import { GUZI_EXTRACTION_PROMPT } from '../config/ai-prompts';
import { isSupportedImageDataUrl } from '../types/models/local-image.schema';
import { GuziUnionSchema, type GuziItem } from '../types/models/guzi.schema';
import { z, ZodError, type ZodIssue } from 'zod';

const AI_OPTIONAL_DRAFT_FIELDS = [
  'officialPrice',
  'purchasePrice',
  'marketPrice',
  'diameter',
  'shape',
  'length',
  'width',
  'height',
  'material',
  'scale',
  'manufacturer',
  'description',
  'paperType',
  'hasBase',
  'compatibleModel',
  'specialType',
  'isSecret',
  'notes',
];

const AI_OPTIONAL_POSITIVE_NUMBER_FIELDS = ['diameter', 'length', 'width', 'height'];

const INCOMPLETE_OCR_NAME_NOTE = 'OCR 未识别完整名称，请人工核对';

export class IngestionService {
  constructor(
    private readonly visionAdapter: VisionAdapter = createVisionAdapterFromEnv(),
    private readonly logger: Logger = appLogger,
  ) {}

  async processScreenshot(screenshotUrl: string): Promise<GuziItem[]> {
    const imageUrl = this.parseImageUrl(screenshotUrl);
    const extracted = await this.visionAdapter.extractGuziInfo(imageUrl, GUZI_EXTRACTION_PROMPT);
    return this.createDraftItems(extracted, imageUrl);
  }

  async validateExtractedJson(data: unknown): Promise<GuziItem> {
    return GuziUnionSchema.parse(data);
  }

  async createDraftItem(data: unknown, imageUrl?: string): Promise<GuziItem> {
    const parsed = this.parseAdapterOutput(data);

    if (!this.isRecord(parsed)) {
      throw new Error('AI extraction result must be an object');
    }

    return this.validateExtractedJson(this.normalizeDraftItem(parsed, imageUrl));
  }

  async createDraftItems(data: unknown, imageUrl?: string): Promise<GuziItem[]> {
    const parsed = this.parseAdapterOutput(data);
    const items = this.extractDraftItemCandidates(parsed);
    const failedItems = this.extractFailedDraftItemCandidates(parsed);

    if (items.length === 0 && failedItems.length === 0) {
      throw new ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: '未从 OCR 文本中识别到可入库谷子',
        },
      ]);
    }

    const drafts: GuziItem[] = [];
    const issues: ZodIssue[] = [];

    for (const [index, item] of failedItems.entries()) {
      const notes = this.toOptionalString(item.notes) ?? 'AI marked this item for manual review';
      issues.push({
        code: z.ZodIssueCode.custom,
        path: ['failedItems', index],
        message: notes,
      });
      this.logger.warn('AI draft item marked failed', {
        module: 'ingestion',
        index,
        notes,
        item,
      });
    }

    for (const [index, item] of items.entries()) {
      if (this.isFailedDraftItem(item)) {
        const notes = this.toOptionalString(item.notes) ?? 'AI marked this item for manual review';
        issues.push({
          code: z.ZodIssueCode.custom,
          path: ['items', index],
          message: notes,
        });
        this.logger.warn('AI draft item marked failed', {
          module: 'ingestion',
          index,
          notes,
          item,
        });
        continue;
      }

      try {
        drafts.push(await this.validateExtractedJson(this.normalizeDraftItem(item, imageUrl)));
      } catch (error) {
        const itemIssues = error instanceof ZodError
          ? error.errors.map((issue) => ({ ...issue, path: ['items', index, ...issue.path] }))
          : [{
              code: z.ZodIssueCode.custom,
              path: ['items', index],
              message: error instanceof Error ? error.message : 'Invalid AI draft item',
            }];

        issues.push(...itemIssues);
        this.logger.warn('AI draft item validation failed', {
          module: 'ingestion',
          index,
          issues: itemIssues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
          item,
        });
      }
    }

    if (drafts.length === 0) {
      throw new ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: '未从 OCR 文本中识别到可入库谷子',
        },
        ...issues,
      ]);
    }

    return drafts;
  }

  private parseImageUrl(imageUrl: string): string {
    if (isSupportedImageDataUrl(imageUrl)) {
      return imageUrl;
    }

    try {
      const url = new URL(imageUrl);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('imageUrl must be an http(s) URL or image data URL');
      }

      return url.toString();
    } catch {
      throw new Error('imageUrl must be an http(s) URL or image data URL');
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

  private extractDraftItemCandidates(data: unknown): Record<string, unknown>[] {
    if (!this.isRecord(data)) {
      throw new Error('AI extraction result must be an object');
    }

    if (Array.isArray(data.items)) {
      return data.items.filter(this.isRecord);
    }

    if (this.isFailedDraftItem(data)) {
      return [];
    }

    return [data];
  }

  private extractFailedDraftItemCandidates(data: unknown): Record<string, unknown>[] {
    if (!this.isRecord(data)) {
      throw new Error('AI extraction result must be an object');
    }

    if (Array.isArray(data.failedItems)) {
      return data.failedItems.filter(this.isRecord);
    }

    if (Array.isArray(data.items)) {
      return [];
    }

    return this.isFailedDraftItem(data) ? [data] : [];
  }

  private normalizeDraftItem(item: Record<string, unknown>, imageUrl?: string): Record<string, unknown> {
    const normalized = { ...item };

    for (const field of AI_OPTIONAL_DRAFT_FIELDS) {
      if (this.isMissingOptionalAiField(field, normalized[field])) {
        delete normalized[field];
      }
    }

    const name = this.normalizeDraftName(item.name);
    const notes = this.normalizeDraftNotes(item.notes, name.needsManualReview);

    return {
      ...normalized,
      id: this.toOptionalString(item.id) ?? this.createDraftId(),
      name: name.value,
      ip: this.toOptionalString(item.ip) ?? '未知IP',
      character: this.toOptionalString(item.character) ?? '未知角色',
      series: this.toOptionalString(item.series) ?? '未知系列',
      imageUrl: imageUrl ?? this.toOptionalString(item.imageUrl),
      ...(notes ? { notes } : {}),
    };
  }

  private normalizeDraftName(value: unknown): { value: string; needsManualReview: boolean } {
    const name = this.toOptionalString(value);

    if (!name || this.isLowConfidenceName(name)) {
      return { value: '未知商品', needsManualReview: true };
    }

    return { value: name, needsManualReview: false };
  }

  private normalizeDraftNotes(value: unknown, needsManualReview: boolean): string | undefined {
    const notes = this.toOptionalString(value);

    if (!needsManualReview) {
      return notes;
    }

    if (!notes) {
      return INCOMPLETE_OCR_NAME_NOTE;
    }

    return notes.includes(INCOMPLETE_OCR_NAME_NOTE) ? notes : `${notes}；${INCOMPLETE_OCR_NAME_NOTE}`;
  }

  private isLowConfidenceName(name: string): boolean {
    const compactName = name.trim();

    return (
      compactName.length <= 2 ||
      /^[\d\s.¥￥元xX件个]+$/.test(compactName) ||
      /^¥?\d+(?:\.\d+)?$/.test(compactName)
    );
  }

  private isFailedDraftItem(item: Record<string, unknown>): boolean {
    return this.toOptionalString(item.status) === 'failed';
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

  private isBlankString(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length === 0;
  }

  private isMissingOptionalAiField(field: string, value: unknown): boolean {
    return (
      value === null ||
      this.isBlankString(value) ||
      (AI_OPTIONAL_POSITIVE_NUMBER_FIELDS.includes(field) && value === 0)
    );
  }
}
