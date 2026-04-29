import { describe, expect, it } from 'vitest';
import { CategoryCreateInputSchema, CategorySchema } from '../../src/types/models/category.schema';

describe('Category schema', () => {
  it('parses custom category records', () => {
    expect(CategorySchema.parse({
      id: 'category-1',
      ownerId: 'user-1',
      name: '票根',
      tone: 'blue',
    })).toEqual({
      id: 'category-1',
      ownerId: 'user-1',
      name: '票根',
      tone: 'blue',
    });
  });

  it('trims names and rejects empty names', () => {
    expect(CategoryCreateInputSchema.parse({ ownerId: 'user-1', name: '  票根  ', tone: 'pink' }).name).toBe('票根');
    expect(() => CategoryCreateInputSchema.parse({ ownerId: 'user-1', name: '   ', tone: 'pink' })).toThrow();
  });
});
