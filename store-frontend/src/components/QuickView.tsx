'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { Product, Variant } from '@/lib/types';
import { formatTk, toNumber } from '@/lib/format';
import { useCart } from '@/store/cart';
import { useT } from '@/i18n/I18nProvider';

export function variantLabel(v: Variant): string {
  return [v.size, v.color].filter(Boolean).join(' / ') || v.sku || 'Default';
}

/** Lightweight variant picker shown when a card can't add to cart unambiguously. */
export function QuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useT();
  const add = useCart((s) => s.add);
  const variants = product.variants ?? [];
  const [variant, setVariant] = useState<Variant | null>(
    variants.find((v) => v.stockQty > 0) ?? variants[0] ?? null,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  const image = product.images?.[0]?.url;
  const price = toNumber(variant?.priceOverride ?? product.salePrice ?? product.basePrice);
  const outOfStock = variant ? variant.stockQty <= 0 : false;

  function addToCart() {
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
    onClose();
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-5 shadow-2xl"
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
            onClick={onClose}
            aria-label={t('nav.close')}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-sand hover:text-ink"
          >
            ✕
          </button>
        </div>

        {variants.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">{t('product.options')}</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => {
                const selected = variant?.id === v.id;
                const disabled = v.stockQty <= 0;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v)}
                    disabled={disabled}
                    className={`min-h-11 rounded-full border px-4 text-sm transition ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-ink/15 text-ink hover:border-ink'
                    } ${disabled ? 'cursor-not-allowed opacity-40 line-through' : ''}`}
                  >
                    {variantLabel(v)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={addToCart} disabled={outOfStock} className="btn-primary flex-1">
            {outOfStock ? t('card.soldOut') : t('product.addToCart')}
          </button>
          <Link href={`/product/${product.slug}`} className="btn-outline whitespace-nowrap">
            {t('product.viewFull')}
          </Link>
        </div>
      </div>
    </>,
    document.body,
  );
}
