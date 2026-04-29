import { GuziRepository, type GuziRepositoryPort } from '../repo/guzi.repo';
import {
  GuziFilterSchema,
  GuziUnionSchema,
  type GuziFilter,
  type GuziItem,
} from '../types/models/guzi.schema';

export class InventoryService {
  constructor(private readonly repository: GuziRepositoryPort = new GuziRepository()) {}

  async createItem(ownerId: string, input: unknown): Promise<GuziItem> {
    const item = GuziUnionSchema.parse(input);
    return this.repository.saveItem(ownerId, item);
  }

  async confirmDraft(ownerId: string, input: unknown): Promise<GuziItem> {
    return this.createItem(ownerId, input);
  }

  async updateItem(ownerId: string, id: string, input: unknown): Promise<GuziItem> {
    const item = GuziUnionSchema.parse(input);

    if (item.id !== id) {
      throw new Error('Item id does not match update target');
    }

    const updated = await this.repository.updateItem(ownerId, id, item);

    if (!updated) {
      throw new Error(`Guzi item not found: ${id}`);
    }

    return updated;
  }

  async deleteItem(ownerId: string, id: string): Promise<boolean> {
    return this.repository.deleteItem(ownerId, id);
  }

  async getItem(ownerId: string, id: string): Promise<GuziItem | null> {
    return this.repository.findById(ownerId, id);
  }

  async listItems(ownerId: string, filter: GuziFilter = {}): Promise<GuziItem[]> {
    const parsedFilter = GuziFilterSchema.parse(filter);
    return this.repository.listItems(ownerId, parsedFilter);
  }
}
