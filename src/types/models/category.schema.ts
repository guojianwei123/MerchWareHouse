import { z } from 'zod';

export const CategoryToneSchema = z.enum(['pink', 'blue', 'mint', 'gold']);

export const CategorySchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  tone: CategoryToneSchema,
});

export const CategoryCreateInputSchema = z.object({
  ownerId: z.string().min(1).default('local-user'),
  name: z.string().trim().min(1).max(40),
  tone: CategoryToneSchema.default('pink'),
});

export const CategoryUpdateInputSchema = z.object({
  ownerId: z.string().min(1).default('local-user'),
  name: z.string().trim().min(1).max(40),
});

export type CategoryTone = z.infer<typeof CategoryToneSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type CategoryCreateInput = z.infer<typeof CategoryCreateInputSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateInputSchema>;
