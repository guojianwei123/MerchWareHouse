import type { GuziFilter, GuziItem } from '../types/models/guzi.schema';

export class GuziRepository {
  private readonly items = new Map<string, GuziItem>();

  async saveItem(item: GuziItem): Promise<GuziItem> {
    this.items.set(item.id, item);
    return item;
  }

  async updateItem(id: string, item: GuziItem): Promise<GuziItem | null> {
    if (!this.items.has(id)) {
      return null;
    }

    this.items.set(id, item);
    return item;
  }

  async deleteItem(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async findById(id: string): Promise<GuziItem | null> {
    return this.items.get(id) ?? null;
  }

  async listItems(filter: GuziFilter = {}): Promise<GuziItem[]> {
    return Array.from(this.items.values()).filter((item) => {
      return (
        (!filter.ip || item.ip === filter.ip) &&
        (!filter.character || item.character === filter.character) &&
        (!filter.series || item.series === filter.series) &&
        (!filter.type || item.type === filter.type)
      );
    });
  }

  clear(): void {
    this.items.clear();
  }
}
