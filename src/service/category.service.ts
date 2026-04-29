import { CategoryRepository, type CategoryRepositoryPort } from '../repo/category.repo';
import { GuziRepository, type GuziRepositoryPort } from '../repo/guzi.repo';
import {
  CategoryCreateInputSchema,
  CategorySchema,
  CategoryUpdateInputSchema,
  type Category,
} from '../types/models/category.schema';

type CategoryServiceErrorCode = 'CATEGORY_DUPLICATE' | 'CATEGORY_IN_USE' | 'CATEGORY_NOT_FOUND';

export class CategoryServiceError extends Error {
  constructor(
    message: string,
    readonly code: CategoryServiceErrorCode,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

const createCategoryId = (): string => `category_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepositoryPort = new CategoryRepository(),
    private readonly guziRepository: GuziRepositoryPort = new GuziRepository(),
  ) {}

  async listCategories(ownerId: string): Promise<Category[]> {
    return this.categoryRepository.listByOwner(ownerId);
  }

  async createCategory(input: unknown): Promise<Category> {
    const parsed = CategoryCreateInputSchema.parse(input);
    await this.ensureNameAvailable(parsed.ownerId, parsed.name);

    return this.categoryRepository.saveCategory(CategorySchema.parse({
      id: createCategoryId(),
      ownerId: parsed.ownerId,
      name: parsed.name,
      tone: parsed.tone,
    }));
  }

  async updateCategory(id: string, input: unknown): Promise<Category> {
    const parsed = CategoryUpdateInputSchema.parse(input);
    const existing = await this.findOwnedCategory(id, parsed.ownerId);

    if (existing.name === parsed.name) {
      return existing;
    }

    await this.ensureCategoryUnused(parsed.ownerId, existing.name);
    await this.ensureNameAvailable(parsed.ownerId, parsed.name, existing.id);

    const updated = await this.categoryRepository.updateCategory({
      ...existing,
      name: parsed.name,
    });

    if (!updated) {
      throw new CategoryServiceError('分类不存在。', 'CATEGORY_NOT_FOUND', 404);
    }

    return updated;
  }

  async deleteCategory(id: string, ownerId: string): Promise<boolean> {
    const existing = await this.findOwnedCategory(id, ownerId);
    await this.ensureCategoryUnused(ownerId, existing.name);
    return this.categoryRepository.deleteCategory(existing.id);
  }

  private async findOwnedCategory(id: string, ownerId: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);

    if (!category || category.ownerId !== ownerId) {
      throw new CategoryServiceError('分类不存在。', 'CATEGORY_NOT_FOUND', 404);
    }

    return category;
  }

  private async ensureNameAvailable(ownerId: string, name: string, currentId?: string): Promise<void> {
    const existing = await this.categoryRepository.findByOwnerAndName(ownerId, name);

    if (existing && existing.id !== currentId) {
      throw new CategoryServiceError('分类名称已存在。', 'CATEGORY_DUPLICATE', 409);
    }
  }

  private async ensureCategoryUnused(ownerId: string, name: string): Promise<void> {
    const items = await this.guziRepository.listItems(ownerId, { type: name });

    if (items.length > 0) {
      throw new CategoryServiceError('该分类已有物品使用，不能重命名或删除。', 'CATEGORY_IN_USE', 409);
    }
  }
}
