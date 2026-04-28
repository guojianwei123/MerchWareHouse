import type { GuziItem } from '../types/models/guzi.schema';

export const confirmDraftInQueue = (
  draftQueue: GuziItem[],
  currentDraft: GuziItem | null,
  confirmedItem: GuziItem,
  items: GuziItem[],
): { draftQueue: GuziItem[]; draftItem: GuziItem | null; items: GuziItem[] } => {
  const currentId = currentDraft?.id ?? confirmedItem.id;
  const currentIndex = Math.max(draftQueue.findIndex((item) => item.id === currentId), 0);
  const nextQueue = draftQueue.filter((item) => item.id !== currentId);
  const nextIndex = Math.min(currentIndex, Math.max(nextQueue.length - 1, 0));

  return {
    draftQueue: nextQueue,
    draftItem: nextQueue[nextIndex] ?? null,
    items: [...items.filter((item) => item.id !== confirmedItem.id), confirmedItem],
  };
};
