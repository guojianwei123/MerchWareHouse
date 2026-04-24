import { describe, expect, it } from 'vitest';
import { GuziRepository } from '../../src/repo/guzi.repo';
import { InventoryService } from '../../src/service/inventory.service';

const item = {
  id: 'badge-1',
  name: 'Badge One',
  type: 'badge',
  ip: 'Haikyu',
  character: 'Hinata',
  series: 'Birthday',
  imageUrl: 'https://example.com/badge.jpg',
  purchasePrice: 58,
  diameter: 58,
  shape: 'round',
} as const;

describe('InventoryService', () => {
  it('creates, lists, updates, filters, and deletes inventory items', async () => {
    const service = new InventoryService(new GuziRepository());

    await service.createItem(item);
    expect(await service.listItems()).toHaveLength(1);
    expect(await service.listItems({ ip: 'Haikyu' })).toHaveLength(1);
    expect(await service.listItems({ character: 'Kageyama' })).toHaveLength(0);

    const updated = await service.updateItem(item.id, {
      ...item,
      marketPrice: 80,
    });
    expect(updated.marketPrice).toBe(80);

    expect(await service.deleteItem(item.id)).toBe(true);
    expect(await service.listItems()).toHaveLength(0);
  });

  it('rejects invalid inventory data before saving', async () => {
    const service = new InventoryService(new GuziRepository());

    await expect(service.createItem({ ...item, diameter: -1 })).rejects.toThrow();
    expect(await service.listItems()).toHaveLength(0);
  });
});
