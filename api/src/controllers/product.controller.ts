import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { slugify } from '../utils/helpers';
import { Prisma } from '@prisma/client';

// ---- Public ----

const productListInclude = {
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
  shop: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  // Lightweight variant data so listing cards can add to cart / show stock
  variants: {
    select: {
      id: true,
      size: true,
      color: true,
      stockQty: true,
      priceOverride: true,
      attributes: {
        select: {
          value: { select: { id: true, value: true, attribute: { select: { name: true, slug: true } } } },
        },
        orderBy: { value: { attribute: { sortOrder: 'asc' as const } } },
      },
    },
  },
};

const PUBLIC_SCOPE: Prisma.ProductWhereInput = {
  isActive: true,
  shop: { status: 'ACTIVE' },
};

/** Fetch products by id, preserving the given order. */
async function productsInOrder(ids: string[]) {
  if (!ids.length) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, ...PUBLIC_SCOPE },
    include: productListInclude,
  });
  const rank = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

/** Category filter that includes the category's subcategories. */
async function categoryScope(slug: string): Promise<Prisma.ProductWhereInput> {
  const cat = await prisma.category.findUnique({
    where: { slug },
    include: { children: { select: { id: true } } },
  });
  if (!cat) return { categoryId: '__none__' }; // unknown slug -> no results
  return { categoryId: { in: [cat.id, ...cat.children.map((c) => c.id)] } };
}

/** Typo-tolerant search over name + brand; returns ids ranked by relevance.
 *  word_similarity matches the query against the best-matching part of the name,
 *  so "bakpack" still finds "Urban Travel Backpack". */
