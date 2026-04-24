import type React from 'react';
import { useEffect, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

export const useDrag = (
  initialX: number,
  initialY: number,
  onCommit?: (position: Point) => void,
) => {
  const [position, setPosition] = useState<Point>({ x: initialX, y: initialY });
  const [start, setStart] = useState<Point | null>(null);
  const [origin, setOrigin] = useState<Point>({ x: initialX, y: initialY });

  useEffect(() => {
    setPosition({ x: initialX, y: initialY });
    setOrigin({ x: initialX, y: initialY });
  }, [initialX, initialY]);

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    setStart({ x: touch.clientX, y: touch.clientY });
    setOrigin(position);
  };

  const onTouchMove = (event: React.TouchEvent) => {
    const touch = event.touches[0];

    if (!touch || !start) {
      return;
    }

    setPosition({
      x: origin.x + touch.clientX - start.x,
      y: origin.y + touch.clientY - start.y,
    });
  };

  const onTouchEnd = () => {
    setStart(null);
    onCommit?.(position);
  };

  return {
    position,
    isDragging: start !== null,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};
