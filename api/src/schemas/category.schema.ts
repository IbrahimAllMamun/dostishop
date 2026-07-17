import { z } from 'zod';

export const categoryCreateSchema = z.object({
  name: z.string().min(2),
  parentId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();
