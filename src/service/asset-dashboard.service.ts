import type { GuziItem } from '../types/models/guzi.schema';
import type { PriceRecord } from '../types/models/transaction.schema';

export type AssetDashboardGroupKey = 'ip' | 'character' | 'series' | 'type';

export interface AssetDashboardGroup {
  key: string;
  count: number;
  officialPriceTotal: number;
  purchasePriceTotal: number;
  marketPriceTotal: number;
  profit: number;
  purchaseShare: number;
  marketShare: number;
}

export interface AssetDashboardStats {
  itemCount: number;
  officialPriceTotal: number;
  purchasePriceTotal: number;
  marketPriceTotal: number;
  profit: number;
  groups: Record<AssetDashboardGroupKey, AssetDashboardGroup[]>;
  isEmpty: boolean;
}

interface ItemPrices {
  officialPrice: number;
  purchasePrice: number;
  marketPrice: number;
}

const groupKeys: AssetDashboardGroupKey[] = ['ip', 'character', 'series', 'type'];

export const calculateAssetDashboard = (
  items: GuziItem[],
  priceRecords: PriceRecord[] = [],
): AssetDashboardStats => {
  const latestRecordByGuziId = getLatestPriceRecords(priceRecords);
  const itemPrices = items.map((item) => getItemPrices(item, latestRecordByGuziId.get(item.id)));
  const officialPriceTotal = sum(itemPrices.map((price) => price.officialPrice));
  const purchasePriceTotal = sum(itemPrices.map((price) => price.purchasePrice));
  const marketPriceTotal = sum(itemPrices.map((price) => price.marketPrice));

  return {
    itemCount: items.length,
    officialPriceTotal,
    purchasePriceTotal,
    marketPriceTotal,
    profit: marketPriceTotal - purchasePriceTotal,
    groups: {
      ip: buildGroups(items, itemPrices, 'ip', purchasePriceTotal, marketPriceTotal),
      character: buildGroups(items, itemPrices, 'character', purchasePriceTotal, marketPriceTotal),
      series: buildGroups(items, itemPrices, 'series', purchasePriceTotal, marketPriceTotal),
      type: buildGroups(items, itemPrices, 'type', purchasePriceTotal, marketPriceTotal),
    },
    isEmpty: items.length === 0,
  };
};

const getLatestPriceRecords = (priceRecords: PriceRecord[]): Map<string, PriceRecord> => {
  const latest = new Map<string, PriceRecord>();

  for (const record of priceRecords) {
    const existing = latest.get(record.guziId);

    if (!existing || Date.parse(record.date) > Date.parse(existing.date)) {
      latest.set(record.guziId, record);
    }
  }

  return latest;
};

const getItemPrices = (item: GuziItem, record?: PriceRecord): ItemPrices => ({
  officialPrice: record?.officialPrice ?? item.officialPrice ?? 0,
  purchasePrice: record?.purchasePrice ?? item.purchasePrice ?? 0,
  marketPrice: record?.marketPrice ?? item.marketPrice ?? 0,
});

const buildGroups = (
  items: GuziItem[],
  itemPrices: ItemPrices[],
  key: AssetDashboardGroupKey,
  purchasePriceTotal: number,
  marketPriceTotal: number,
): AssetDashboardGroup[] => {
  const groups = new Map<string, AssetDashboardGroup>();

  items.forEach((item, index) => {
    const groupKey = item[key];
    const prices = itemPrices[index];
    const group = groups.get(groupKey) ?? {
      key: groupKey,
      count: 0,
      officialPriceTotal: 0,
      purchasePriceTotal: 0,
      marketPriceTotal: 0,
      profit: 0,
      purchaseShare: 0,
      marketShare: 0,
    };

    group.count += 1;
    group.officialPriceTotal += prices.officialPrice;
    group.purchasePriceTotal += prices.purchasePrice;
    group.marketPriceTotal += prices.marketPrice;
    group.profit = group.marketPriceTotal - group.purchasePriceTotal;

    groups.set(groupKey, group);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      purchaseShare: purchasePriceTotal > 0 ? group.purchasePriceTotal / purchasePriceTotal : 0,
      marketShare: marketPriceTotal > 0 ? group.marketPriceTotal / marketPriceTotal : 0,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
};

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

export const assetDashboardGroupKeys = groupKeys;
