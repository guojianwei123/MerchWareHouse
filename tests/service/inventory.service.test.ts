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
    const ownerId = 'user-1';

    await service.createItem(ownerId, item);
    expect(await service.listItems(ownerId)).toHaveLength(1);
    expect(await service.listItems(ownerId, { ip: 'Haikyu' })).toHaveLength(1);
    expect(await service.listItems(ownerId, { character: 'Kageyama' })).toHaveLength(0);
    expect(await service.listItems('user-2')).toHaveLength(0);

    const updated = await service.updateItem(ownerId, item.id, {
      ...item,
      marketPrice: 80,
    });
    expect(updated.marketPrice).toBe(80);

    expect(await service.deleteItem('user-2', item.id)).toBe(false);
    expect(await service.deleteItem(ownerId, item.id)).toBe(true);
    expect(await service.listItems(ownerId)).toHaveLength(0);
  });

  it('rejects invalid inventory data before saving', async () => {
    const service = new InventoryService(new GuziRepository());

    await expect(service.createItem('user-1', { ...item, diameter: -1 })).rejects.toThrow();
    expect(await service.listItems('user-1')).toHaveLength(0);
  });

  it('blocks another owner from reusing an existing item id', async () => {
    const service = new InventoryService(new GuziRepository());

    await service.createItem('user-1', item);

    await expect(service.createItem('user-2', {
      ...item,
      name: 'Badge Two',
    })).rejects.toThrow('Guzi item already exists for another owner');
    expect(await service.listItems('user-1')).toHaveLength(1);
    expect(await service.listItems('user-2')).toHaveLength(0);
  });
});
