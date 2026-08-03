import { z } from 'zod';

/**
 * `#RGB` is accepted for typing convenience and expanded to `#RRGGBB` in the
 * controller, so everything downstream — swatches, CSS, contrast maths — only
 * ever sees the six-digit lowercase form.
 */
export const hexCodeSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use a hex colour such as #6e1f2e');

export const colorCreateSchema = z.object({
  name: z.string().min(1).max(40),
  hexCode: hexCodeSchema,
  sortOrder: z.number().int().optional(),
});

export const colorUpdateSchema = colorCreateSchema.partial();
