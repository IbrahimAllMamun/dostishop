'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { Product, Variant } from '@/lib/types';
import { formatTk, toNumber } from '@/lib/format';
import { useCart } from '@/store/cart';
import { useT } from '@/i18n/I18nProvider';
import { VariantPicker, attributeGroups, resolveVariant } from './VariantPicker';

export function variantLabel(v: Variant): string {
  return [v.size, v.color].filter(Boolean).join(' / ') || v.sku || 'Default';
}

/** Matches the `sheet-out` / `overlay fade-out` durations in tailwind.config.ts */
const EXIT_MS = 150;

/** Lightweight variant picker shown when a card can't add to cart unambiguously. */
export function QuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useT();
  const add = useCart((s) => s.add);
  const variants = product.variants ?? [];
  const groups = useMemo(() => attributeGroups(variants), [variants]);
  const [picked, setPicked] = useState<Record<string, string>>(() => {
    const seed = variants.find((v) => v.stockQty > 0) ?? variants[0];
    if (!seed) return {};
    return Object.fromEntries(
      (seed.attributes ?? []).map((a) => [a.value.attribute.slug, a.value.value]),
    );
  });
  const variant = useMemo(
    () => (groups.length ? resolveVariant(variants, groups, picked) : (variants[0] ?? null)),
    [variants, groups, picked],
  );
  const [mounted, setMounted] = useState(false);
  // The parent unmounts us on close, so the exit animation has to finish first
  const [closing, setClosing] = useState(false);

  useEffect(() => setMounted(true), []);

  const requestClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [requestClose]);

  if (!mounted) return null;

  const image = product.images?.[0]?.url;
  const price = toNumber(variant?.priceOverride ?? product.salePrice ?? product.basePrice);
  const outOfStock = variant ? variant.stockQty <= 0 : false;
  // Null variant = the shopper has not finished choosing; adding now would put
  // an item in the cart with no variant attached.
  const unresolved = groups.length > 0 && !variant;
  const cannotBuy = outOfStock || unresolved;

  function addToCart() {
    if (cannotBuy) return;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image,
      shopSlug: product.shop?.slug ?? '',
      shopName: product.shop?.name ?? '',
      variantId: variant?.id,
      variantLabel: variant ? variantLabel(variant) : undefined,
      unitPrice: price,
      quantity: 1,
      stockQty: variant?.stockQty,
    });
    requestClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        onClick={requestClose}
        aria-hidden
        className={`absolute inset-0 bg-ink/50 backdrop-blur-sm ${
          closing ? 'animate-fade-out' : 'animate-fade-in'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className={`relative w-[min(92vw,420px)] rounded-2xl bg-surface p-5 shadow-float ${
          closing ? 'animate-sheet-out' : 'animate-sheet-in'
        }`}
      >
        <div className="flex gap-4">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-24 w-24 rounded-xl object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-medium leading-snug">{product.name}</h3>
            <p className="mt-1 text-lg font-semibold">{formatTk(price)}</p>
            {product.shop && <p className="text-xs text-muted">{product.shop.name}</p>}
          </div>
          <button
            onClick={requestClose}
            aria-label={t('nav.close')}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-[background-color,color,transform] duration-200 ease-out hover:bg-sand hover:text-ink active:scale-90"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <VariantPicker
            variants={variants}
            groups={groups}
            picked={picked}
            onPick={(slug, value) => setPicked((p) => ({ ...p, [slug]: value }))}
            optionsLabel={t('product.options')}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={addToCart} disabled={cannotBuy} className="btn-primary flex-1">
            {outOfStock ? t('card.soldOut') : t('product.addToCart')}
          </button>
          <Link href={`/product/${product.slug}`} className="btn-outline whitespace-nowrap">
            {t('product.viewFull')}
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
