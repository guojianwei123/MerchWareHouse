import { z } from 'zod';

const PriceSchema = z.number().nonnegative();

export const PriceRecordSchema = z.object({
  id: z.string().min(1),
  guziId: z.string().min(1),
  date: z.string().datetime(),
  officialPrice: PriceSchema.optional(),
  purchasePrice: PriceSchema.optional(),
  marketPrice: PriceSchema.optional(),
});

export type PriceRecord = z.infer<typeof PriceRecordSchema>;
