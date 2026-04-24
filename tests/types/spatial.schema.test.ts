import { describe, expect, it } from 'vitest';
import { SpatialNodeSchema } from '../../src/types/models/spatial.schema';

describe('SpatialNodeSchema', () => {
  it('parses a tree of spatial nodes', () => {
    const node = SpatialNodeSchema.parse({
      id: 'room-1',
      nodeType: 'room',
      x: 0,
      y: 0,
      width: 1000,
      height: 800,
      children: [
        {
          id: 'cabinet-1',
          nodeType: 'cabinet',
          parentId: 'room-1',
          x: 10,
          y: 10,
          z: 0,
          width: 300,
          height: 400,
          depth: 200,
        },
      ],
    });

    expect(node.children?.[0]?.parentId).toBe('room-1');
  });
});
