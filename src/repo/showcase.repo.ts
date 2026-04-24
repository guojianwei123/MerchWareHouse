import { ShowcaseSchema, type Showcase } from '../types/models/spatial.schema';

export class ShowcaseRepository {
  private readonly showcases = new Map<string, Showcase>();

  async saveShowcase(input: Showcase): Promise<Showcase> {
    const showcase = ShowcaseSchema.parse(input);
    this.showcases.set(showcase.id, showcase);
    return showcase;
  }

  async findById(id: string): Promise<Showcase | null> {
    return this.showcases.get(id) ?? null;
  }

  async findPublicById(id: string): Promise<Showcase | null> {
    const showcase = await this.findById(id);

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
