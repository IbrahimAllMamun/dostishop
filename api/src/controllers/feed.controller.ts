import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/\s+/g, ' ').trim();
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Meta (Facebook/Instagram) product catalog feed.
 *  Point Commerce Manager's scheduled feed at this URL. */
export const facebookFeed = asyncHandler(async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { isActive: true, shop: { status: 'ACTIVE' } },
    include: {
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      variants: true,
      shop: { select: { name: true } },
    },
  });

  const lines = ['id,title,description,availability,condition,price,link,image_link,brand'];
  for (const p of products) {
    const image = p.images[0]?.url;
    if (!image) continue; // Meta requires an image
    const inStock =
      p.variants.length === 0 || p.variants.some((v) => v.stockQty > 0);
    const price = Number(p.salePrice ?? p.basePrice).toFixed(2);
    lines.push(
      [
        p.id,
        p.name,
        p.description ?? p.name,
        inStock ? 'in stock' : 'out of stock',
        'new',
        `${price} BDT`,
        `${env.STORE_PUBLIC_URL}/product/${p.slug}`,
        image,
        p.brand ?? p.shop.name,
      ]
        .map(esc)
        .join(','),
    );
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(lines.join('\n'));
});
