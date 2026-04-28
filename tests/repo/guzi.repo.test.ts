import { describe, expect, it } from 'vitest';
import { toDetails } from '../../src/repo/guzi.repo';
import type { GuziItem } from '../../src/types/models/guzi.schema';

const base = {
  id: 'item-1',
  name: 'Test Item',
  ip: 'Test IP',
  character: 'Test Character',
  series: 'Test Series',
  imageUrl: 'https://example.com/item.jpg',
};

describe('Guzi repository details mapping', () => {
  it('persists details for custom categories without fixed type keys', () => {
    const item: GuziItem = {
      ...base,
      type: '票根',
      width: 70,
      height: 120,
      material: '纸',
      notes: 'OCR 原始品类',
    };

    expect(toDetails(item)).toEqual({
      width: 70,
      height: 120,
      material: '纸',
      notes: 'OCR 原始品类',
    });
  });
});
