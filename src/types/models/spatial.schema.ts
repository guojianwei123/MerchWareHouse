import { z } from 'zod';

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
});

export const ShowcaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  ownerId: z.string().min(1),
  isPublic: z.boolean(),
  nodes: z.array(SpatialNodeSchema),
});

export type Showcase = z.infer<typeof ShowcaseSchema>;
