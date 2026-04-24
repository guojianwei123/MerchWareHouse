import { z } from 'zod';

export const PriceRecordSchema = z.object({
  id: z.string(),
  guziId: z.string(),
  date: z.string().datetime(),
  releasePrice: z.number().optional(),
  acquisitionPrice: z.number().optional(),
  marketPrice: z.number().optional(),
});

export type PriceRecord = z.infer<typeof PriceRecordSchema>;
