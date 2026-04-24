import { create } from 'zustand';

interface InventoryState {
  draftItem: any | null;
  items: any[];
  setDraftItem: (item: any) => void;
  clearDraftItem: () => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  draftItem: null,
  items: [],
  setDraftItem: (item) => set({ draftItem: item }),
  clearDraftItem: () => set({ draftItem: null }),
}));
