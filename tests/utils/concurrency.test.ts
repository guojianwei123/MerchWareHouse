import { describe, expect, it } from 'vitest';
import { mapWithConcurrencySettled } from '../../src/utils/concurrency';

describe('mapWithConcurrencySettled', () => {
  it('limits concurrency and preserves input indexes', async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapWithConcurrencySettled([1, 2, 3, 4, 5], 3, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;

      if (value === 3) {
        throw new Error('bad item');
      }

      return value * 2;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
    expect(results.map((result) => result.index)).toEqual([0, 1, 2, 3, 4]);
    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'fulfilled',
      'rejected',
      'fulfilled',
      'fulfilled',
    ]);
    expect(results[0]).toMatchObject({ status: 'fulfilled', value: 2 });
    expect(results[2]).toMatchObject({ status: 'rejected' });
  });
});
