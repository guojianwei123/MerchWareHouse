import { SpatialService } from '../service/spatial.service';
import { useRoomStore, type SpatialNode } from '../store/roomStore';

const spatialService = new SpatialService();

export const useCollision = () => {
  const nodes = useRoomStore((state) => state.nodes);

  const checkCollision = (currentNode: SpatialNode) => {
    return spatialService.checkCollision(nodes, currentNode);
  };

  const validatePlacement = (container: SpatialNode, currentNode: SpatialNode) => {
    return spatialService.validatePlacement(container, nodes, currentNode);
  };

  return { checkCollision, validatePlacement };
};
