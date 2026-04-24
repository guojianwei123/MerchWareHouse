import { useState } from 'react';

export const useDrag = (initialX: number, initialY: number) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });

  const onTouchStart = (e: any) => {
    // Logic for touch start
  };

  const onTouchMove = (e: any) => {
    // Logic for touch move
  };

  const onTouchEnd = (e: any) => {
    // Logic for touch end
  };

  return { position, onTouchStart, onTouchMove, onTouchEnd };
};
