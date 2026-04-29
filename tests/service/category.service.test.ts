import { describe, expect, it } from 'vitest';
import { CategoryRepository } from '../../src/repo/category.repo';
import { GuziRepository } from '../../src/repo/guzi.repo';
import { CategoryService } from '../../src/service/category.service';

const customItem = {
  id: 'ticket-1',
  name: 'Live Ticket',
  type: '票根',
  ip: 'Test IP',
  character: 'Test Character',
  series: 'Test Series',
  imageUrl: 'https://example.com/ticket.jpg',
} as const;

const createService = () => {
  const categoryRepository = new CategoryRepository();
  const guziRepository = new GuziRepository();
  const service = new CategoryService(categoryRepository, guziRepository);

  return { service, guziRepository };
};

describe('CategoryService', () => {
  it('creates and lists custom categories per owner', async () => {
    const { service } = createService();

    await service.createCategory({ ownerId: 'user-1', name: '票根', tone: 'blue' });
    await service.createCategory({ ownerId: 'user-2', name: '票根', tone: 'mint' });

    expect(await service.listCategories('user-1')).toMatchObject([{ ownerId: 'user-1', name: '票根' }]);
    expect(await service.listCategories('user-2')).toMatchObject([{ ownerId: 'user-2', name: '票根' }]);
  });

  it('rejects duplicate names for the same owner', async () => {
    const { service } = createService();

    await service.createCategory({ ownerId: 'user-1', name: '票根', tone: 'blue' });

    await expect(service.createCategory({ ownerId: 'user-1', name: '票根', tone: 'gold' })).rejects.toMatchObject({
      code: 'CATEGORY_DUPLICATE',
    });
  });

  it('renames and deletes unused custom categories', async () => {
    const { service } = createService();
    const category = await service.createCategory({ ownerId: 'user-1', name: '票根', tone: 'blue' });

    const renamed = await service.updateCategory(category.id, { ownerId: 'user-1', name: '挂件' });
    expect(renamed.name).toBe('挂件');

    await expect(service.deleteCategory(category.id, 'user-1')).resolves.toBe(true);
    await expect(service.listCategories('user-1')).resolves.toEqual([]);
  });

  it('blocks renaming and deleting categories used by inventory items', async () => {
    const { service, guziRepository } = createService();
    const category = await service.createCategory({ ownerId: 'user-1', name: '票根', tone: 'blue' });
    await guziRepository.saveItem('user-1', customItem);

    await expect(service.updateCategory(category.id, { ownerId: 'user-1', name: '挂件' })).rejects.toMatchObject({
      code: 'CATEGORY_IN_USE',
    });
    await expect(service.deleteCategory(category.id, 'user-1')).rejects.toMatchObject({
      code: 'CATEGORY_IN_USE',
    });

    await expect(service.deleteCategory(category.id, 'user-2')).rejects.toMatchObject({
      code: 'CATEGORY_NOT_FOUND',
    });
  });
});
