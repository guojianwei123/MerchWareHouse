import type { GuziItem } from '../../types/models/guzi.schema';

export interface VisionAdapter {
  extractGuziInfo(imageUrl: string): Promise<unknown>;
}

export class MockVisionAdapter implements VisionAdapter {
  async extractGuziInfo(imageUrl: string): Promise<GuziItem> {
    return {
      id: `guzi_${Date.now()}`,
      name: 'Mock Badge',
      type: 'badge',
      ip: 'Mock IP',
      character: 'Mock Character',
      series: 'Mock Series',
      imageUrl,
      purchasePrice: 50,
      diameter: 58,
      shape: 'round',
    };
  }
}
