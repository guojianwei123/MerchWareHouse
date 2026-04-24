import { describe, expect, it } from 'vitest';
import { ShowcaseSchema, SpatialNodeSchema } from '../../src/types/models/spatial.schema';

describe('showcase schemas', () => {
  it('requires item nodes to reference guziId', () => {
    expect(() =>
      SpatialNodeSchema.parse({
        id: 'item-1',
        nodeType: 'item',
        parentId: 'cabinet-1',
        x: 0,
        y: 0,
        width: 80,
        height: 80,
      }),
    ).toThrow();
  });

  it('parses a showcase with item references', () => {
    const showcase = ShowcaseSchema.parse({
      id: 'showcase-1',
      title: 'Public Shelf',
      ownerId: 'user-1',
      isPublic: true,
      nodes: [
        {
          id: 'room-1',
          nodeType: 'room',
          x: 0,
          y: 0,
          width: 300,
          height: 200,
        },
        {
          id: 'item-1',
          nodeType: 'item',
          parentId: 'room-1',
          guziId: 'guzi-1',
          x: 10,
          y: 10,
          width: 80,
          height: 80,
        },
      ],
    });

    expect(showcase.nodes[1]?.guziId).toBe('guzi-1');
  });
});
