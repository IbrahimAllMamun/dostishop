import { Request } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { COLOR_AXIS_SLUG } from '../utils/helpers';

/**
 * The shared colour palette. A colour is a name plus a hex code, defined once
 * and referenced by every Colour attribute value that uses it — so the same
 * maroon renders identically across shops, and fixing a hex fixes every
 * product at once.
 *
 * Ownership is the same rule as Category and Attribute: admins always; a vendor
 * only for what they created, and only until an admin curates it.
 */

/** Expand `#abc` to `#aabbcc` and lowercase, so storage has one shape. */
export function normaliseHex(hex: string): string {
  const raw = hex.trim().toLowerCase();
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return raw;
}

export const listColors = asyncHandler(async (_req, res) => {
  const colors = await prisma.color.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    // How many attribute values point here, so the UI can warn before a delete
    // the server would reject anyway
    include: { _count: { select: { values: true } } },
  });
  res.json({ colors });
});

async function assertCanMutate(req: Request, id: string) {
  const color = await prisma.color.findUnique({ where: { id } });
  if (!color) throw new ApiError(404, 'Colour not found');
  if (req.user?.role === 'SUPER_ADMIN') return color;

  if (!color.createdById || color.createdById !== req.user?.sub) {
    throw new ApiError(403, 'You can only change colours you created');
  }
  if (color.adminLocked) {
    throw new ApiError(403, 'This colour is now managed by the platform admin');
  }
  return color;
}

export const createColor = asyncHandler(async (req, res) => {
  const { name, hexCode, sortOrder } = req.body;
  const trimmed = (name as string).trim();

  const clash = await prisma.color.findUnique({ where: { name: trimmed } });
  if (clash) throw new ApiError(409, `A colour called "${trimmed}" already exists`);

  const color = await prisma.color.create({
    data: {
      name: trimmed,
      hexCode: normaliseHex(hexCode),
      sortOrder: sortOrder ?? 0,
      createdById: req.user?.role === 'VENDOR' ? req.user.sub : null,
    },
  });
  res.status(201).json({ color });
});

export const updateColor = asyncHandler(async (req, res) => {
  const existing = await assertCanMutate(req, req.params.id);
  const { name, hexCode, sortOrder } = req.body;

  const data: { name?: string; hexCode?: string; sortOrder?: number; adminLocked?: boolean } = {};

  if (name !== undefined && name.trim() !== existing.name) {
    const trimmed = (name as string).trim();
    const clash = await prisma.color.findUnique({ where: { name: trimmed } });
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, `A colour called "${trimmed}" already exists`);
    }
    data.name = trimmed;
  }
  if (hexCode !== undefined) data.hexCode = normaliseHex(hexCode);
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  // Renaming or recolouring is curation; reordering alone is not — the same
  // distinction categories and attributes make, so a tidy-up never confiscates
  // a vendor's colour.
  const isCuration = data.name !== undefined || data.hexCode !== undefined;
  if (req.user?.role === 'SUPER_ADMIN' && existing.createdById && !existing.adminLocked && isCuration) {
    data.adminLocked = true;
  }

  const color = await prisma.color.update({ where: { id: existing.id }, data });

  // The attribute value that represents this colour carries the name as a
  // string (checkout labels and CSV read it), as does every variant already
  // built from it. A rename has to reach all three or the storefront shows one
  // name and the cart another.
  if (data.name) {
    const values = await prisma.attributeValue.findMany({
      where: { colorId: color.id },
      select: { id: true, attributeId: true, attribute: { select: { slug: true } } },
    });
    for (const v of values) {
      // Respect the unique [attributeId, value] pair: if an unrelated value
      // already holds the new name under this attribute, leave this one's label
      // alone rather than failing the whole rename.
      const taken = await prisma.attributeValue.findFirst({
        where: { attributeId: v.attributeId, value: color.name, NOT: { id: v.id } },
        select: { id: true },
      });
      if (taken) continue;

      await prisma.attributeValue.update({ where: { id: v.id }, data: { value: color.name } });

      // Only the canonical Colour axis owns `ProductVariant.color`. A second
      // colour-kind attribute (a "Shade", say) must not write to it, or a
      // rename there would silently rewrite the column that CSV export and the
      // storefront facets read. This mirrors `denormalise` in product.controller.
      if (v.attribute.slug === COLOR_AXIS_SLUG) {
        await prisma.productVariant.updateMany({
          where: { attributes: { some: { valueId: v.id } } },
          data: { color: color.name },
        });
      }
    }
  }

  res.json({ color });
});

export const deleteColor = asyncHandler(async (req, res) => {
  await assertCanMutate(req, req.params.id);

  // The FK is ON DELETE SET NULL, so deleting would quietly turn a swatch back
  // into plain text on live products. Refuse while anything references it.
  const inUse = await prisma.attributeValue.count({ where: { colorId: req.params.id } });
  if (inUse > 0) {
    throw new ApiError(400, 'This colour is still used by an attribute value, so it cannot be deleted');
  }

  await prisma.color.delete({ where: { id: req.params.id } });
  res.json({ message: 'Colour deleted' });
});
