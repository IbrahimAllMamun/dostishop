import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { slugify } from '../utils/helpers';

// CSV format (Shopify-style): one row per variant; consecutive rows with the
// same "name" belong to one product. image_urls (| separated) read from the
// first row of each product.
const HEADERS = [
  'name',
  'description',
  'brand',
  'category_slug',
  'base_price',
  'sale_price',
  'is_active',
  'image_urls',
  'size',
  'color',
  'stock',
  'price_override',
] as const;

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Minimal RFC-4180 CSV parser (handles quoted fields, "" escapes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

async function getActiveShop(userId: string) {
  const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
  if (!shop) throw new ApiError(404, 'Shop not found');
  if (shop.status !== 'ACTIVE') throw new ApiError(403, 'Your shop is not active yet');
  return shop;
}

export const exportMyProducts = asyncHandler(async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: req.user!.sub } });
  if (!shop) throw new ApiError(404, 'Shop not found');

  const products = await prisma.product.findMany({
    where: { shopId: shop.id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
      category: { select: { slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const lines: string[] = [HEADERS.join(',')];
  for (const p of products) {
    const base = [
      p.name,
      p.description ?? '',
      p.brand ?? '',
      p.category?.slug ?? '',
      Number(p.basePrice),
      p.salePrice != null ? Number(p.salePrice) : '',
      p.isActive ? 'true' : 'false',
    ];
    const images = p.images.map((im) => im.url).join('|');
    const variants = p.variants.length ? p.variants : [null];
    variants.forEach((v, i) => {
      lines.push(
        [
          ...base,
          i === 0 ? images : '',
          v?.size ?? '',
          v?.color ?? '',
          v?.stockQty ?? 0,
          v?.priceOverride != null ? Number(v.priceOverride) : '',
        ]
          .map(csvEscape)
          .join(','),
      );
    });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
  res.send(lines.join('\n'));
});

export const importMyProducts = asyncHandler(async (req, res) => {
  const shop = await getActiveShop(req.user!.sub);
  const { csv } = req.body as { csv: string };
  if (!csv || typeof csv !== 'string') throw new ApiError(400, 'Provide CSV text in { csv }');

  const rows = parseCsv(csv);
  if (rows.length < 2) throw new ApiError(400, 'CSV has no data rows');
  if (rows.length > 501) throw new ApiError(400, 'Max 500 rows per import');

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: (typeof HEADERS)[number]) => header.indexOf(name);
  if (col('name') === -1 || col('base_price') === -1) {
    throw new ApiError(400, 'CSV must include at least "name" and "base_price" columns');
  }

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  // Group consecutive data rows by product name
  interface Group {
    firstRow: number;
    cells: string[][];
  }
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastName = '';
  rows.slice(1).forEach((cells, i) => {
    const name = (cells[col('name')] ?? '').trim();
    if (!name) return;
    if (!current || name !== lastName) {
      current = { firstRow: i + 2, cells: [] };
      groups.push(current);
      lastName = name;
    }
    current.cells.push(cells);
  });

  const errors: Array<{ row: number; message: string }> = [];
  let created = 0;

  for (const g of groups) {
    const first = g.cells[0];
    const get = (name: (typeof HEADERS)[number], cells: string[] = first) => {
      const idx = col(name);
      return idx === -1 ? '' : (cells[idx] ?? '').trim();
    };

    try {
      const name = get('name');
      const basePrice = Number(get('base_price'));
      if (!name || !Number.isFinite(basePrice) || basePrice <= 0) {
        throw new Error('Invalid name or base_price');
      }
      const salePriceRaw = get('sale_price');
      const categorySlug = get('category_slug');

      let slug = slugify(name);
      if (await prisma.product.findUnique({ where: { slug } })) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const variants = g.cells
        .map((cells) => ({
          size: get('size', cells) || null,
          color: get('color', cells) || null,
          stockQty: Number(get('stock', cells)) || 0,
          priceOverride: get('price_override', cells) ? Number(get('price_override', cells)) : null,
        }))
        .filter((v) => v.size || v.color || v.stockQty > 0);

      await prisma.product.create({
        data: {
          shopId: shop.id,
          name,
          slug,
          description: get('description') || null,
          brand: get('brand') || null,
          categoryId: categorySlug ? (catBySlug.get(categorySlug) ?? null) : null,
          basePrice,
          salePrice: salePriceRaw ? Number(salePriceRaw) : null,
          isActive: get('is_active') !== 'false',
          images: get('image_urls')
            ? {
                create: get('image_urls')
                  .split('|')
                  .map((u) => u.trim())
                  .filter(Boolean)
                  .slice(0, 8)
                  .map((url, i) => ({ url, sortOrder: i })),
              }
            : undefined,
          variants: variants.length ? { create: variants } : undefined,
        },
      });
      created++;
    } catch (e) {
      errors.push({ row: g.firstRow, message: e instanceof Error ? e.message : 'Failed' });
    }
  }

  res.json({ created, failed: errors.length, errors: errors.slice(0, 20) });
});
