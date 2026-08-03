'use client';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Product, Variant } from '@/lib/types';
import { formatTk, toNumber } from '@/lib/format';
import { useCart } from '@/store/cart';
import { Stars } from './Stars';
import { useT } from '@/i18n/I18nProvider';
import { VariantPicker, attributeGroups, resolveVariant } from './VariantPicker';

function variantLabel(v: Variant): string {
  return [v.size, v.color].filter(Boolean).join(' / ') || v.sku || 'Default';
}

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const t = useT();
  const add = useCart((s) => s.add);

  const variants = product.variants ?? [];
  const groups = useMemo(() => attributeGroups(variants), [variants]);

  /** Spec values arrive flat; group them by attribute so each gets one row. */
  const specs = useMemo(() => {
    const byAttribute = new Map<string, { name: string; values: Array<{ value: string; hex: string | null }> }>();
    for (const { value } of product.specValues ?? []) {
      const { slug, name } = value.attribute;
      const row = byAttribute.get(slug) ?? { name, values: [] };
      row.values.push({ value: value.value, hex: value.color?.hexCode ?? null });
      byAttribute.set(slug, row);
    }
    return [...byAttribute.values()];
  }, [product.specValues]);

  // Pre-select the first in-stock variant's values so the page opens on a
  // valid, buyable combination rather than an empty picker.
  const [picked, setPicked] = useState<Record<string, string>>(() => {
    const seed = variants.find((v) => v.stockQty > 0) ?? variants[0];
    if (!seed) return {};
    return Object.fromEntries(
      (seed.attributes ?? []).map((a) => [a.value.attribute.slug, a.value.value]),
    );
  });

  const variant = useMemo(() => {
    // No attribute groups means a single implicit variant — use it directly
    if (!groups.length) return variants[0] ?? null;
    return resolveVariant(variants, groups, picked);
  }, [variants, groups, picked]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  const images = product.images ?? [];
  const price = toNumber(variant?.priceOverride ?? product.salePrice ?? product.basePrice);
  const hasSale =
    product.salePrice != null && toNumber(product.salePrice) < toNumber(product.basePrice);
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
      image: images[0]?.url,
      shopSlug: product.shop?.slug ?? '',
      shopName: product.shop?.name ?? '',
      variantId: variant?.id,
      variantLabel: variant ? variantLabel(variant) : undefined,
      unitPrice: price,
      quantity: qty,
      stockQty: variant?.stockQty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  function buyNow() {
    addToCart();
    router.push('/checkout');
  }

  return (
    <div className="container-x grid gap-10 py-8 lg:grid-cols-2">
      {/* Gallery */}
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-sand">
          {images[activeImg] && (
            <Image
              src={images[activeImg].url}
              alt={images[activeImg].alt ?? product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-3">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImg(i)}
                className={`relative h-20 w-20 overflow-hidden rounded-xl bg-sand ring-2 ${
                  i === activeImg ? 'ring-primary' : 'ring-transparent'
                }`}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-6">
        <div className="space-y-2">
          {product.shop && (
            <Link
              href={`/shop/${product.shop.slug}`}
              className="text-xs uppercase tracking-wide text-primary hover:underline"
            >
              {product.shop.name}
            </Link>
          )}
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{product.name}</h1>
          {(product.ratingCount ?? 0) > 0 && (
            <a href="#reviews" className="flex items-center gap-2 text-sm hover:underline">
              <Stars value={toNumber(product.ratingAvg)} />
              <span className="text-muted">
                {toNumber(product.ratingAvg).toFixed(1)} · {product.ratingCount} review
                {(product.ratingCount ?? 0) > 1 ? 's' : ''}
              </span>
            </a>
          )}
          {product.brand && (
            <p className="text-sm text-muted">
              {t('product.brand')}: {product.brand}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold text-ink">{formatTk(price)}</span>
          {hasSale && (
            <span className="text-lg text-muted line-through">{formatTk(product.basePrice)}</span>
          )}
        </div>

        {product.description && (
          <p className="leading-relaxed text-ink/80">{product.description}</p>
        )}

        {/* One picker per attribute — Size and Colour are separate choices,
            not a single list of pre-combined labels. */}
        <VariantPicker
          variants={variants}
          groups={groups}
          picked={picked}
          onPick={setPicked}
        />

        {/* Quantity */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center rounded-full border border-ink/15">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-4 py-2 text-lg"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center text-sm">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="px-4 py-2 text-lg"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          {variant && (
            <span className="text-sm text-muted">
              {variant.stockQty > 0
                ? `${variant.stockQty} ${t('product.inStock')}`
                : t('product.outOfStock')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={addToCart} disabled={cannotBuy} className="btn-outline">
            {added ? t('product.added') : t('product.addToCart')}
          </button>
          <button onClick={buyNow} disabled={cannotBuy} className="btn-primary">
            {t('product.buyNow')}
          </button>
        </div>

        {/* Specifications — facts about the product, grouped by attribute.
            One attribute can hold several values ("Features: Waterproof,
            Lightweight"), so each row joins its own. */}
        {specs.length > 0 && (
          <div className="border-t border-ink/10 pt-4">
            <h2 className="mb-2 text-sm font-medium">{t('product.specs')}</h2>
            <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {specs.map((spec) => (
                <div key={spec.name} className="flex justify-between gap-3 sm:justify-start">
                  <dt className="text-muted">{spec.name}</dt>
                  <dd className="flex flex-wrap items-center gap-1.5 font-medium">
                    {spec.values.map((v) => (
                      <span key={v.value} className="inline-flex items-center gap-1.5">
                        {v.hex && (
                          <span
                            aria-hidden
                            style={{ backgroundColor: v.hex }}
                            className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink/20"
                          />
                        )}
                        {v.value}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="rounded-2xl bg-sand/60 p-4 text-sm text-ink/70">
          {t('product.codBanner')}
        </div>
      </div>
    </div>
  );
}
