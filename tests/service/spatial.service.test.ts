import { describe, expect, it } from 'vitest';
import { SpatialService } from '../../src/service/spatial.service';
import type { SpatialNode } from '../../src/types/models/spatial.schema';

const service = new SpatialService();

const container: SpatialNode = {
  id: 'cabinet-1',
  nodeType: 'cabinet',
  parentId: 'room-1',
  x: 0,
  y: 0,
  width: 200,
  height: 200,
};

const item = (id: string, x: number, y: number, parentId = 'cabinet-1'): SpatialNode => ({
  id,
  nodeType: 'item',
  parentId,
  guziId: `guzi-${id}`,
  x,
  y,
  width: 50,
  height: 50,
});

describe('SpatialService', () => {
  it('detects overlapping siblings', () => {
    expect(service.checkCollision([item('a', 0, 0)], item('b', 25, 25))).toBe(true);
  });

  it('does not treat touching edges as collision', () => {
    expect(service.checkCollision([item('a', 0, 0)], item('b', 50, 0))).toBe(false);
  });

  it('ignores nodes with different parents', () => {
    expect(service.checkCollision([item('a', 0, 0, 'left')], item('b', 25, 25, 'right'))).toBe(false);
  });

  it('rejects children outside the container bounds', () => {
    expect(service.validateContainerBounds(container, item('a', 175, 0))).toBe(false);
  });

  it('reports placement reasons for collision and bounds failures', () => {
    const result = service.validatePlacement(container, [item('a', 130, 0)], item('b', 160, 0));

    expect(result.valid).toBe(false);
    expect(result.reasons).toEqual(['OUT_OF_BOUNDS', 'COLLISION']);
  });
});