async function searchProductIds(term: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Product"
    WHERE "isActive" = true AND (
      "name" ILIKE '%' || ${term} || '%'
      OR coalesce("brand", '') ILIKE '%' || ${term} || '%'
      OR word_similarity(${term}, "name") > 0.35
      OR word_similarity(${term}, coalesce("brand", '')) > 0.35
    )
    ORDER BY GREATEST(
      word_similarity(${term}, "name"),
      similarity("name", ${term}),
      word_similarity(${term}, coalesce("brand", ''))
    ) DESC
    LIMIT 200`;
  return rows.map((r) => r.id);
}

export const listProducts = asyncHandler(async (req, res) => {
  const {
    category,
    shop,
    search,
    featured,
    sort,
    page = '1',
    limit = '20',
    minPrice,
    maxPrice,
    brand,
    size,
    color,
    inStock,
    minRating,
  } = req.query as Record<string, string>;

  const take = Math.min(parseInt(limit, 10) || 20, 60);
  const currentPage = parseInt(page, 10) || 1;
  const skip = (currentPage - 1) * take;

  const where: Prisma.ProductWhereInput = { isActive: true, shop: { status: 'ACTIVE' } };
  if (category) Object.assign(where, await categoryScope(category));
  if (shop) where.shop = { slug: shop, status: 'ACTIVE' };
  if (featured === 'true') where.isFeatured = true;
  if (brand) where.brand = { in: brand.split(',') };
  if (minRating) where.ratingAvg = { gte: Number(minRating) };

  // Effective price = salePrice ?? basePrice
  if (minPrice || maxPrice) {
    const gte = minPrice ? Number(minPrice) : undefined;
    const lte = maxPrice ? Number(maxPrice) : undefined;
    where.OR = [
      { salePrice: { not: null, gte, lte } },
      { salePrice: null, basePrice: { gte, lte } },
    ];
  }

  // Variant-level facets
  const variantFilter: Prisma.ProductVariantWhereInput = {};
  if (size) variantFilter.size = { in: size.split(',') };
  if (color) variantFilter.color = { in: color.split(',') };
  if (inStock === 'true') variantFilter.stockQty = { gt: 0 };
  if (Object.keys(variantFilter).length) where.variants = { some: variantFilter };

  // Typo-tolerant search (pg_trgm), ranked by similarity
  let rankedIds: string[] | null = null;
  if (search) {
    rankedIds = await searchProductIds(search);
    where.id = { in: rankedIds };
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput | undefined = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { basePrice: 'asc' };
  if (sort === 'price_desc') orderBy = { basePrice: 'desc' };
  if (sort === 'rating') orderBy = { ratingAvg: 'desc' };
  const useRelevance = rankedIds !== null && !sort;

  let products;
  let total: number;

  if (useRelevance) {
    // Fetch all matches (capped at 200 upstream), order by search rank, paginate in memory
    const all = await prisma.product.findMany({ where, include: productListInclude });
    const rank = new Map(rankedIds!.map((id, i) => [id, i]));
    all.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
    total = all.length;
    products = all.slice(skip, skip + take);
  } else {
    [products, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, take, skip, include: productListInclude }),
      prisma.product.count({ where }),
    ]);
  }

  // Log searches for merchandising insight (fire-and-forget)
  if (search) {
    prisma.searchQuery.create({ data: { term: search, results: total } }).catch(() => {});
  }

  res.json({
    products,
    pagination: { page: currentPage, limit: take, total, pages: Math.ceil(total / take) },
  });
});

/** Facet options (brands, sizes, colors, price range) for the current scope. */
export const getFacets = asyncHandler(async (req, res) => {
  const { category, shop } = req.query as Record<string, string>;
  const where: Prisma.ProductWhereInput = { isActive: true, shop: { status: 'ACTIVE' } };
  if (category) Object.assign(where, await categoryScope(category));
  if (shop) where.shop = { slug: shop, status: 'ACTIVE' };

  const [brandRows, variantRows, priceAgg] = await Promise.all([
    prisma.product.findMany({ where, distinct: ['brand'], select: { brand: true } }),
    prisma.productVariant.findMany({
      where: { product: where },
      distinct: ['size', 'color'],
      select: { size: true, color: true },
    }),
    prisma.product.aggregate({ where, _min: { basePrice: true }, _max: { basePrice: true } }),
  ]);

  const brands = [...new Set(brandRows.map((b) => b.brand).filter(Boolean))] as string[];
  const sizes = [...new Set(variantRows.map((v) => v.size).filter(Boolean))] as string[];
  const colors = [...new Set(variantRows.map((v) => v.color).filter(Boolean))] as string[];

  res.json({
    brands: brands.sort(),
    sizes: sizes.sort(),
    colors: colors.sort(),
    priceMin: Number(priceAgg._min.basePrice ?? 0),
    priceMax: Number(priceAgg._max.basePrice ?? 0),
  });
});

/** Autocomplete: top matches with thumbnail + price. */
export const suggestProducts = asyncHandler(async (req, res) => {
  const q = ((req.query.q as string) ?? '').trim();
  if (q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }
  const ids = (await searchProductIds(q)).slice(0, 6);
  if (!ids.length) {
    res.json({ suggestions: [] });
    return;
  }
  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, shop: { status: 'ACTIVE' } },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  });
  const rank = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => (rank.get(a.id) ?? 9) - (rank.get(b.id) ?? 9));
  res.json({
    suggestions: rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.images[0]?.url ?? null,
      price: Number(p.salePrice ?? p.basePrice),
    })),
  });
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, isActive: true },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { include: { attributes: {
        select: {
          value: { select: { id: true, value: true, attribute: { select: { name: true, slug: true } } } },
        },
        orderBy: { value: { attribute: { sortOrder: 'asc' as const } } },
      } } },
      shop: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
    },
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ product });
});

/** Best sellers — ranked by units actually sold (cancelled sub-orders excluded). */
export const getBestSellers = asyncHandler(async (req, res) => {
  const take = Math.min(Number(req.query.limit) || 10, 30);
  const rows = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { subOrder: { status: { not: 'CANCELLED' } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: take * 3, // over-fetch: some may be inactive/suspended
  });
  const products = (await productsInOrder(rows.map((r) => r.productId))).slice(0, take);
  const sold = new Map(rows.map((r) => [r.productId, r._sum.quantity ?? 0]));
  res.json({ products: products.map((p) => ({ ...p, unitsSold: sold.get(p.id) ?? 0 })) });
});

/** Price drops — biggest percentage discount first. */
export const getPriceDrops = asyncHandler(async (req, res) => {
  const take = Math.min(Number(req.query.limit) || 10, 30);
  const rows = await prisma.product.findMany({
    where: { ...PUBLIC_SCOPE, salePrice: { not: null } },
    include: productListInclude,
    take: 60,
    orderBy: { updatedAt: 'desc' },
  });
  const withDiscount = rows
    .map((p) => {
      const base = Number(p.basePrice);
      const sale = Number(p.salePrice);
      return { product: p, pct: base > 0 ? (base - sale) / base : 0 };
    })
    .filter((x) => x.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, take);
  res.json({
    products: withDiscount.map((x) => ({ ...x.product, discountPct: Math.round(x.pct * 100) })),
  });
});

/** Related products: "customers also bought" from real basket co-occurrence,
 *  topped up with same-category items when there isn't enough order history. */
export const getRelatedProducts = asyncHandler(async (req, res) => {
  const take = Math.min(Number(req.query.limit) || 8, 20);
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    select: { id: true, categoryId: true, shopId: true },
  });
  if (!product) throw new ApiError(404, 'Product not found');

  // Orders that contained this product
  const containing = await prisma.orderItem.findMany({
    where: { productId: product.id },
    select: { subOrder: { select: { orderId: true } } },
    take: 300,
  });
  const orderIds = [...new Set(containing.map((c) => c.subOrder.orderId))];

  let ids: string[] = [];
  if (orderIds.length) {
    const co = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { subOrder: { orderId: { in: orderIds } }, productId: { not: product.id } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: take * 2,
    });
    ids = co.map((c) => c.productId);
  }

  let products = await productsInOrder(ids);

  // Degrade gracefully so the row is never empty: same category -> same shop ->
  // top rated overall. Products can legitimately have no category (a category
  // may have been deleted), so category alone is not a safe fallback.
  const fallbacks: Prisma.ProductWhereInput[] = [
    ...(product.categoryId ? [{ categoryId: product.categoryId }] : []),
    { shopId: product.shopId },
    {},
  ];

  for (const scope of fallbacks) {
    if (products.length >= take) break;
    const exclude = [product.id, ...products.map((p) => p.id)];
    const fill = await prisma.product.findMany({
      where: { ...PUBLIC_SCOPE, ...scope, id: { notIn: exclude } },
      include: productListInclude,
      take: take - products.length,
      orderBy: [{ ratingAvg: 'desc' }, { createdAt: 'desc' }],
    });
    products = [...products, ...fill];
  }

  res.json({ products: products.slice(0, take) });
});

/** Brands with product counts — powers brand landing pages and the brand index. */
export const listBrands = asyncHandler(async (_req, res) => {
  const rows = await prisma.product.groupBy({
    by: ['brand'],
    where: { ...PUBLIC_SCOPE, brand: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { brand: 'desc' } },
  });
  res.json({
    brands: rows
      .filter((r) => r.brand)
      .map((r) => ({ name: r.brand as string, count: r._count._all })),
  });
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
    },
    include: { images: true, variants: true },
  });

  // Variants are created after the product so each one's id is available for
  // its attribute links (a nested `create` would not hand them back).
  if (variants?.length) {
    const incoming = variants as VariantInput[];
    const valueMap = await loadAttributeValues(incoming);
    for (const v of incoming) {
      const { size, color } = denormalise(v, valueMap);
      const created = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          size,
          color,
          priceOverride: v.priceOverride ?? null,
          stockQty: v.stockQty ?? 0,
        },
      });
      if (v.attributeValueIds?.length) {
        await prisma.variantAttribute.createMany({
          data: v.attributeValueIds.map((valueId) => ({ variantId: created.id, valueId })),
          skipDuplicates: true,
        });
      }
    }
  }

  res.status(201).json({
    product: await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { images: true, variants: true },
    }),
  });
});

export const getMyProduct = asyncHandler(async (req, res) => {
  const shop = await getOwnShop(req.user!.sub);
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, shopId: shop.id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { include: { attributes: { select: { valueId: true } } } },
    },
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ product });
});

interface VariantInput {
  id?: string;
  sku?: string;
  size?: string;
  color?: string;
  attributeValueIds?: string[];
  priceOverride?: number;
  stockQty?: number;
}

/**
 * Resolve the attribute values a batch of variants references, once per
 * request rather than once per variant.
 */
async function loadAttributeValues(variants: VariantInput[]) {
  const ids = [...new Set(variants.flatMap((v) => v.attributeValueIds ?? []))];
  if (!ids.length) return new Map<string, { id: string; value: string; slug: string }>();

  const rows = await prisma.attributeValue.findMany({
    where: { id: { in: ids } },
    include: { attribute: { select: { slug: true } } },
  });
  if (rows.length !== ids.length) {
    throw new ApiError(400, 'One or more selected attribute values no longer exist');
  }
  return new Map(rows.map((r) => [r.id, { id: r.id, value: r.value, slug: r.attribute.slug }]));
}

/**
 * `size` and `color` stay on the row as denormalised copies — checkout labels,
 * CSV export and the storefront facets read them directly. When a variant is
 * defined by attribute values, they are derived from those; otherwise the
 * free-text input is kept (CSV import path).
 */
function denormalise(
  v: VariantInput,
  values: Map<string, { value: string; slug: string }>,
): { size: string | null; color: string | null } {
  if (!v.attributeValueIds?.length) {
    return { size: v.size ?? null, color: v.color ?? null };
  }
  const picked = v.attributeValueIds.map((id) => values.get(id)!).filter(Boolean);
  return {
    size: picked.find((p) => p.slug === 'size')?.value ?? null,
    color: picked.find((p) => p.slug === 'color')?.value ?? null,
  };
}

export const updateProduct = asyncHandler(async (req, res) => {
  const shop = await requireActiveShop(req.user!.sub);
  const existing = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { variants: true },
  });
  if (!existing || existing.shopId !== shop.id) throw new ApiError(404, 'Product not found');

  const { name, description, brand, categoryId, basePrice, salePrice, isActive, isFeatured, images, variants } =
    req.body;

  // Resolved BEFORE the transaction opens. It is a plain read, and running it
  // inside the callback issued a query on the global client while the
  // transaction held a connection — against a remote database that reliably
  // blew Prisma's 5s interactive-transaction timeout.
  const valueMap = await loadAttributeValues((variants ?? []) as VariantInput[]);

  const product = await prisma.$transaction(async (tx) => {
    const data: Prisma.ProductUpdateInput = {
      description,
      brand,
      basePrice,
      salePrice,
      isActive,
      isFeatured,
    };
    // Keep the slug stable across edits so product URLs don't break
    if (name !== undefined) data.name = name;
    if (categoryId !== undefined) {
      data.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
    }
    await tx.product.update({ where: { id: existing.id }, data });

    // Replace images if provided
    if (images !== undefined) {
      await tx.productImage.deleteMany({ where: { productId: existing.id } });
      if (images.length) {
        await tx.productImage.createMany({
          data: (images as Array<{ url: string; alt?: string; sortOrder?: number }>).map(
            (img, i) => ({
              productId: existing.id,
              url: img.url,
              alt: img.alt,
              sortOrder: img.sortOrder ?? i,
            }),
          ),
        });
      }
    }

    // Sync variants if provided: update kept, create new, remove missing
    if (variants !== undefined) {
      const incoming = variants as VariantInput[];
      const keepIds = incoming.filter((v) => v.id).map((v) => v.id as string);
      const removeIds = existing.variants
        .filter((v) => !keepIds.includes(v.id))
        .map((v) => v.id);

      if (removeIds.length) {
        // Detach from past order items (keep order history), then delete
        await tx.orderItem.updateMany({
          where: { variantId: { in: removeIds } },
          data: { variantId: null },
        });
        await tx.productVariant.deleteMany({ where: { id: { in: removeIds } } });
      }

      for (const v of incoming) {
        const { size, color } = denormalise(v, valueMap);
        let variantId: string;

        if (v.id) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              size,
              color,
              sku: v.sku ?? null,
              priceOverride: v.priceOverride ?? null,
              stockQty: v.stockQty ?? 0,
            },
          });
          variantId = v.id;
        } else {
          const created = await tx.productVariant.create({
            data: {
              productId: existing.id,
              size,
              color,
              sku: v.sku,
              priceOverride: v.priceOverride ?? null,
              stockQty: v.stockQty ?? 0,
            },
          });
          variantId = created.id;
        }

        // Replace the link set wholesale — simpler and safer than diffing, and
        // it is at most a handful of rows per variant.
        if (v.attributeValueIds) {
          await tx.variantAttribute.deleteMany({ where: { variantId } });
          if (v.attributeValueIds.length) {
            await tx.variantAttribute.createMany({
              data: v.attributeValueIds.map((valueId) => ({ variantId, valueId })),
              skipDuplicates: true,
            });
          }
        }
      }
    }

    return tx.product.findUniqueOrThrow({
      where: { id: existing.id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { include: { attributes: { select: { valueId: true } } } },
      },
    });
  },
  {
    // A product with several variants issues a dozen sequential round trips,
    // and the database is remote. Prisma's 5s default is not enough headroom.
    timeout: 20_000,
    maxWait: 10_000,
  });

  res.json({ product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const shop = await requireActiveShop(req.user!.sub);
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.shopId !== shop.id) throw new ApiError(404, 'Product not found');

  await prisma.product.delete({ where: { id: existing.id } });
  res.json({ message: 'Product deleted' });
});
