'use client';
import Link from 'next/link';
import { useWishlist } from '@/store/wishlist';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { useT } from '@/i18n/I18nProvider';

export function WishlistButton() {
  const t = useT();
  const hydrated = useHasHydrated();
  const items = useWishlist((s) => s.items);
  const count = hydrated ? items.length : 0;

  return (
    <Link
      href="/wishlist"
      aria-label={t('nav.wishlist')}
      className="relative flex h-11 w-11 items-center justify-center rounded-full text-lg text-ink transition hover:bg-sand"
    >
      <span aria-hidden>{count > 0 ? '♥' : '♡'}</span>
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
