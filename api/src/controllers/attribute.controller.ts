import { Request } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { slugify } from '../utils/helpers';

export const listAttributes = asyncHandler(async (_req, res) => {
  const attributes = await prisma.attribute.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      values: {
        orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
        // How many variants carry each value, so the UI can warn before a
        // delete that the server would reject anyway
        include: { _count: { select: { variants: true } } },
      },
      _count: { select: { values: true } },
    },
  });
  res.json({ attributes });
});

/**
 * Same rule as Category: admins always; a vendor only for what they created,
 * and only until an admin curates it. Kept as its own copy rather than a shared
 * helper because the two tables have no common base — a shared generic here
 * would obscure more than it saves.
 */
async function assertCanMutate(req: Request, id: string) {
  const attribute = await prisma.attribute.findUnique({ where: { id } });
  if (!attribute) throw new ApiError(404, 'Attribute not found');
  if (req.user?.role === 'SUPER_ADMIN') return attribute;

  if (!attribute.createdById || attribute.createdById !== req.user?.sub) {
    throw new ApiError(403, 'You can only change attributes you created');
  }
  if (attribute.adminLocked) {
    throw new ApiError(403, 'This attribute is now managed by the platform admin');
  }
  return attribute;
}

/** Values arrive as a plain string list; this reconciles them against the row. */
async function syncValues(attributeId: string, values: string[] | undefined) {
  if (!values) return;
  const wanted = [...new Set(values.map((v) => v.trim()).filter(Boolean))];

  const existing = await prisma.attributeValue.findMany({ where: { attributeId } });
  const existingByValue = new Map(existing.map((v) => [v.value, v]));

  const toRemove = existing.filter((v) => !wanted.includes(v.value));
  if (toRemove.length) {
    // A value in use by a variant cannot be silently deleted — that would drop
    // the variant's identity. Report it instead.
    const inUse = await prisma.variantAttribute.findMany({
      where: { valueId: { in: toRemove.map((v) => v.id) } },
      select: { valueId: true },
    });
    const blocked = new Set(inUse.map((r) => r.valueId));
    const blockedValues = toRemove.filter((v) => blocked.has(v.id));
    if (blockedValues.length) {
      throw new ApiError(
        400,
        `Still in use by products: ${blockedValues.map((v) => v.value).join(', ')}`,
      );
    }
    await prisma.attributeValue.deleteMany({ where: { id: { in: toRemove.map((v) => v.id) } } });
  }

  const toCreate = wanted.filter((v) => !existingByValue.has(v));
  if (toCreate.length) {
    await prisma.attributeValue.createMany({
      data: toCreate.map((value, i) => ({ attributeId, value, sortOrder: i })),
      skipDuplicates: true,
    });
  }

  // Keep the stored order matching the order the user typed them in
  await Promise.all(
    wanted.map((value, i) =>
      prisma.attributeValue.updateMany({ where: { attributeId, value }, data: { sortOrder: i } }),
    ),
  );
}

export const createAttribute = asyncHandler(async (req, res) => {
  const { name, values, sortOrder } = req.body;

  let slug = slugify(name);
  if (await prisma.attribute.findUnique({ where: { slug } })) {
    throw new ApiError(409, `An attribute called "${name}" already exists`);
  }

  const attribute = await prisma.attribute.create({
    data: {
      name,
      slug,
      sortOrder: sortOrder ?? 0,
      createdById: req.user?.role === 'VENDOR' ? req.user.sub : null,
    },
  });
  await syncValues(attribute.id, values);

  res.status(201).json({
    attribute: await prisma.attribute.findUnique({
      where: { id: attribute.id },
      include: { values: { orderBy: { sortOrder: 'asc' } } },
    }),
  });
});

export const updateAttribute = asyncHandler(async (req, res) => {
  const existing = await assertCanMutate(req, req.params.id);
  const { name, values, sortOrder } = req.body;

  const data: { name?: string; slug?: string; sortOrder?: number; adminLocked?: boolean } = {};
  if (name !== undefined && name !== existing.name) {
    const slug = slugify(name);
    const clash = await prisma.attribute.findUnique({ where: { slug } });
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, `An attribute called "${name}" already exists`);
    }
    data.name = name;
    data.slug = slug;
  }
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  // Renaming or changing the value set is curation; reordering alone is not.
  const isCuration = data.name !== undefined || values !== undefined;
  if (req.user?.role === 'SUPER_ADMIN' && existing.createdById && !existing.adminLocked && isCuration) {
    data.adminLocked = true;
  }

  await prisma.attribute.update({ where: { id: existing.id }, data });
  await syncValues(existing.id, values);

  res.json({
    attribute: await prisma.attribute.findUnique({
      where: { id: existing.id },
      include: { values: { orderBy: { sortOrder: 'asc' } } },
    }),
  });
});

export const deleteAttribute = asyncHandler(async (req, res) => {
  await assertCanMutate(req, req.params.id);

  // Deleting cascades to values and to the variant links, which would quietly
  // strip identity from live products. Refuse while anything is using it.
  const inUse = await prisma.variantAttribute.count({
    where: { value: { attributeId: req.params.id } },
  });
  if (inUse > 0) {
    throw new ApiError(400, 'Products still use this attribute, so it cannot be deleted');
  }

  await prisma.attribute.delete({ where: { id: req.params.id } });
  res.json({ message: 'Attribute deleted' });
});
