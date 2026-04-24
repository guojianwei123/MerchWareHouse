import { create } from 'zustand';
import {
  calculateAssetDashboard,
  type AssetDashboardStats,
} from '../service/asset-dashboard.service';
import type { GuziItem } from '../types/models/guzi.schema';
import type { PriceRecord } from '../types/models/transaction.schema';

interface AssetDashboardState {
  items: GuziItem[];
  priceRecords: PriceRecord[];
  setItems: (items: GuziItem[]) => void;
  setPriceRecords: (records: PriceRecord[]) => void;
  getStats: () => AssetDashboardStats;
}

export const useAssetDashboardStore = create<AssetDashboardState>((set, get) => ({
  items: [],
  priceRecords: [],
  setItems: (items) => set({ items }),
  setPriceRecords: (priceRecords) => set({ priceRecords }),
  getStats: () => {
    const { items, priceRecords } = get();
    return calculateAssetDashboard(items, priceRecords);
  },
}));
