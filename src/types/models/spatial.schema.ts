import { z } from 'zod';

export const SpatialNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  width: z.number(),
  height: z.number(),
  depth: z.number().optional(),
});

export type SpatialNode = z.infer<typeof SpatialNodeSchema>;
