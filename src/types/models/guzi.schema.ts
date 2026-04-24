import { z } from 'zod';

export const BaseGuziSchema = z.object({
  id: z.string(),
  name: z.string(),
  ip: z.string(),
  character: z.string(),
  acquisitionPrice: z.number().optional(),
});

export const BadgeSchema = BaseGuziSchema.extend({
  type: z.literal('badge'),
  diameter: z.number(),
});

export const PaperCardSchema = BaseGuziSchema.extend({
  type: z.literal('paper_card'),
});

export const AcrylicSchema = BaseGuziSchema.extend({
  type: z.literal('acrylic'),
});

export const FabricSchema = BaseGuziSchema.extend({
  type: z.literal('fabric'),
});

export const FigureSchema = BaseGuziSchema.extend({
  type: z.literal('figure'),
  scale: z.string().optional(),
});

export const PracticalSchema = BaseGuziSchema.extend({
  type: z.literal('practical'),
});

export const SpecialSchema = BaseGuziSchema.extend({
  type: z.literal('special'),
});

export const GuziUnionSchema = z.discriminatedUnion('type', [
  BadgeSchema,
  PaperCardSchema,
  AcrylicSchema,
  FabricSchema,
  FigureSchema,
  PracticalSchema,
  SpecialSchema,
]);

export type GuziItem = z.infer<typeof GuziUnionSchema>;
