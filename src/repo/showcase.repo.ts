import { ShowcaseSchema, type Showcase } from '../types/models/spatial.schema';
import { PrismaClient } from '@prisma/client';

export interface ShowcaseRepositoryPort {
  saveShowcase: (input: Showcase) => Promise<Showcase>;
  findById: (ownerId: string, id: string) => Promise<Showcase | null>;
  findAnyById: (id: string) => Promise<Showcase | null>;
  findPublicById: (id: string) => Promise<Showcase | null>;
}

export class ShowcaseRepository implements ShowcaseRepositoryPort {
  private readonly showcases = new Map<string, Showcase>();

  async saveShowcase(input: Showcase): Promise<Showcase> {
    const showcase = ShowcaseSchema.parse(input);
    this.showcases.set(showcase.id, showcase);
    return showcase;
  }

  async findById(ownerId: string, id: string): Promise<Showcase | null> {
    const showcase = this.showcases.get(id);
    return showcase?.ownerId === ownerId ? showcase : null;
  }

  async findAnyById(id: string): Promise<Showcase | null> {
    return this.showcases.get(id) ?? null;
  }

  async findPublicById(id: string): Promise<Showcase | null> {
    const showcase = this.showcases.get(id) ?? null;

    if (!showcase?.isPublic) {
      return null;
    }

    return showcase;
  }

  clear(): void {
    this.showcases.clear();
  }
}

export const defaultShowcaseRepository = new ShowcaseRepository();

const fromPersistedShowcase = (showcase: {
  id: string;
  title: string;
  ownerId: string;
  isPublic: boolean;
  nodes: unknown;
}): Showcase => ShowcaseSchema.parse(showcase);

export class PrismaShowcaseRepository implements ShowcaseRepositoryPort {
  constructor(private readonly prisma = new PrismaClient()) {}

  async saveShowcase(input: Showcase): Promise<Showcase> {
    const showcase = ShowcaseSchema.parse(input);
    const saved = await this.prisma.showcase.upsert({
      where: { id: showcase.id },
      create: {
        id: showcase.id,
        title: showcase.title,
        ownerId: showcase.ownerId,
        isPublic: showcase.isPublic,
        nodes: showcase.nodes,
      },
      update: {
        title: showcase.title,
        ownerId: showcase.ownerId,
        isPublic: showcase.isPublic,
        nodes: showcase.nodes,
      },
    });

    return fromPersistedShowcase(saved);
  }

  async findById(ownerId: string, id: string): Promise<Showcase | null> {
    const showcase = await this.prisma.showcase.findFirst({ where: { id, ownerId } });
    return showcase ? fromPersistedShowcase(showcase) : null;
  }

  async findAnyById(id: string): Promise<Showcase | null> {
    const showcase = await this.prisma.showcase.findUnique({ where: { id } });
    return showcase ? fromPersistedShowcase(showcase) : null;
  }

  async findPublicById(id: string): Promise<Showcase | null> {
    const showcase = await this.prisma.showcase.findFirst({
      where: {
        id,
        isPublic: true,
      },
    });

    return showcase ? fromPersistedShowcase(showcase) : null;
  }
}
