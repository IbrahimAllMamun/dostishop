'use client';
import Link from 'next/link';
import { useWishlist } from '@/store/wishlist';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { formatTk } from '@/lib/format';
import { useT } from '@/i18n/I18nProvider';

export default function WishlistPage() {
  const t = useT();
  const hydrated = useHasHydrated();
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);

  if (!hydrated) {
    return <div className="container-x py-20 text-center text-muted">…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-x py-20 text-center">
        <p className="text-4xl" aria-hidden>
          ♡
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold">{t('wishlist.empty')}</h1>
        <p className="mt-2 text-muted">{t('wishlist.emptyHint')}</p>
        <Link href="/products" className="btn-primary mt-6">
          {t('cart.startShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-x space-y-6 py-8">
      <h1 className="font-display text-3xl font-bold">
        {t('wishlist.title')} <span className="text-base font-normal text-muted">({items.length})</span>
      </h1>

      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((i) => (
          <div key={i.productId} className="group relative">
            <Link href={`/product/${i.slug}`} className="block">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-sand">
                {i.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={i.image}
                    alt={i.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="mt-2 space-y-0.5">
                {i.shopName && (
                  <p className="truncate text-[10px] uppercase tracking-wide text-muted">
                    {i.shopName}
                  </p>
                )}
                <h3 className="line-clamp-1 text-xs font-medium sm:text-sm">{i.name}</h3>
                <p className="text-sm font-semibold">{formatTk(i.price)}</p>
              </div>
            </Link>
            <button
              onClick={() => remove(i.productId)}
              aria-label={t('wishlist.remove')}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-surface/85 text-lg text-sale backdrop-blur transition hover:bg-surface"
            >
              ♥
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
