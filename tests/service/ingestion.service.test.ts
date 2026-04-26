import { describe, expect, it } from 'vitest';
import { IngestionService } from '../../src/service/ingestion.service';
import type { VisionAdapter } from '../../src/adapters/llm/vision.adapter';

class StaticVisionAdapter implements VisionAdapter {
  constructor(private readonly output: unknown) {}

  async extractGuziInfo(): Promise<unknown> {
    return this.output;
  }
}

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

    const draft = await service.processScreenshot('https://example.com/order.jpg');

    expect(draft.id).toMatch(/^guzi_/);
    expect(draft.imageUrl).toBe('https://example.com/order.jpg');
    expect(draft.type).toBe('badge');
  });

  it('creates a draft from a valid JSON string', async () => {
    const service = new IngestionService(new StaticVisionAdapter(JSON.stringify(validBadge)));

    const draft = await service.processScreenshot('https://example.com/item.jpg');

    expect(draft.name).toBe('Birthday Badge');
  });

  it('creates a draft from a valid image data URL', async () => {
    const service = new IngestionService(new StaticVisionAdapter(validBadge));

    const draft = await service.processScreenshot(validImageDataUrl);

    expect(draft.imageUrl).toBe(validImageDataUrl);
    expect(draft.type).toBe('badge');
  });

  it('rejects extracted data missing required category fields', async () => {
    const service = new IngestionService(
      new StaticVisionAdapter({
        ...validBadge,
        diameter: undefined,
      }),
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
