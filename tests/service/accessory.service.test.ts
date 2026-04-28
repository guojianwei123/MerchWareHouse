import { describe, expect, it } from 'vitest';
import { AccessoryService } from '../../src/service/accessory.service';

const service = new AccessoryService();

const base = {
  id: 'item-1',
  name: 'Test Item',
  ip: 'Test IP',
  character: 'Test Character',
  series: 'Test Series',
  imageUrl: 'https://example.com/item.jpg',
};

describe('AccessoryService', () => {
  it('recommends a 65x90 sleeve for a 63x88 paper card', () => {
    const recommendations = service.recommendForItem({
      ...base,
      type: 'paper_card',
      width: 63,
      length: 88,
    });

    expect(recommendations[0]).toMatchObject({
      accessoryType: 'sleeve',
      recommendedSize: { unit: 'mm', width: 65, length: 90 },
    });
  });

  it('recommends a protector for a 58mm badge', () => {
    const recommendations = service.recommendForItem({
      ...base,
      type: 'badge',
      diameter: 58,
      shape: 'round',
    });

    expect(recommendations[0]).toMatchObject({
      accessoryType: 'protector',
      recommendedSize: { unit: 'mm', diameter: 58 },
    });
  });

  it('recommends a display case for acrylic items', () => {
    const recommendations = service.recommendForItem({
      ...base,
      type: 'acrylic',
      height: 120,
      width: 80,
      hasBase: true,
    });

    expect(recommendations[0]).toMatchObject({
      accessoryType: 'display_case',
      recommendedSize: { unit: 'mm', width: 100, height: 140 },
    });
  });

  it('returns no recommendations when required dimensions are missing', () => {
    expect(service.recommendForItem({ ...base, type: 'paper_card' })).toEqual([]);
    expect(service.recommendForItem({ ...base, type: 'badge' })).toEqual([]);
    expect(service.recommendForItem({ ...base, type: 'acrylic' })).toEqual([]);
  });
});
