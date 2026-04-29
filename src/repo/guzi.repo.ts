import type { GuziFilter, GuziItem } from '../types/models/guzi.schema';
import { GuziUnionSchema } from '../types/models/guzi.schema';
import { Prisma, PrismaClient } from '@prisma/client';

export interface GuziRepositoryPort {
  saveItem: (ownerId: string, item: GuziItem) => Promise<GuziItem>;
  updateItem: (ownerId: string, id: string, item: GuziItem) => Promise<GuziItem | null>;
  deleteItem: (ownerId: string, id: string) => Promise<boolean>;
  findById: (ownerId: string, id: string) => Promise<GuziItem | null>;
  listItems: (ownerId: string, filter?: GuziFilter) => Promise<GuziItem[]>;
}

export class GuziRepository implements GuziRepositoryPort {
  private readonly items = new Map<string, GuziItem>();

  async saveItem(ownerId: string, item: GuziItem): Promise<GuziItem> {
    const existing = this.items.get(item.id);

    if (existing && existing.ownerId !== ownerId) {
      throw new Error(`Guzi item already exists for another owner: ${item.id}`);
    }

    const saved = GuziUnionSchema.parse({ ...item, ownerId });
    this.items.set(saved.id, saved);
    return saved;
  }

  async updateItem(ownerId: string, id: string, item: GuziItem): Promise<GuziItem | null> {
    if (!(await this.findById(ownerId, id))) {
      return null;
    }

    return this.saveItem(ownerId, item);
  }

  async deleteItem(ownerId: string, id: string): Promise<boolean> {
    const existing = await this.findById(ownerId, id);

    if (!existing) {
      return false;
    }

    return this.items.delete(id);
  }

  async findById(ownerId: string, id: string): Promise<GuziItem | null> {
    const item = this.items.get(id);
    return item?.ownerId === ownerId ? item : null;
  }

  async listItems(ownerId: string, filter: GuziFilter = {}): Promise<GuziItem[]> {
    return Array.from(this.items.values()).filter((item) => {
      return (
        item.ownerId === ownerId &&
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

const detailKeys = [
  'diameter',
  'shape',
  'length',
  'width',
  'height',
  'material',
  'scale',
  'manufacturer',
  'description',
  'paperType',
  'hasBase',
  'compatibleModel',
  'specialType',
  'isSecret',
  'notes',
];

export const toDetails = (item: GuziItem): Prisma.InputJsonObject => {
  const details: Record<string, string | number | boolean> = {};
  const itemRecord = item as unknown as Record<string, string | number | boolean | undefined>;

  for (const key of detailKeys) {
    const value = itemRecord[key];

    if (value !== undefined) {
      details[key] = value;
    }
  }

  return details;
};

const fromPersistedItem = (item: {
  id: string;
  name: string;
  type: string;
  ip: string;
  character: string;
  series: string;
  imageUrl: string;
  officialPrice: number | null;
  purchasePrice: number | null;
  marketPrice: number | null;
  details: unknown;
  ownerId: string;
}): GuziItem => {
  const details = typeof item.details === 'object' && item.details !== null ? item.details : {};

  return GuziUnionSchema.parse({
    id: item.id,
    ownerId: item.ownerId,
    name: item.name,
    type: item.type,
    ip: item.ip,
    character: item.character,
    series: item.series,
    imageUrl: item.imageUrl,
    officialPrice: item.officialPrice ?? undefined,
    purchasePrice: item.purchasePrice ?? undefined,
    marketPrice: item.marketPrice ?? undefined,
    ...details,
  });
};

const toPersistedPrices = (item: GuziItem) => ({
  officialPrice: item.officialPrice ?? null,
  purchasePrice: item.purchasePrice ?? null,
  marketPrice: item.marketPrice ?? null,
});

export class PrismaGuziRepository implements GuziRepositoryPort {
  constructor(private readonly prisma = new PrismaClient()) {}

  async saveItem(ownerId: string, item: GuziItem): Promise<GuziItem> {
    const existing = await this.prisma.guziItem.findUnique({ where: { id: item.id } });

    if (existing && existing.ownerId !== ownerId) {
      throw new Error(`Guzi item already exists for another owner: ${item.id}`);
    }

    const saved = existing
      ? await this.prisma.guziItem.update({
        where: { id: item.id },
        data: {
          name: item.name,
          type: item.type,
          ip: item.ip,
          character: item.character,
          series: item.series,
          imageUrl: item.imageUrl,
          ...toPersistedPrices(item),
          details: toDetails(item),
        },
      })
      : await this.prisma.guziItem.create({
        data: {
          id: item.id,
          ownerId,
          name: item.name,
          type: item.type,
          ip: item.ip,
          character: item.character,
          series: item.series,
          imageUrl: item.imageUrl,
          ...toPersistedPrices(item),
          details: toDetails(item),
        },
      });

    return fromPersistedItem(saved);
  }

  async updateItem(ownerId: string, id: string, item: GuziItem): Promise<GuziItem | null> {
    const existing = await this.findById(ownerId, id);

    if (!existing) {
      return null;
    }

    return this.saveItem(ownerId, item);
  }

  async deleteItem(ownerId: string, id: string): Promise<boolean> {
    try {
      const result = await this.prisma.guziItem.deleteMany({ where: { id, ownerId } });
      return result.count > 0;
    } catch {
      return false;
    }
  }

  async findById(ownerId: string, id: string): Promise<GuziItem | null> {
    const item = await this.prisma.guziItem.findFirst({ where: { id, ownerId } });
    return item ? fromPersistedItem(item) : null;
  }

  async listItems(ownerId: string, filter: GuziFilter = {}): Promise<GuziItem[]> {
    const items = await this.prisma.guziItem.findMany({
      where: {
        ownerId,
        ip: filter.ip,
        character: filter.character,
        series: filter.series,
        type: filter.type,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return items.map(fromPersistedItem);
  }
}
