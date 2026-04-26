import { z } from 'zod';
import { ImageSourceSchema } from './guzi.schema';

const DimensionSchema = z.number().positive();

export const SpatialNodeTypeSchema = z.enum([
  'room',
  'cabinet',
  'shelf',
  'slot',
  'item',
]);

const BaseSpatialNodeSchema = z.object({
  id: z.string().min(1),
  nodeType: SpatialNodeTypeSchema,
  parentId: z.string().min(1).optional(),
  guziId: z.string().min(1).optional(),
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  width: DimensionSchema,
  height: DimensionSchema,
  depth: DimensionSchema.optional(),
});

export type SpatialNode = z.infer<typeof BaseSpatialNodeSchema> & {
  children?: SpatialNode[];
};

export const SpatialNodeSchema: z.ZodType<SpatialNode> = BaseSpatialNodeSchema.extend({
  children: z.lazy(() => SpatialNodeSchema.array()).optional(),
}).superRefine((node, ctx) => {
  if (node.nodeType === 'item' && !node.guziId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'item nodes must reference guziId',
      path: ['guziId'],
    });
  }
});

export const ShowcaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  ownerId: z.string().min(1),
  isPublic: z.boolean(),
  nodes: z.array(SpatialNodeSchema),
});

export const ShowcasePublicItemSchema = z.object({
  guziId: z.string().min(1),
  name: z.string().min(1),
  ip: z.string().min(1),
  character: z.string().min(1),
  series: z.string().min(1),
  type: z.string().min(1),
  imageUrl: ImageSourceSchema,
});

export const ShowcasePublicViewSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  ownerId: z.string().min(1),
  isPublic: z.literal(true),
  nodes: z.array(SpatialNodeSchema),
  items: z.array(ShowcasePublicItemSchema),
});

export type Showcase = z.infer<typeof ShowcaseSchema>;
export type ShowcasePublicItem = z.infer<typeof ShowcasePublicItemSchema>;
export type ShowcasePublicView = z.infer<typeof ShowcasePublicViewSchema>;
