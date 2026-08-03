import { Request } from 'express';
import { AttributeKind } from '@prisma/client';
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
        include: {
          // Null on a TEXT attribute; the swatch source on a COLOR one
          color: { select: { id: true, name: true, hexCode: true } },
          // How many variants and products carry each value, so the UI can warn
          // before a delete that the server would reject anyway
          _count: { select: { variants: true, productSpecs: true } },
        },
      },
      _count: { select: { values: true, products: true } },
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

/** What a client may send for one value. Bare strings keep older callers working. */
type IncomingValue = string | { value?: string; colorId?: string };

/** A value once resolved against the colour registry. */
interface ResolvedValue {
  value: string;
  colorId: string | null;
}

/**
 * On a COLOR attribute the value list is a list of colour ids, and the stored
 * `value` string is the colour's name — a denormalised copy, exactly like
 * `ProductVariant.color`, because checkout labels, CSV export and the
 * storefront facets all read strings. `updateColor` keeps it in sync on rename.
 */
async function resolveValues(kind: AttributeKind, values: IncomingValue[]): Promise<ResolvedValue[]> {
  if (kind === 'COLOR') {
    const ids = [
      ...new Set(
        values
          .map((v) => (typeof v === 'string' ? undefined : v.colorId))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (ids.length !== values.length) {
      throw new ApiError(400, 'Every value of a colour attribute must be picked from the colour palette');
    }
    const colors = await prisma.color.findMany({ where: { id: { in: ids } } });
    if (colors.length !== ids.length) {
      throw new ApiError(400, 'One or more selected colours no longer exist');
    }
    const byId = new Map(colors.map((c) => [c.id, c]));
    // Keep the order the client sent, not the order the database returned
    return ids.map((id) => ({ value: byId.get(id)!.name, colorId: id }));
  }

  const names = values.map((v) => (typeof v === 'string' ? v : (v.value ?? '')).trim()).filter(Boolean);
  return [...new Set(names)].map((value) => ({ value, colorId: null }));
}

/** Reconciles the wanted value set against what is stored. */
async function syncValues(
  attributeId: string,
  kind: AttributeKind,
  values: IncomingValue[] | undefined,
) {
  if (!values) return;
  const wanted = await resolveValues(kind, values);
  // A colour attribute is keyed by colour id, a text one by the string itself
  const keyOf = (v: { value: string; colorId: string | null }) =>
    kind === 'COLOR' ? (v.colorId ?? `#${v.value}`) : v.value;
  const wantedKeys = new Set(wanted.map(keyOf));

  const existing = await prisma.attributeValue.findMany({ where: { attributeId } });
  const existingByKey = new Map(existing.map((v) => [keyOf(v), v]));

  const toRemove = existing.filter((v) => !wantedKeys.has(keyOf(v)));
  if (toRemove.length) {
    // A value in use cannot be silently deleted — that would drop a variant's
    // identity or a product's stated spec. Report it instead.
    const removeIds = toRemove.map((v) => v.id);
    const [variantUse, specUse] = await Promise.all([
      prisma.variantAttribute.findMany({
        where: { valueId: { in: removeIds } },
        select: { valueId: true },
      }),
      prisma.productAttributeValue.findMany({
        where: { valueId: { in: removeIds } },
        select: { valueId: true },
      }),
    ]);
    const blocked = new Set([...variantUse, ...specUse].map((r) => r.valueId));
    const blockedValues = toRemove.filter((v) => blocked.has(v.id));
    if (blockedValues.length) {
      throw new ApiError(
        400,
        `Still in use by products: ${blockedValues.map((v) => v.value).join(', ')}`,
      );
    }
    await prisma.attributeValue.deleteMany({ where: { id: { in: removeIds } } });
  }

  for (const [i, v] of wanted.entries()) {
    const found = existingByKey.get(keyOf(v));
    if (found) {
      // Order always; value/colour only when the registry moved underneath us
      await prisma.attributeValue.update({
        where: { id: found.id },
        data: { sortOrder: i, value: v.value, colorId: v.colorId },
      });
    } else {
      await prisma.attributeValue.create({
        data: { attributeId, value: v.value, colorId: v.colorId, sortOrder: i },
      });
    }
  }
}

/**
 * Switching an existing attribute to COLOR without restating its values would
 * leave them as plain text forever. Link the ones whose name already matches a
 * registry colour; anything unmatched keeps rendering as a text chip until an
 * admin picks a colour for it, which is better than dropping it.
 */
async function adoptColorsByName(attributeId: string) {
  const values = await prisma.attributeValue.findMany({
    where: { attributeId, colorId: null },
    select: { id: true, value: true },
  });
  if (!values.length) return;

  const colors = await prisma.color.findMany({
    where: { name: { in: values.map((v) => v.value), mode: 'insensitive' } },
    select: { id: true, name: true },
  });
  const byName = new Map(colors.map((c) => [c.name.toLowerCase(), c.id]));

  await Promise.all(
    values
      .map((v) => ({ id: v.id, colorId: byName.get(v.value.toLowerCase()) }))
      .filter((r) => r.colorId)
      .map((r) => prisma.attributeValue.update({ where: { id: r.id }, data: { colorId: r.colorId } })),
  );
}

/** The shape both write handlers return, so the client can refresh in place. */
const attributeDetail = {
  values: {
    orderBy: { sortOrder: 'asc' as const },
    include: { color: { select: { id: true, name: true, hexCode: true } } },
  },
};

export const createAttribute = asyncHandler(async (req, res) => {
  const { name, kind, isVariant, values, sortOrder } = req.body;

  const slug = slugify(name);
  if (await prisma.attribute.findUnique({ where: { slug } })) {
    throw new ApiError(409, `An attribute called "${name}" already exists`);
  }

  const attribute = await prisma.attribute.create({
    data: {
      name,
      slug,
      kind: kind ?? 'TEXT',
      isVariant: isVariant ?? true,
      sortOrder: sortOrder ?? 0,
      createdById: req.user?.role === 'VENDOR' ? req.user.sub : null,
    },
  });
  await syncValues(attribute.id, attribute.kind, values);

  res.status(201).json({
    attribute: await prisma.attribute.findUnique({
      where: { id: attribute.id },
      include: attributeDetail,
    }),
  });
});

export const updateAttribute = asyncHandler(async (req, res) => {
  const existing = await assertCanMutate(req, req.params.id);
  const { name, kind, isVariant, values, sortOrder } = req.body;

  const data: {
    name?: string;
    slug?: string;
    kind?: AttributeKind;
    isVariant?: boolean;
    sortOrder?: number;
    adminLocked?: boolean;
  } = {};
  if (name !== undefined && name !== existing.name) {
    const slug = slugify(name);
    const clash = await prisma.attribute.findUnique({ where: { slug } });
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, `An attribute called "${name}" already exists`);
    }
    data.name = name;
    data.slug = slug;
  }
  if (kind !== undefined) data.kind = kind;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  // Turning a live variant axis into a product spec would strand the variants
  // already built along it — their values would no longer be pickable anywhere.
  if (isVariant !== undefined && isVariant !== existing.isVariant) {
    const built = await prisma.variantAttribute.count({
      where: { value: { attributeId: existing.id } },
    });
    if (built > 0 && !isVariant) {
      throw new ApiError(
        400,
        'Products already have variants along this attribute, so it cannot become a specification',
      );
    }
    data.isVariant = isVariant;
  }

  // Renaming or changing the value set is curation; reordering alone is not.
  const isCuration = data.name !== undefined || values !== undefined || data.kind !== undefined;
  if (req.user?.role === 'SUPER_ADMIN' && existing.createdById && !existing.adminLocked && isCuration) {
    data.adminLocked = true;
  }

  await prisma.attribute.update({ where: { id: existing.id }, data });

  const effectiveKind = data.kind ?? existing.kind;
  await syncValues(existing.id, effectiveKind, values);
  if (effectiveKind === 'COLOR' && existing.kind === 'TEXT') {
    await adoptColorsByName(existing.id);
  }

  res.json({
    attribute: await prisma.attribute.findUnique({
      where: { id: existing.id },
      include: attributeDetail,
    }),
  });
});

export const deleteAttribute = asyncHandler(async (req, res) => {
  await assertCanMutate(req, req.params.id);

  // Deleting cascades to values and to the variant and spec links, which would
  // quietly strip identity from live products. Refuse while anything uses it.
  const [variantUse, specUse] = await Promise.all([
    prisma.variantAttribute.count({ where: { value: { attributeId: req.params.id } } }),
    prisma.productAttributeValue.count({ where: { value: { attributeId: req.params.id } } }),
  ]);
  if (variantUse + specUse > 0) {
    throw new ApiError(400, 'Products still use this attribute, so it cannot be deleted');
  }

  await prisma.attribute.delete({ where: { id: req.params.id } });
  res.json({ message: 'Attribute deleted' });
});
