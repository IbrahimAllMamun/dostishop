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

export const createCategory = asyncHandler(async (req, res) => {
  const { name, parentId, imageUrl, sortOrder } = req.body;
  if (parentId) await assertValidParent(parentId);

  let slug = slugify(name);
  if (await prisma.category.findUnique({ where: { slug } })) {
    // Same name may exist under a different parent — keep the slug unique
    slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const category = await prisma.category.create({
    data: { name, slug, parentId: parentId ?? null, imageUrl, sortOrder: sortOrder ?? 0 },
  });
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req, res) => {
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

  const category = await prisma.category.update({ where: { id: req.params.id }, data });
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ message: 'Category deleted' });
});
