import type { GuziItem } from '../types/models/guzi.schema';

export type AccessoryType = 'sleeve' | 'protector' | 'display_case';

export interface AccessoryRecommendation {
  accessoryType: AccessoryType;
  recommendedSize: {
    unit: 'mm';
    width?: number;
    height?: number;
    length?: number;
    diameter?: number;
  };
  reason: string;
}

export class AccessoryService {
  recommendForItem(item: GuziItem): AccessoryRecommendation[] {
    if (item.type === 'paper_card') {
      return [
        {
          accessoryType: 'sleeve',
          recommendedSize: {
            unit: 'mm',
            width: item.width + 2,
            length: item.length + 2,
          },
          reason: `纸制类 ${item.width}x${item.length}mm 推荐略大尺寸自封袋。`,
        },
      ];
    }

    if (item.type === 'badge') {
      return [
        {
          accessoryType: 'protector',
          recommendedSize: {
            unit: 'mm',
            diameter: item.diameter <= 58 ? 58 : Math.ceil(item.diameter),
          },
          reason: `徽章直径 ${item.diameter}mm 推荐同规格或略大保护套。`,
        },
      ];
    }

    if (item.type === 'acrylic') {
      return [
        {
          accessoryType: 'display_case',
          recommendedSize: {
            unit: 'mm',
            width: item.width ? item.width + 20 : undefined,
            height: item.height + 20,
          },
          reason: `亚克力高度 ${item.height}mm 推荐预留 20mm 空间的防尘展示盒。`,
        },
      ];
    }

    return [];
  }
}
