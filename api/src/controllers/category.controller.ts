import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { slugify } from '../utils/helpers';
import { Prisma } from '@prisma/client';

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({ categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, parentId, imageUrl, sortOrder } = req.body;
  const category = await prisma.category.create({
    data: {
      name,
      slug: slugify(name),
      parentId: parentId ?? null,
      imageUrl,
      sortOrder: sortOrder ?? 0,
    },
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
    data.parent = parentId ? { connect: { id: parentId } } : { disconnect: true };
  }

  const category = await prisma.category.update({ where: { id: req.params.id }, data });
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ message: 'Category deleted' });
});
