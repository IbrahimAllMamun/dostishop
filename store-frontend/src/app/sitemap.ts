import type { MetadataRoute } from 'next';
import { getCategories, getProducts, getShops } from '@/lib/api';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, shops, categories] = await Promise.all([
    getProducts({ page: 1 }).catch(() => ({ products: [], pagination: null as never })),
    getShops().catch(() => []),
    getCategories().catch(() => []),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/contact`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/faq`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/returns`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/track`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  return [
    ...staticPages,
    ...categories.map((c) => ({
      url: `${SITE}/products?category=${c.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...shops.map((s) => ({
      url: `${SITE}/shop/${s.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
    ...products.products.map((p) => ({
      url: `${SITE}/product/${p.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
