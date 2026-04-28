import React, { useState } from 'react';
import { shouldTriggerEdgeBack, type SwipePoint } from '../utils/edgeSwipe';

interface SecondaryPageProps {
  title: string;
  eyebrow?: string;
  onBack: () => void;
  children: React.ReactNode;
  className?: string;
}

export const SecondaryPage: React.FC<SecondaryPageProps> = ({
  title,
  eyebrow,
  onBack,
  children,
  className,
}) => {
  const [touchStart, setTouchStart] = useState<SwipePoint | null>(null);

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];

    if (!touch || touch.clientX > 24) {
      setTouchStart(null);
      return;
    }

    setTouchStart({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const touch = event.changedTouches[0];

    if (!touchStart || !touch) {
      return;
    }

    if (shouldTriggerEdgeBack(touchStart, { clientX: touch.clientX, clientY: touch.clientY })) {
      onBack();
    }

    setTouchStart(null);
  };

  return (
    <div
      className={`page-stack secondary-page ${className ?? ''}`.trim()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="secondary-page-header">
        <button type="button" className="link-button back-button" onClick={onBack}>
          返回
        </button>
        <div>
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h1>{title}</h1>
        </div>
      </header>
      {children}
    </div>
  );
};
