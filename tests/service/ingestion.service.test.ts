import { describe, expect, it, vi } from 'vitest';
import { IngestionService } from '../../src/service/ingestion.service';
import type { VisionAdapter } from '../../src/adapters/llm/vision.adapter';
import type { Logger } from '../../src/adapters/logging/logger';

class StaticVisionAdapter implements VisionAdapter {
  constructor(private readonly output: unknown) {}

  async extractGuziInfo(): Promise<unknown> {
    return this.output;
  }
}

class CapturingVisionAdapter implements VisionAdapter {
  prompt = '';

  constructor(private readonly output: unknown) {}

  async extractGuziInfo(_imageUrl: string, prompt: string): Promise<unknown> {
    this.prompt = prompt;
    return this.output;
  }
}

const createTestLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const validBadge = {
  name: 'Birthday Badge',
  type: 'badge',
  ip: 'Haikyu',
  character: 'Hinata',
  series: 'Birthday',
  purchasePrice: 58,
  diameter: 58,
  shape: 'round',
};
const validImageDataUrl = 'data:image/png;base64,aGVsbG8=';

describe('IngestionService', () => {
  it('creates a draft from a valid AI object and fills system fields', async () => {
    const service = new IngestionService(new StaticVisionAdapter(validBadge));

    const [draft] = await service.processScreenshot('https://example.com/order.jpg');

    expect(draft.id).toMatch(/^guzi_/);
    expect(draft.imageUrl).toBe('https://example.com/order.jpg');
    expect(draft.type).toBe('badge');
  });

  it('creates a draft from a valid JSON string', async () => {
    const service = new IngestionService(new StaticVisionAdapter(JSON.stringify(validBadge)));

    const [draft] = await service.processScreenshot('https://example.com/item.jpg');

    expect(draft.name).toBe('Birthday Badge');
  });

  it('creates a draft from a valid image data URL', async () => {
    const service = new IngestionService(new StaticVisionAdapter(validBadge));

    const [draft] = await service.processScreenshot(validImageDataUrl);

    expect(draft.imageUrl).toBe(validImageDataUrl);
    expect(draft.type).toBe('badge');
  });

  it('creates multiple drafts from an items array', async () => {
    const service = new IngestionService(
      new StaticVisionAdapter({
        items: [
          validBadge,
          {
            name: 'Desk Calendar',
            type: 'paper_card',
            ip: 'Genshin',
            character: 'Unknown',
            series: 'Calendar',
            length: 120,
            width: 80,
            paperType: '台历',
          },
          {
            name: '赠品布袋',
            type: 'fabric',
            ip: 'Genshin',
            character: 'Unknown',
            series: 'Gift',
            length: 300,
            width: 240,
            material: '布',
            purchasePrice: 0,
          },
        ],
      }),
    );

    const drafts = await service.processScreenshot('https://example.com/order.jpg');

    expect(drafts).toHaveLength(3);
    expect(drafts.map((draft) => draft.type)).toEqual(['badge', 'paper_card', 'fabric']);
  });

  it('adds available categories to the extraction prompt', async () => {
    const adapter = new CapturingVisionAdapter(validBadge);
    const service = new IngestionService(adapter);

    await service.processScreenshot('https://example.com/order.jpg', [
      { value: 'badge', label: '吧唧' },
      { value: '票根', label: '票根' },
    ]);

    expect(adapter.prompt).toContain('Available categories:');
    expect(adapter.prompt).toContain('value: "badge", label: "吧唧"');
    expect(adapter.prompt).toContain('value: "票根", label: "票根"');
  });

  it('normalizes fixed category labels to category values', async () => {
    const service = new IngestionService(new StaticVisionAdapter({ ...validBadge, type: '吧唧' }));

    const [draft] = await service.processScreenshot('https://example.com/item.jpg', [
      { value: 'badge', label: '吧唧' },
    ]);

    expect(draft.type).toBe('badge');
  });

  it('keeps user custom category names when they match available categories', async () => {
    const service = new IngestionService(new StaticVisionAdapter({ ...validBadge, type: '票根' }));

    const [draft] = await service.processScreenshot('https://example.com/item.jpg', [
      { value: 'badge', label: '吧唧' },
      { value: '票根', label: '票根' },
    ]);

    expect(draft.type).toBe('票根');
  });

  it('falls back to unknown category when AI returns a non-existing category', async () => {
    const service = new IngestionService(new StaticVisionAdapter({ ...validBadge, type: '主题印象系列徽章' }));

    const [draft] = await service.processScreenshot('https://example.com/item.jpg', [
      { value: 'badge', label: '吧唧' },
      { value: '票根', label: '票根' },
    ]);

    expect(draft.type).toBe('未知品类');
  });

  it('normalizes empty common fields before validation', async () => {
    const service = new IngestionService(
      new StaticVisionAdapter({
        ...validBadge,
        name: '',
        ip: '',
        character: '',
        series: '',
      }),
    );

    const [draft] = await service.processScreenshot('https://example.com/item.jpg');

    expect(draft.name).toBe('未知商品');
    expect(draft.ip).toBe('未知IP');
    expect(draft.character).toBe('未知角色');
    expect(draft.series).toBe('未知系列');
  });

  it('removes null optional AI fields before validation', async () => {
    const service = new IngestionService(
      new StaticVisionAdapter({
        ...validBadge,
        officialPrice: null,
        purchasePrice: null,
        marketPrice: null,
        diameter: null,
        shape: null,
        length: null,
        width: null,
        height: null,
        material: null,
        scale: null,
        manufacturer: null,
        description: null,
        paperType: null,
        hasBase: null,
        compatibleModel: null,
        specialType: null,
        isSecret: null,
        notes: null,
      }),
    );

    const [draft] = await service.processScreenshot('https://example.com/item.jpg');

    expect(draft.name).toBe('Birthday Badge');
    expect(draft.officialPrice).toBeUndefined();
    expect(draft.purchasePrice).toBeUndefined();
    expect(draft.marketPrice).toBeUndefined();
    expect(draft.diameter).toBeUndefined();
    expect(draft.shape).toBeUndefined();
    expect(draft.manufacturer).toBeUndefined();
    expect(draft.notes).toBeUndefined();
  });

  it('removes blank optional AI text fields before validation', async () => {
    const service = new IngestionService(
      new StaticVisionAdapter({
        ...validBadge,
        notes: '',
        material: ' ',
        scale: '',
        manufacturer: '',
        description: '',
      }),
    );

    const [draft] = await service.processScreenshot('https://example.com/item.jpg');

    expect(draft.name).toBe('Birthday Badge');
    expect(draft.notes).toBeUndefined();
    expect(draft.material).toBeUndefined();
    expect(draft.scale).toBeUndefined();
    expect(draft.manufacturer).toBeUndefined();
    expect(draft.description).toBeUndefined();
  });

  it('removes zero placeholder dimensions before validation while keeping zero prices', async () => {
    const service = new IngestionService(
      new StaticVisionAdapter({
        ...validBadge,
        diameter: 0,
        length: 0,
        width: 0,
        height: 0,
        marketPrice: 0,
      }),
    );

    const [draft] = await service.processScreenshot('https://example.com/item.jpg');

    expect(draft.name).toBe('Birthday Badge');
    expect(draft.diameter).toBeUndefined();
    expect(draft.length).toBeUndefined();
    expect(draft.width).toBeUndefined();
    expect(draft.height).toBeUndefined();
    expect(draft.marketPrice).toBe(0);
  });

  it('keeps valid drafts when another item is invalid', async () => {
    const logger = createTestLogger();
    const service = new IngestionService(
      new StaticVisionAdapter({
        items: [
          validBadge,
          {
            ...validBadge,
            name: 'Broken Badge',
            type: '',
          },
        ],
      }),
      logger,
    );

    const drafts = await service.processScreenshot('https://example.com/item.jpg');

    expect(drafts).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'AI draft item validation failed',
      expect.objectContaining({ index: 1 }),
    );
  });

  it('keeps valid drafts when failedItems are present', async () => {
    const logger = createTestLogger();
    const service = new IngestionService(
      new StaticVisionAdapter({
        items: [validBadge],
        failedItems: [{ notes: "第二个商品仅显示'20 ¥113.43'，商品名称无法从OCR文本确定。" }],
      }),
      logger,
    );

    const drafts = await service.processScreenshot('https://example.com/item.jpg');

    expect(drafts).toHaveLength(1);
    expect(drafts[0].name).toBe('Birthday Badge');
    expect(logger.warn).toHaveBeenCalledWith(
      'AI draft item marked failed',
      expect.objectContaining({
        index: 0,
        notes: "第二个商品仅显示'20 ¥113.43'，商品名称无法从OCR文本确定。",
      }),
    );
  });

  it('creates a manual-review draft for low-confidence OCR names', async () => {
    const service = new IngestionService(
      new StaticVisionAdapter({
        items: [
          {
            name: '20',
            type: '未知品类',
            ip: '原神',
            character: '未知角色',
            series: '未知系列',
            purchasePrice: 113.43,
          },
        ],
      }),
    );

    const [draft] = await service.processScreenshot('https://example.com/item.jpg');

    expect(draft.name).toBe('未知商品');
    expect(draft.notes).toBe('OCR 未识别完整名称，请人工核对');
    expect(draft.purchasePrice).toBe(113.43);
  });

  it('skips failed items and logs manual review notes', async () => {
    const logger = createTestLogger();
    const service = new IngestionService(
      new StaticVisionAdapter({
        items: [
          validBadge,
          {
            status: 'failed',
            notes: '赠品只有图片，没有 OCR 商品名',
          },
        ],
      }),
      logger,
    );

    const drafts = await service.processScreenshot('https://example.com/item.jpg');

    expect(drafts).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'AI draft item marked failed',
      expect.objectContaining({
        index: 1,
        notes: '赠品只有图片，没有 OCR 商品名',
      }),
    );
  });

  it('rejects all-failed item results with a validation error', async () => {
    const logger = createTestLogger();
    const service = new IngestionService(
      new StaticVisionAdapter({
        items: [{ status: 'failed', notes: '图片模糊' }],
      }),
      logger,
    );

    await expect(service.processScreenshot('https://example.com/item.jpg')).rejects.toThrow(
      '未从 OCR 文本中识别到可入库谷子',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'AI draft item marked failed',
      expect.objectContaining({
        notes: '图片模糊',
      }),
    );
  });

  it('rejects empty item results with failedItems only', async () => {
    const logger = createTestLogger();
    const service = new IngestionService(
      new StaticVisionAdapter({
        items: [],
        failedItems: [{ notes: '所有商品名称都无法确定' }],
      }),
      logger,
    );

    await expect(service.processScreenshot('https://example.com/item.jpg')).rejects.toThrow(
      '未从 OCR 文本中识别到可入库谷子',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'AI draft item marked failed',
      expect.objectContaining({
        notes: '所有商品名称都无法确定',
      }),
    );
  });

  it('rejects empty items results with a validation error', async () => {
    const service = new IngestionService(new StaticVisionAdapter({ items: [] }));

    await expect(service.processScreenshot('https://example.com/item.jpg')).rejects.toThrow(
      '未从 OCR 文本中识别到可入库谷子',
    );
  });

  it('rejects extracted data missing required common fields', async () => {
    const service = new IngestionService(
      new StaticVisionAdapter({
        ...validBadge,
        type: '',
      }),
      createTestLogger(),
    );

    await expect(service.processScreenshot('https://example.com/item.jpg')).rejects.toThrow();
  });

  it('rejects invalid image URLs before calling the adapter', async () => {
    const service = new IngestionService(new StaticVisionAdapter(validBadge));

    await expect(service.processScreenshot('not-a-url')).rejects.toThrow(
      'imageUrl must be an http(s) URL or image data URL',
    );
  });

  it('rejects non-image data URLs before calling the adapter', async () => {
    const service = new IngestionService(new StaticVisionAdapter(validBadge));

    await expect(service.processScreenshot('data:text/plain;base64,aGVsbG8=')).rejects.toThrow(
      'imageUrl must be an http(s) URL or image data URL',
    );
  });

  it('rejects non-base64 image data URLs before calling the adapter', async () => {
    const service = new IngestionService(new StaticVisionAdapter(validBadge));

    await expect(service.processScreenshot('data:image/png,hello')).rejects.toThrow(
      'imageUrl must be an http(s) URL or image data URL',
    );
  });

  it('rejects empty image inputs before calling the adapter', async () => {
    const service = new IngestionService(new StaticVisionAdapter(validBadge));

    await expect(service.processScreenshot('')).rejects.toThrow('imageUrl must be an http(s) URL or image data URL');
  });
});
