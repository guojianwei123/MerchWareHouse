import { describe, expect, it } from 'vitest';
import type { GuziItem } from '../../src/types/models/guzi.schema';
import { confirmDraftInQueue } from '../../src/utils/draftQueue';

const createItem = (id: string, name = id): GuziItem => ({
  id,
  type: 'badge',
  name,
  ip: '原神',
  character: '芙宁娜',
  series: '主题印象',
  imageUrl: 'https://example.com/item.jpg',
  diameter: 58,
  shape: 'round',
});

describe('draft queue helpers', () => {
  it('confirms the submitted item and moves to the next draft', () => {
    const draft1 = createItem('draft-1');
    const draft2 = createItem('draft-2');
    const submitted = createItem('draft-1', '提交后的名称');

    const result = confirmDraftInQueue([draft1, draft2], draft1, submitted, []);

    expect(result.draftQueue).toEqual([draft2]);
    expect(result.draftItem).toEqual(draft2);
    expect(result.items).toEqual([submitted]);
  });
});
