import { create } from 'zustand';
import type { GuziFilter, GuziItem } from '../types/models/guzi.schema';

interface InventoryState {
  draftItem: GuziItem | null;
  items: GuziItem[];
  setDraftItem: (item: GuziItem) => void;
  clearDraftItem: () => void;
  confirmDraft: () => void;
  addItem: (item: GuziItem) => void;
  updateItem: (item: GuziItem) => void;
  removeItem: (id: string) => void;
  filterItems: (filter: GuziFilter) => GuziItem[];
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  draftItem: null,
  items: [],
  setDraftItem: (item) => set({ draftItem: item }),
  clearDraftItem: () => set({ draftItem: null }),
  confirmDraft: () => {
    const { draftItem, items } = get();

    if (!draftItem) {
      return;
    }

    set({
      draftItem: null,
      items: [...items.filter((item) => item.id !== draftItem.id), draftItem],
    });
  },
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
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
