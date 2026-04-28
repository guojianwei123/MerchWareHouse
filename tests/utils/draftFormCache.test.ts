import { describe, expect, it } from 'vitest';
import { removeDraftFormCacheEntry, updateDraftFormCache } from '../../src/utils/draftFormCache';

describe('draft form cache helpers', () => {
  it('stores edited form values by draft id', () => {
    const cache = updateDraftFormCache({}, 'draft-1', { name: '改过的名称' });

    expect(cache).toEqual({ 'draft-1': { name: '改过的名称' } });
  });

  it('removes confirmed draft values without touching other drafts', () => {
    const cache = {
      'draft-1': { name: '第一件' },
      'draft-2': { name: '第二件' },
    };

    expect(removeDraftFormCacheEntry(cache, 'draft-1')).toEqual({
      'draft-2': { name: '第二件' },
    });
  });
});
