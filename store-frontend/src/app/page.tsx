import Link from 'next/link';
import Image from 'next/image';
import {
  getBanners,
  getBestSellers,
  getCategories,
  getPriceDrops,
  getProducts,
} from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { ProductRow } from '@/components/ProductRow';
import { getT } from '@/i18n/server';

export default async function HomePage() {
  const t = await getT();
  const [banners, categories, featured, latest, bestSellers, priceDrops] = await Promise.all([
    getBanners().catch(() => []),
    getCategories().catch(() => []),
    getProducts({ featured: true }).catch(() => ({ products: [], pagination: null as never })),
    getProducts({ sort: 'newest' }).catch(() => ({ products: [], pagination: null as never })),
    getBestSellers(10).catch(() => []),
    getPriceDrops(10).catch(() => []),
  ]);
  const hero = banners[0];

  return (
    <div className="container-x space-y-16 py-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-sand">
        {hero ? (
          <div className="relative h-[300px] w-full sm:h-[400px]">
            <Image
              src={hero.imageUrl}
              alt={hero.title ?? 'Featured'}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center gap-4 p-8 sm:p-14">
              <h1 className="max-w-md font-display text-4xl font-bold text-white sm:text-5xl">
                {hero.title ?? t('home.heroTitle')}
              </h1>
              <p className="max-w-sm text-white/85">{t('home.heroSubtitle')}</p>
              <div>
                <Link href={hero.linkUrl ?? '/products'} className="btn-primary">
                  {t('home.shopNow')}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 p-10 sm:p-16">
            <h1 className="font-display text-4xl font-bold sm:text-5xl">{t('home.heroTitle')}</h1>
            <p className="max-w-sm text-muted">{t('home.heroSubtitle')}</p>
            <Link href="/products" className="btn-primary">
              {t('home.shopNow')}
            </Link>
          </div>
        )}
      </section>

      {/* Categories (top-level only) */}
      {categories.length > 0 && (
        <section className="space-y-5">
          <h2 className="font-display text-2xl font-semibold">{t('home.shopByCategory')}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
            {categories
              .filter((c) => !c.parentId)
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/products?category=${c.slug}`}
                  className="card px-2 py-4 text-center transition hover:ring-primary/40"
                >
                  <span className="text-xs font-medium sm:text-sm">{c.name}</span>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.products.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold">{t('home.featured')}</h2>
            <Link href="/products" className="text-sm text-primary hover:underline">
              {t('home.viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {featured.products.slice(0, 10).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Best sellers — ranked by units actually sold */}
      <ProductRow
        title={t('home.bestSellers')}
        products={bestSellers}
        href="/products?sort=rating"
        viewAllLabel={t('home.viewAll')}
      />

      {/* Price drops — biggest discounts first */}
      <ProductRow
        title={t('home.priceDrops')}
        products={priceDrops}
        href="/products?sort=price_asc"
        viewAllLabel={t('home.viewAll')}
      />

      {/* Latest */}
      {latest.products.length > 0 && (
        <section className="space-y-5">
          <h2 className="font-display text-2xl font-semibold">{t('home.newArrivals')}</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {latest.products.slice(0, 10).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
