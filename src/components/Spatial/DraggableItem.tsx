import React from 'react';
import { useDrag } from '../../hooks/useDrag';

interface DraggableItemProps {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  invalid?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  x,
  y,
  width = 80,
  height = 60,
  invalid = false,
  onMove,
}) => {
  const { position, isDragging, onTouchStart, onTouchMove, onTouchEnd } = useDrag(x, y, (next) => {
    onMove?.(id, next.x, next.y);
  });

  return (
    <div
      className={`draggable-item ${invalid ? 'invalid' : ''}`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width,
        height,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <span>{id.includes('badge') ? '吧唧' : id.includes('card') ? '纸片' : id.includes('acrylic') ? '立牌' : '谷子'}</span>
      {isDragging ? <small>移动中</small> : null}
    </div>
  );
};
