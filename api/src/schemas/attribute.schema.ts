import { z } from 'zod';

export const attributeCreateSchema = z.object({
  name: z.string().min(2).max(40),
  /** The full value set. Absent leaves values untouched; [] clears them. */
  values: z.array(z.string().min(1).max(60)).max(200).optional(),
  sortOrder: z.number().int().optional(),
});

export const attributeUpdateSchema = attributeCreateSchema.partial();
