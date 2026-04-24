import { useRoomStore, SpatialNode } from '../store/roomStore';

export const useCollision = () => {
  const nodes = useRoomStore((state) => state.nodes);

  const checkCollision = (currentNode: SpatialNode) => {
    // AABB collision logic placeholder
    return false;
  };

  return { checkCollision };
};
