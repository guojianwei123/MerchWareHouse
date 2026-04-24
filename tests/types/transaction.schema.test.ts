import { describe, expect, it } from 'vitest';
import { PriceRecordSchema } from '../../src/types/models/transaction.schema';

describe('PriceRecordSchema', () => {
  it('parses official, purchase, and market prices', () => {
    const record = PriceRecordSchema.parse({
      id: 'price-1',
      guziId: 'item-1',
      date: '2026-04-24T00:00:00.000Z',
      officialPrice: 30,
      purchasePrice: 35,
      marketPrice: 40,
    });

    expect(record.marketPrice).toBe(40);
  });

  it('rejects negative prices', () => {
    expect(() =>
      PriceRecordSchema.parse({
        id: 'price-1',
        guziId: 'item-1',
        date: '2026-04-24T00:00:00.000Z',
        purchasePrice: -1,
      }),
    ).toThrow();
  });
});
