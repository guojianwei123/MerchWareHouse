import { describe, expect, it } from 'vitest';
import {
  inferImageTypeFromName,
  isSupportedImageDataUrl,
  isSupportedLocalImageType,
} from '../../src/types/models/local-image.schema';

describe('local image schema', () => {
  it('accepts JPEG and PNG image inputs', () => {
    expect(isSupportedLocalImageType('image/jpeg')).toBe(true);
    expect(isSupportedLocalImageType('image/png')).toBe(true);
    expect(isSupportedImageDataUrl('data:image/jpeg;base64,aGVsbG8=')).toBe(true);
    expect(isSupportedImageDataUrl('data:image/png;base64,aGVsbG8=')).toBe(true);
    expect(inferImageTypeFromName('item.jpeg')).toBe('image/jpeg');
    expect(inferImageTypeFromName('item.png')).toBe('image/png');
  });

  it('rejects WebP image inputs for OCR ingestion', () => {
    expect(isSupportedLocalImageType('image/webp')).toBe(false);
    expect(isSupportedImageDataUrl('data:image/webp;base64,aGVsbG8=')).toBe(false);
    expect(inferImageTypeFromName('item.webp')).toBeNull();
  });
});
