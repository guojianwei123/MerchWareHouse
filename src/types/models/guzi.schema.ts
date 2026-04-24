import { z } from 'zod';

const PriceSchema = z.number().nonnegative();
const DimensionSchema = z.number().positive();

export const GuziTypeSchema = z.enum([
  'paper_card',
  'acrylic',
  'badge',
  'fabric',
  'figure',
  'practical',
  'special',
]);

export const BaseGuziSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ip: z.string().min(1),
  character: z.string().min(1),
  series: z.string().min(1),
  imageUrl: z.string().url(),
  officialPrice: PriceSchema.optional(),
  purchasePrice: PriceSchema.optional(),
  marketPrice: PriceSchema.optional(),
});

export const PaperCardSchema = BaseGuziSchema.extend({
  type: z.literal('paper_card'),
  length: DimensionSchema,
  width: DimensionSchema,
  paperType: z.string().min(1).optional(),
});

export const AcrylicSchema = BaseGuziSchema.extend({
  type: z.literal('acrylic'),
  height: DimensionSchema,
  hasBase: z.boolean(),
  width: DimensionSchema.optional(),
});

export const BadgeSchema = BaseGuziSchema.extend({
  type: z.literal('badge'),
  diameter: DimensionSchema,
  shape: z.enum(['round', 'square', 'custom']),
});

export const FabricSchema = BaseGuziSchema.extend({
  type: z.literal('fabric'),
  length: DimensionSchema,
  width: DimensionSchema,
  material: z.string().min(1),
  height: DimensionSchema.optional(),
});

export const FigureSchema = BaseGuziSchema.extend({
  type: z.literal('figure'),
  scale: z.string().min(1),
  height: DimensionSchema,
  manufacturer: z.string().min(1),
});

export const PracticalSchema = BaseGuziSchema.extend({
  type: z.literal('practical'),
  compatibleModel: z.string().min(1),
  length: DimensionSchema.optional(),
  width: DimensionSchema.optional(),
});

export const SpecialSchema = BaseGuziSchema.extend({
  type: z.literal('special'),
  specialType: z.enum(['blind_box', 'limited_collab', 'other']),
  description: z.string().min(1),
  isSecret: z.boolean().optional(),
});

export const GuziUnionSchema = z.discriminatedUnion('type', [
  PaperCardSchema,
  AcrylicSchema,
  BadgeSchema,
  FabricSchema,
  FigureSchema,
  PracticalSchema,
  SpecialSchema,
]);

export const GuziFilterSchema = z.object({
  ip: z.string().optional(),
  character: z.string().optional(),
  series: z.string().optional(),
  type: GuziTypeSchema.optional(),
});

export type GuziType = z.infer<typeof GuziTypeSchema>;
export type GuziItem = z.infer<typeof GuziUnionSchema>;
export type GuziFilter = z.infer<typeof GuziFilterSchema>;
