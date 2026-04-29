import { z } from 'zod';
import { isSupportedImageSource } from './local-image.schema';

const PriceSchema = z.number().nonnegative();
const DimensionSchema = z.number().positive();
const OptionalTextSchema = z.string().min(1).optional();

export const ImageSourceSchema = z.string().refine(isSupportedImageSource, 'imageUrl must be a valid URL or image data URL');
export const GuziTypeSchema = z.string().min(1);

export const GuziItemSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1).optional(),
  type: GuziTypeSchema,
  name: z.string().min(1),
  ip: z.string().min(1),
  character: z.string().min(1),
  series: z.string().min(1),
  imageUrl: ImageSourceSchema,
  officialPrice: PriceSchema.optional(),
  purchasePrice: PriceSchema.optional(),
  marketPrice: PriceSchema.optional(),
  diameter: DimensionSchema.optional(),
  shape: OptionalTextSchema,
  length: DimensionSchema.optional(),
  width: DimensionSchema.optional(),
  height: DimensionSchema.optional(),
  material: OptionalTextSchema,
  scale: OptionalTextSchema,
  manufacturer: OptionalTextSchema,
  description: OptionalTextSchema,
  paperType: OptionalTextSchema,
  hasBase: z.boolean().optional(),
  compatibleModel: OptionalTextSchema,
  specialType: OptionalTextSchema,
  isSecret: z.boolean().optional(),
  notes: OptionalTextSchema,
});

export const GuziUnionSchema = GuziItemSchema;

export const GuziFilterSchema = z.object({
  ip: z.string().optional(),
  character: z.string().optional(),
  series: z.string().optional(),
  type: GuziTypeSchema.optional(),
});

export type GuziType = z.infer<typeof GuziTypeSchema>;
export type GuziItem = z.infer<typeof GuziItemSchema>;
export type GuziFilter = z.infer<typeof GuziFilterSchema>;
