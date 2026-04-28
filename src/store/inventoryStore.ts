import { create } from 'zustand';
import type { GuziFilter, GuziItem } from '../types/models/guzi.schema';
import { confirmDraftInQueue } from '../utils/draftQueue';

interface InventoryState {
  draftItem: GuziItem | null;
  draftQueue: GuziItem[];
  items: GuziItem[];
  setDraftItem: (item: GuziItem) => void;
  setDraftQueue: (items: GuziItem[]) => void;
  clearDraftItem: () => void;
  confirmDraft: (item: GuziItem) => void;
  addItem: (item: GuziItem) => void;
  setItems: (items: GuziItem[]) => void;
  updateItem: (item: GuziItem) => void;
  removeItem: (id: string) => void;
  filterItems: (filter: GuziFilter) => GuziItem[];
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  draftItem: null,
  draftQueue: [],
  items: [],
  setDraftItem: (item) => set({ draftItem: item }),
  setDraftQueue: (draftQueue) => set({ draftQueue, draftItem: draftQueue[0] ?? null }),
  clearDraftItem: () => set({ draftItem: null, draftQueue: [] }),
  confirmDraft: (item) => {
    const { draftItem, draftQueue, items } = get();

    if (!draftItem) {
      return;
    }

    set(confirmDraftInQueue(draftQueue, draftItem, item, items));
  },
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  setItems: (items) => set({ items }),
  updateItem: (item) =>
    set((state) => ({
      items: state.items.map((existing) => (existing.id === item.id ? item : existing)),
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  filterItems: (filter) => {
    return get().items.filter((item) => {
      return (
        (!filter.ip || item.ip === filter.ip) &&
        (!filter.character || item.character === filter.character) &&
        (!filter.series || item.series === filter.series) &&
        (!filter.type || item.type === filter.type)
      );
    });
  },
}));
