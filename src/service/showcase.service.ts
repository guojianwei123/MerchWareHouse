import {
  ShowcasePublicViewSchema,
  ShowcaseSchema,
  type Showcase,
  type ShowcasePublicItem,
  type ShowcasePublicView,
} from '../types/models/spatial.schema';
import type { GuziItem } from '../types/models/guzi.schema';
import { defaultShowcaseRepository, type ShowcaseRepositoryPort } from '../repo/showcase.repo';

export class ShowcaseService {
  constructor(private readonly repository: ShowcaseRepositoryPort = defaultShowcaseRepository) {}

  async saveShowcase(input: unknown): Promise<Showcase> {
    const showcase = ShowcaseSchema.parse(input);
    return this.repository.saveShowcase(showcase);
  }

  async getShowcase(id: string): Promise<Showcase | null> {
    return this.repository.findById(id);
  }

  async getPublicView(showcaseId: string, items: GuziItem[]): Promise<ShowcasePublicView | null> {
    const showcase = await this.repository.findPublicById(showcaseId);

    if (!showcase) {
      return null;
    }

    const guziIds = new Set(
      showcase.nodes
        .map((node) => node.guziId)
        .filter((guziId): guziId is string => typeof guziId === 'string'),
    );
    const publicItems = items
      .filter((item) => guziIds.has(item.id))
      .map((item): ShowcasePublicItem => ({
        guziId: item.id,
        name: item.name,
        ip: item.ip,
        character: item.character,
        series: item.series,
        type: item.type,
        imageUrl: item.imageUrl,
      }));

    return ShowcasePublicViewSchema.parse({
      id: showcase.id,
      title: showcase.title,
      ownerId: showcase.ownerId,
      isPublic: true,
      nodes: showcase.nodes,
      items: publicItems,
    });
  }

  async clonePublicShowcase(showcaseId: string, ownerId: string): Promise<Showcase | null> {
    const showcase = await this.repository.findPublicById(showcaseId);

    if (!showcase) {
      return null;
    }

    return this.saveShowcase({
      ...showcase,
      id: `showcase_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ownerId,
      title: `${showcase.title} 副本`,
      isPublic: false,
    });
  }
}

export const defaultShowcaseService = new ShowcaseService();
