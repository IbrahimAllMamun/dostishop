'use client';
import Link from 'next/link';
import { useCart } from '@/store/cart';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { useT } from '@/i18n/I18nProvider';

export function CartButton() {
  const t = useT();
  const hydrated = useHasHydrated();
  const items = useCart((s) => s.items);
  const count = hydrated ? items.reduce((n, i) => n + i.quantity, 0) : 0;

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-primary"
    >
      <span>{t('nav.cart')}</span>
      {count > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-semibold text-ink">
          {count}
        </span>
      )}
    </Link>
  );
}
