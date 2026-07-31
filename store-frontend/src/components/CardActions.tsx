'use client';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { toNumber } from '@/lib/format';
import { useCart } from '@/store/cart';
import { useWishlist } from '@/store/wishlist';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { useT } from '@/i18n/I18nProvider';
import { QuickView, variantLabel } from './QuickView';

/** Add-to-cart + wishlist directly on a product card.
 *  Products with more than one variant open Quick View so the shopper
 *  picks size/colour instead of us guessing. */
export function CardActions({ product }: { product: Product }) {
  const t = useT();
  const hydrated = useHasHydrated();
  const add = useCart((s) => s.add);
  const wishItems = useWishlist((s) => s.items);
  const toggleWish = useWishlist((s) => s.toggle);

  const [added, setAdded] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const variants = product.variants ?? [];
  const inStock = variants.length === 0 || variants.some((v) => v.stockQty > 0);
  const needsChoice = variants.length > 1;
  const price = toNumber(product.salePrice ?? product.basePrice);
  const saved = hydrated && wishItems.some((i) => i.productId === product.id);

  function onAdd(e: React.MouseEvent) {
    e.preventDefault(); // card is wrapped in a <Link>
    e.stopPropagation();
    if (!inStock) return;
    if (needsChoice) {
      setQuickOpen(true);
      return;
    }
    const v = variants[0];
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0]?.url,
      shopSlug: product.shop?.slug ?? '',
      shopName: product.shop?.name ?? '',
      variantId: v?.id,
      variantLabel: v ? variantLabel(v) : undefined,
      unitPrice: toNumber(v?.priceOverride ?? product.salePrice ?? product.basePrice),
      quantity: 1,
      stockQty: v?.stockQty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function onWish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWish({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0]?.url,
      price,
      shopName: product.shop?.name,
    });
  }

  return (
    <>
      {/* Wishlist heart — top-right of the image */}
      <button
        onClick={onWish}
        aria-label={saved ? t('card.saved') : t('card.save')}
        aria-pressed={saved}
        className="absolute right-1.5 top-1.5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-surface/85 text-base backdrop-blur transition hover:bg-surface"
      >
        <span className={saved ? 'text-sale' : 'text-ink/40'}>{saved ? '♥' : '♡'}</span>
      </button>

      {/* Add to cart / choose options — compact pill along the bottom of the image */}
      <button
        onClick={onAdd}
        disabled={!inStock}
        className="absolute inset-x-1.5 bottom-1.5 z-20 flex h-8 items-center justify-center truncate rounded-full bg-ink/90 px-2 text-[11px] font-medium leading-none text-white opacity-0 backdrop-blur transition hover:bg-primary focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:bg-ink/40 max-sm:opacity-100"
      >
        {!inStock
          ? t('card.soldOut')
          : added
            ? t('card.adding')
            : needsChoice
              ? t('card.choose')
              : t('card.add')}
      </button>

      {quickOpen && <QuickView product={product} onClose={() => setQuickOpen(false)} />}
    </>
  );
}
