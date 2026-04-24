import { GuziRepository } from '../repo/guzi.repo';
import {
  GuziFilterSchema,
  GuziUnionSchema,
  type GuziFilter,
  type GuziItem,
} from '../types/models/guzi.schema';

export class InventoryService {
  constructor(private readonly repository = new GuziRepository()) {}

  async createItem(input: unknown): Promise<GuziItem> {
    const item = GuziUnionSchema.parse(input);
    return this.repository.saveItem(item);
  }

  async confirmDraft(input: unknown): Promise<GuziItem> {
    return this.createItem(input);
  }

  async updateItem(id: string, input: unknown): Promise<GuziItem> {
    const item = GuziUnionSchema.parse(input);

    if (item.id !== id) {
      throw new Error('Item id does not match update target');
    }

    const updated = await this.repository.updateItem(id, item);

    if (!updated) {
      throw new Error(`Guzi item not found: ${id}`);
    }

    return updated;
  }

  async deleteItem(id: string): Promise<boolean> {
    return this.repository.deleteItem(id);
  }

  async getItem(id: string): Promise<GuziItem | null> {
    return this.repository.findById(id);
  }

  async listItems(filter: GuziFilter = {}): Promise<GuziItem[]> {
    const parsedFilter = GuziFilterSchema.parse(filter);
    return this.repository.listItems(parsedFilter);
  }
}
