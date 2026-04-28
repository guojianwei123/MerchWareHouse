import type { GuziFilter, GuziItem } from '../types/models/guzi.schema';
import { GuziUnionSchema } from '../types/models/guzi.schema';
import { Prisma, PrismaClient } from '@prisma/client';

export interface GuziRepositoryPort {
  saveItem: (item: GuziItem) => Promise<GuziItem>;
  updateItem: (id: string, item: GuziItem) => Promise<GuziItem | null>;
  deleteItem: (id: string) => Promise<boolean>;
  findById: (id: string) => Promise<GuziItem | null>;
  listItems: (filter?: GuziFilter) => Promise<GuziItem[]>;
}

export class GuziRepository implements GuziRepositoryPort {
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
}): GuziItem => {
  const details = typeof item.details === 'object' && item.details !== null ? item.details : {};

  return GuziUnionSchema.parse({
    id: item.id,
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

  async saveItem(item: GuziItem): Promise<GuziItem> {
    const saved = await this.prisma.guziItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.name,
        type: item.type,
        ip: item.ip,
        character: item.character,
        series: item.series,
        imageUrl: item.imageUrl,
        ...toPersistedPrices(item),
        details: toDetails(item),
      },
      update: {
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

  async updateItem(id: string, item: GuziItem): Promise<GuziItem | null> {
    const existing = await this.findById(id);

    if (!existing) {
      return null;
    }

    return this.saveItem(item);
  }

  async deleteItem(id: string): Promise<boolean> {
    try {
      await this.prisma.guziItem.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: string): Promise<GuziItem | null> {
    const item = await this.prisma.guziItem.findUnique({ where: { id } });
    return item ? fromPersistedItem(item) : null;
  }

  async listItems(filter: GuziFilter = {}): Promise<GuziItem[]> {
    const items = await this.prisma.guziItem.findMany({
      where: {
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
