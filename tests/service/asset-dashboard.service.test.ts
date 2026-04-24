import { describe, expect, it } from 'vitest';
import { calculateAssetDashboard } from '../../src/service/asset-dashboard.service';
import type { GuziItem } from '../../src/types/models/guzi.schema';
import type { PriceRecord } from '../../src/types/models/transaction.schema';

const badge = (
  id: string,
  ip: string,
  character: string,
  series: string,
  prices: Partial<Pick<GuziItem, 'officialPrice' | 'purchasePrice' | 'marketPrice'>> = {},
): GuziItem => ({
  id,
  name: id,
  type: 'badge',
  ip,
  character,
  series,
  imageUrl: `https://example.com/${id}.jpg`,
  diameter: 58,
  shape: 'round',
  ...prices,
});

describe('calculateAssetDashboard', () => {
  it('calculates totals and grouped shares', () => {
    const stats = calculateAssetDashboard([
      badge('a', 'IP A', 'A', 'S1', { officialPrice: 30, purchasePrice: 40, marketPrice: 50 }),
      badge('b', 'IP A', 'B', 'S1', { officialPrice: 20, purchasePrice: 20, marketPrice: 25 }),
      badge('c', 'IP B', 'C', 'S2', { officialPrice: 10, purchasePrice: 15, marketPrice: 12 }),
    ]);

    expect(stats.itemCount).toBe(3);
    expect(stats.officialPriceTotal).toBe(60);
    expect(stats.purchasePriceTotal).toBe(75);
    expect(stats.marketPriceTotal).toBe(87);
    expect(stats.profit).toBe(12);
    expect(stats.groups.ip.find((group) => group.key === 'IP A')).toMatchObject({
      count: 2,
      purchasePriceTotal: 60,
      marketPriceTotal: 75,
      purchaseShare: 0.8,
    });
  });

  it('uses the latest price record before falling back to item prices', () => {
    const records: PriceRecord[] = [
      {
        id: 'old',
        guziId: 'a',
        date: '2026-01-01T00:00:00.000Z',
        purchasePrice: 10,
        marketPrice: 20,
      },
      {
        id: 'new',
        guziId: 'a',
        date: '2026-02-01T00:00:00.000Z',
        marketPrice: 80,
      },
    ];

    const stats = calculateAssetDashboard(
      [badge('a', 'IP A', 'A', 'S1', { officialPrice: 30, purchasePrice: 40, marketPrice: 50 })],
      records,
    );

    expect(stats.officialPriceTotal).toBe(30);
    expect(stats.purchasePriceTotal).toBe(40);
    expect(stats.marketPriceTotal).toBe(80);
  });

  it('handles empty inventory and missing prices without NaN', () => {
    const empty = calculateAssetDashboard([]);
    const missing = calculateAssetDashboard([badge('a', 'IP A', 'A', 'S1')]);

    expect(empty).toMatchObject({
      itemCount: 0,
      officialPriceTotal: 0,
      purchasePriceTotal: 0,
      marketPriceTotal: 0,
      profit: 0,
      isEmpty: true,
    });
    expect(Number.isNaN(missing.profit)).toBe(false);
    expect(missing.purchasePriceTotal).toBe(0);
  });
});
