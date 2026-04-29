import { Prisma, PrismaClient } from '@prisma/client';
import { CategorySchema, type Category } from '../types/models/category.schema';

export interface CategoryRepositoryPort {
  listByOwner: (ownerId: string) => Promise<Category[]>;
  findById: (id: string) => Promise<Category | null>;
  findByOwnerAndName: (ownerId: string, name: string) => Promise<Category | null>;
  saveCategory: (category: Category) => Promise<Category>;
  updateCategory: (category: Category) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
}

export class CategoryRepository implements CategoryRepositoryPort {
  private readonly categories = new Map<string, Category>();

  async listByOwner(ownerId: string): Promise<Category[]> {
    return Array.from(this.categories.values()).filter((category) => category.ownerId === ownerId);
  }

  async findById(id: string): Promise<Category | null> {
    return this.categories.get(id) ?? null;
  }

  async findByOwnerAndName(ownerId: string, name: string): Promise<Category | null> {
    return Array.from(this.categories.values()).find((category) => category.ownerId === ownerId && category.name === name) ?? null;
  }

  async saveCategory(category: Category): Promise<Category> {
    this.categories.set(category.id, category);
    return category;
  }

  async updateCategory(category: Category): Promise<Category | null> {
    if (!this.categories.has(category.id)) {
      return null;
    }

    this.categories.set(category.id, category);
    return category;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }

  clear(): void {
    this.categories.clear();
  }
}

type CategoryRow = {
  id: string;
  ownerId: string;
  name: string;
  tone: string;
};

const fromCategoryRow = (row: CategoryRow): Category => CategorySchema.parse(row);

export class PrismaCategoryRepository implements CategoryRepositoryPort {
  constructor(private readonly prisma = new PrismaClient()) {}

  async listByOwner(ownerId: string): Promise<Category[]> {
    const rows = await this.prisma.$queryRaw<CategoryRow[]>(Prisma.sql`
      SELECT "id", "ownerId", "name", "tone"
      FROM "Category"
      WHERE "ownerId" = ${ownerId}
      ORDER BY "createdAt" ASC
    `);

    return rows.map(fromCategoryRow);
  }

  async findById(id: string): Promise<Category | null> {
    const rows = await this.prisma.$queryRaw<CategoryRow[]>(Prisma.sql`
      SELECT "id", "ownerId", "name", "tone"
      FROM "Category"
      WHERE "id" = ${id}
      LIMIT 1
    `);

    return rows[0] ? fromCategoryRow(rows[0]) : null;
  }

  async findByOwnerAndName(ownerId: string, name: string): Promise<Category | null> {
    const rows = await this.prisma.$queryRaw<CategoryRow[]>(Prisma.sql`
      SELECT "id", "ownerId", "name", "tone"
      FROM "Category"
      WHERE "ownerId" = ${ownerId} AND "name" = ${name}
      LIMIT 1
    `);

    return rows[0] ? fromCategoryRow(rows[0]) : null;
  }

  async saveCategory(category: Category): Promise<Category> {
    const rows = await this.prisma.$queryRaw<CategoryRow[]>(Prisma.sql`
      INSERT INTO "Category" ("id", "ownerId", "name", "tone")
      VALUES (${category.id}, ${category.ownerId}, ${category.name}, ${category.tone})
      RETURNING "id", "ownerId", "name", "tone"
    `);

    return fromCategoryRow(rows[0]);
  }

  async updateCategory(category: Category): Promise<Category | null> {
    const rows = await this.prisma.$queryRaw<CategoryRow[]>(Prisma.sql`
      UPDATE "Category"
      SET "name" = ${category.name}, "tone" = ${category.tone}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${category.id}
      RETURNING "id", "ownerId", "name", "tone"
    `);

    return rows[0] ? fromCategoryRow(rows[0]) : null;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const deletedCount = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM "Category"
      WHERE "id" = ${id}
    `);

    return deletedCount > 0;
  }
}
