import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { slugify } from '../utils/helpers';
import { Prisma } from '@prisma/client';

// ---- Public ----

export const listProducts = asyncHandler(async (req, res) => {
  const {
    category,
    shop,
    search,
    featured,
    sort,
    page = '1',
    limit = '20',
  } = req.query as Record<string, string>;

  const take = Math.min(parseInt(limit, 10) || 20, 60);
  const currentPage = parseInt(page, 10) || 1;
  const skip = (currentPage - 1) * take;

  const where: Prisma.ProductWhereInput = { isActive: true, shop: { status: 'ACTIVE' } };
  if (category) where.category = { slug: category };
  if (shop) where.shop = { slug: shop, status: 'ACTIVE' };
  if (featured === 'true') where.isFeatured = true;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { basePrice: 'asc' };
  if (sort === 'price_desc') orderBy = { basePrice: 'desc' };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        shop: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    products,
    pagination: { page: currentPage, limit: take, total, pages: Math.ceil(total / take) },
  });
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, isActive: true },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
      shop: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
    },
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ product });
});

// ---- Vendor ----

async function getOwnShop(userId: string) {
  const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
  if (!shop) throw new ApiError(404, 'Shop not found');
  return shop;
}

async function requireActiveShop(userId: string) {
  const shop = await getOwnShop(userId);
  if (shop.status !== 'ACTIVE') throw new ApiError(403, 'Your shop is not active yet');
  return shop;
}

export const listMyProducts = asyncHandler(async (req, res) => {
  const shop = await getOwnShop(req.user!.sub);
  const products = await prisma.product.findMany({
    where: { shopId: shop.id },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, variants: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ products });
});

export const createProduct = asyncHandler(async (req, res) => {
  const shop = await requireActiveShop(req.user!.sub);
  const { name, description, brand, categoryId, basePrice, salePrice, isActive, isFeatured, images, variants } =
    req.body;

  let slug = slugify(name);
  if (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const product = await prisma.product.create({
    data: {
      shopId: shop.id,
      name,
      slug,
      description,
      brand,
      categoryId: categoryId ?? null,
      basePrice,
      salePrice: salePrice ?? null,
      isActive: isActive ?? true,
      isFeatured: isFeatured ?? false,
      images: images?.length
        ? {
            create: images.map((img: { url: string; alt?: string; sortOrder?: number }, i: number) => ({
              url: img.url,
              alt: img.alt,
              sortOrder: img.sortOrder ?? i,
            })),
          }
        : undefined,
      variants: variants?.length
        ? {
            create: variants.map(
              (v: {
                sku?: string;
                size?: string;
                color?: string;
                priceOverride?: number;
                stockQty?: number;
              }) => ({
                sku: v.sku,
                size: v.size,
                color: v.color,
                priceOverride: v.priceOverride ?? null,
                stockQty: v.stockQty ?? 0,
              }),
            ),
          }
        : undefined,
    },
    include: { images: true, variants: true },
  });

  res.status(201).json({ product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const shop = await requireActiveShop(req.user!.sub);
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.shopId !== shop.id) throw new ApiError(404, 'Product not found');

  const { name, description, brand, categoryId, basePrice, salePrice, isActive, isFeatured } = req.body;
  const data: Prisma.ProductUpdateInput = {
    description,
    brand,
    basePrice,
    salePrice,
    isActive,
    isFeatured,
  };
  if (name !== undefined) {
    data.name = name;
    data.slug = slugify(name);
  }
  if (categoryId !== undefined) {
    data.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
  }

  const product = await prisma.product.update({ where: { id: existing.id }, data });
  res.json({ product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const shop = await requireActiveShop(req.user!.sub);
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.shopId !== shop.id) throw new ApiError(404, 'Product not found');

  await prisma.product.delete({ where: { id: existing.id } });
  res.json({ message: 'Product deleted' });
});
