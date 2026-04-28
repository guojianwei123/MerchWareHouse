import { describe, expect, it } from 'vitest';
import { GuziUnionSchema } from '../../src/types/models/guzi.schema';

const base = {
  id: 'item-1',
  name: 'Test Guzi',
  ip: 'Test IP',
  character: 'Test Character',
  series: 'Test Series',
  imageUrl: 'https://example.com/item.jpg',
  officialPrice: 30,
  purchasePrice: 35,
  marketPrice: 40,
};

describe('GuziUnionSchema', () => {
  it('parses all seven guzi categories', () => {
    const samples = [
      { ...base, type: 'paper_card', length: 88, width: 63 },
      { ...base, type: 'acrylic', height: 120, hasBase: true, width: 80 },
      { ...base, type: 'badge', diameter: 58, shape: 'round' },
      { ...base, type: 'fabric', length: 400, width: 300, material: 'cotton' },
      { ...base, type: 'figure', scale: '1/7', height: 240, manufacturer: 'Good Smile' },
      { ...base, type: 'practical', compatibleModel: 'iPhone 15' },
      { ...base, type: 'special', specialType: 'blind_box', description: 'Limited blind box' },
    ];

    for (const sample of samples) {
      expect(() => GuziUnionSchema.parse(sample)).not.toThrow();
    }
  });

  it('accepts custom non-empty categories without physical fields', () => {
    expect(GuziUnionSchema.parse({ ...base, type: '票根' })).toMatchObject({
      type: '票根',
    });
  });

  it('rejects empty categories', () => {
    expect(() => GuziUnionSchema.parse({ ...base, type: '' })).toThrow();
  });

  it('rejects non-positive dimensions when provided', () => {
    expect(() => GuziUnionSchema.parse({ ...base, type: '纸片', width: 0 })).toThrow();
    expect(() => GuziUnionSchema.parse({ ...base, type: '吧唧', diameter: -1 })).toThrow();
  });
});
