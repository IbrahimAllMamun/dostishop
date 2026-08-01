import { Request } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { slugify } from '../utils/helpers';
import { Prisma } from '@prisma/client';

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.json({ categories });
});

/** Tree is capped at two levels: a subcategory's parent must be top-level. */
async function assertValidParent(parentId: string) {
  const parent = await prisma.category.findUnique({ where: { id: parentId } });
  if (!parent) throw new ApiError(404, 'Parent category not found');
  if (parent.parentId) throw new ApiError(400, 'Subcategories cannot have their own subcategories');
  return parent;
}

/**
 * Who may mutate a category:
 *   SUPER_ADMIN — always.
 *   VENDOR      — only the one who created it, and only until an admin has
 *                 curated it (`adminLocked`). After that it belongs to the platform.
 */
async function assertCanMutate(req: Request, id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new ApiError(404, 'Category not found');
  if (req.user?.role === 'SUPER_ADMIN') return category;

  if (!category.createdById || category.createdById !== req.user?.sub) {
    throw new ApiError(403, 'You can only change categories you created');
  }
  if (category.adminLocked) {
    throw new ApiError(403, 'This category is now managed by the platform admin');
  }
  return category;
}

export const createCategory = asyncHandler(async (req, res) => {
  const { name, parentId, imageUrl, sortOrder } = req.body;
  if (parentId) await assertValidParent(parentId);

  let slug = slugify(name);
  if (await prisma.category.findUnique({ where: { slug } })) {
    // Same name may exist under a different parent — keep the slug unique
    slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      parentId: parentId ?? null,
      imageUrl,
      sortOrder: sortOrder ?? 0,
      // Admin-created categories are platform-owned from the start (null owner)
      createdById: req.user?.role === 'VENDOR' ? req.user.sub : null,
    },
  });
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const existing = await assertCanMutate(req, req.params.id);
  const { name, parentId, imageUrl, sortOrder } = req.body;
  const data: Prisma.CategoryUpdateInput = {};
  if (name !== undefined) {
    data.name = name;
    data.slug = slugify(name);
  }
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (parentId !== undefined) {
    if (parentId) {
      if (parentId === req.params.id) throw new ApiError(400, 'A category cannot be its own parent');
      await assertValidParent(parentId);
      const childCount = await prisma.category.count({ where: { parentId: req.params.id } });
      if (childCount > 0) {
        throw new ApiError(400, 'This category has subcategories, so it must stay top-level');
      }
    }
    data.parent = parentId ? { connect: { id: parentId } } : { disconnect: true };
  }

  // An admin curating a vendor's category takes it over for good. Reordering
  // alone is housekeeping, not curation, so it does not lock the category.
  const isCuration = name !== undefined || parentId !== undefined || imageUrl !== undefined;
  if (req.user?.role === 'SUPER_ADMIN' && existing.createdById && !existing.adminLocked && isCuration) {
    data.adminLocked = true;
  }

  const category = await prisma.category.update({ where: { id: req.params.id }, data });
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await assertCanMutate(req, req.params.id);

  if (req.user?.role === 'VENDOR') {
    // A vendor's category is shared platform-wide the moment it exists, so they
    // may only remove it while nobody else has come to depend on it.
    const [foreignProducts, children] = await Promise.all([
      prisma.product.count({
        where: { categoryId: req.params.id, shopId: { not: req.user.shopId ?? '' } },
      }),
      prisma.category.count({ where: { parentId: req.params.id } }),
    ]);
    if (foreignProducts > 0) {
      throw new ApiError(400, 'Other shops have products in this category, so it cannot be deleted');
    }
    if (children > 0) {
      throw new ApiError(400, 'Remove its subcategories first');
    }
  }

  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ message: 'Category deleted' });
});
