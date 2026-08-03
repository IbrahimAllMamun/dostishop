import { z } from 'zod';

/**
 * A value arrives either as a bare string (a TEXT attribute, and the shape the
 * CSV importer and older clients send) or as an object naming a colour from the
 * registry. Both are accepted on every attribute; the controller rejects the
 * mismatched combination — a COLOR attribute needs `colorId`, a TEXT one must
 * not carry it — where the message can say why.
 */
const attributeValueSchema = z.union([
  z.string().min(1).max(60),
  z.object({
    value: z.string().min(1).max(60).optional(),
    colorId: z.string().optional(),
  }),
]);

export const attributeCreateSchema = z.object({
  name: z.string().min(2).max(40),
  kind: z.enum(['TEXT', 'COLOR']).optional(),
  /** Variant axis (multiplies stock rows) vs product specification */
  isVariant: z.boolean().optional(),
  /** The full value set. Absent leaves values untouched; [] clears them. */
  values: z.array(attributeValueSchema).max(200).optional(),
  sortOrder: z.number().int().optional(),
});

export const attributeUpdateSchema = attributeCreateSchema.partial();
