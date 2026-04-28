import { describe, expect, it } from 'vitest';
import { getHorizontalSwipeDirection, shouldTriggerEdgeBack } from '../../src/utils/edgeSwipe';

describe('edge swipe gestures', () => {
  it('triggers back from a right swipe starting at the left edge', () => {
    expect(shouldTriggerEdgeBack({ clientX: 12, clientY: 120 }, { clientX: 104, clientY: 132 })).toBe(true);
  });

  it('does not trigger back outside the left edge', () => {
    expect(shouldTriggerEdgeBack({ clientX: 36, clientY: 120 }, { clientX: 130, clientY: 126 })).toBe(false);
  });

  it('does not trigger back on mostly vertical movement', () => {
    expect(shouldTriggerEdgeBack({ clientX: 12, clientY: 120 }, { clientX: 112, clientY: 190 })).toBe(false);
  });

  it('detects non-edge horizontal draft switching directions', () => {
    expect(getHorizontalSwipeDirection({ clientX: 160, clientY: 120 }, { clientX: 244, clientY: 128 })).toBe(
      'previous',
    );
    expect(getHorizontalSwipeDirection({ clientX: 244, clientY: 120 }, { clientX: 160, clientY: 128 })).toBe('next');
  });
});
