import type { SpatialNode } from '../types/models/spatial.schema';

export interface PlacementValidation {
  valid: boolean;
  reasons: string[];
}

export class SpatialService {
  checkCollision(existingNodes: SpatialNode[], currentNode: SpatialNode): boolean {
    return existingNodes.some((node) => {
      if (node.id === currentNode.id || node.parentId !== currentNode.parentId) {
        return false;
      }

      return this.overlaps2D(node, currentNode) && this.overlapsDepth(node, currentNode);
    });
  }

  validateContainerBounds(container: SpatialNode, child: SpatialNode): boolean {
    const childZ = child.z ?? 0;

    if (child.x < 0 || child.y < 0 || childZ < 0) {
      return false;
    }

    if (child.x + child.width > container.width || child.y + child.height > container.height) {
      return false;
    }

    if (container.depth !== undefined && child.depth !== undefined) {
      return childZ + child.depth <= container.depth;
    }

    return true;
  }

  validatePlacement(
    container: SpatialNode,
    existingSiblings: SpatialNode[],
    child: SpatialNode,
  ): PlacementValidation {
    const reasons: string[] = [];

    if (!this.validateContainerBounds(container, child)) {
      reasons.push('OUT_OF_BOUNDS');
    }

    if (this.checkCollision(existingSiblings, child)) {
      reasons.push('COLLISION');
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }

  private overlaps2D(a: SpatialNode, b: SpatialNode): boolean {
    return this.overlaps1D(a.x, a.x + a.width, b.x, b.x + b.width)
      && this.overlaps1D(a.y, a.y + a.height, b.y, b.y + b.height);
  }

  private overlapsDepth(a: SpatialNode, b: SpatialNode): boolean {
    if (a.z === undefined || b.z === undefined || a.depth === undefined || b.depth === undefined) {
      return true;
    }

    return this.overlaps1D(a.z, a.z + a.depth, b.z, b.z + b.depth);
  }

  private overlaps1D(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
    return aStart < bEnd && bStart < aEnd;
  }
}
