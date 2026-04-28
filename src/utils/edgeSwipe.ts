export interface SwipePoint {
  clientX: number;
  clientY: number;
}

export type HorizontalSwipeDirection = 'previous' | 'next';

const edgeBackStartX = 24;
const backSwipeDistance = 80;
const horizontalSwipeDistance = 70;
const maxVerticalDrift = 50;

export const shouldTriggerEdgeBack = (start: SwipePoint, end: SwipePoint): boolean => {
  const deltaX = end.clientX - start.clientX;
  const deltaY = end.clientY - start.clientY;

  return start.clientX <= edgeBackStartX && deltaX >= backSwipeDistance && Math.abs(deltaY) <= maxVerticalDrift;
};

export const getHorizontalSwipeDirection = (
  start: SwipePoint,
  end: SwipePoint,
): HorizontalSwipeDirection | null => {
  const deltaX = end.clientX - start.clientX;
  const deltaY = end.clientY - start.clientY;

  if (Math.abs(deltaX) < horizontalSwipeDistance || Math.abs(deltaY) > maxVerticalDrift) {
    return null;
  }

  return deltaX > 0 ? 'previous' : 'next';
};
