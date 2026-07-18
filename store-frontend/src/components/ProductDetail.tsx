'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Product, Variant } from '@/lib/types';
import { formatTk, toNumber } from '@/lib/format';
import { useCart } from '@/store/cart';
import { Stars } from './Stars';

function variantLabel(v: Variant): string {
  return [v.size, v.color].filter(Boolean).join(' / ') || v.sku || 'Default';
}

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const add = useCart((s) => s.add);

  const variants = product.variants ?? [];
  const [variant, setVariant] = useState<Variant | null>(variants[0] ?? null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  const images = product.images ?? [];
  const price = toNumber(variant?.priceOverride ?? product.salePrice ?? product.basePrice);
  const hasSale =
    product.salePrice != null && toNumber(product.salePrice) < toNumber(product.basePrice);
  const outOfStock = variant ? variant.stockQty <= 0 : false;

  function addToCart() {
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
          {product.brand && <p className="text-sm text-muted">Brand: {product.brand}</p>}
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

        {/* Variants */}
        {variants.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Options</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => {
                const selected = variant?.id === v.id;
                const disabled = v.stockQty <= 0;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v)}
                    disabled={disabled}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
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
              {variant.stockQty > 0 ? `${variant.stockQty} in stock` : 'Out of stock'}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={addToCart} disabled={outOfStock} className="btn-outline">
            {added ? 'Added ✓' : 'Add to cart'}
          </button>
          <button onClick={buyNow} disabled={outOfStock} className="btn-primary">
            Buy now
          </button>
        </div>

        <div className="rounded-2xl bg-sand/60 p-4 text-sm text-ink/70">
          🚚 Cash on delivery available · Ships in 2–5 days across Bangladesh
        </div>
      </div>
    </div>
  );
}
