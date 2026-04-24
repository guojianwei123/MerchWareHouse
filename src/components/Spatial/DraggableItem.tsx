import React from 'react';
import { useDrag } from '../../hooks/useDrag';

export const DraggableItem: React.FC<{ id: string; x: number; y: number }> = ({ id, x, y }) => {
  const { position, onTouchStart, onTouchMove, onTouchEnd } = useDrag(x, y);

  return (
    <div
      style={{ position: 'absolute', left: position.x, top: position.y }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      Item {id}
    </div>
  );
};
