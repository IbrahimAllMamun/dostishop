import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { formatTk, toNumber } from '@/lib/format';
import { Stars } from './Stars';
import { CardActions } from './CardActions';

export function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0]?.url;
  const base = toNumber(product.basePrice);
  const sale = product.salePrice != null ? toNumber(product.salePrice) : null;
  const hasSale = sale != null && sale < base;
  const savings = hasSale ? base - sale : 0;
  const href = `/product/${product.slug}`;

  return (
    <div className="group">
      {/* Image box is its own positioning context so the overlay controls
          (wishlist, add-to-cart) sit inside the image, not below the card. */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-sand transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-lift">
        {img && (
          <Image
            src={img}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        )}

        {/* Full-bleed link behind the controls — keeps buttons out of the <a> */}
        <Link href={href} className="absolute inset-0" aria-label={product.name} />

        {hasSale && (
          <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-sale px-2 py-0.5 text-[10px] font-semibold text-white">
            −{formatTk(savings)}
          </span>
        )}

        <CardActions product={product} />
      </div>

      <Link
        href={href}
        className="mt-2 block space-y-0.5 transition-colors duration-200 ease-out group-hover:[&_h3]:text-primary"
      >
        {product.shop && (
          <p className="truncate text-[10px] uppercase tracking-wide text-muted">
            {product.shop.name}
          </p>
        )}
        <h3 className="line-clamp-1 text-xs font-medium text-ink sm:text-sm">{product.name}</h3>
        {(product.ratingCount ?? 0) > 0 && (
          <p className="flex items-center gap-1 text-[10px]">
            <Stars value={toNumber(product.ratingAvg)} />
            <span className="text-muted">({product.ratingCount})</span>
          </p>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-ink">{formatTk(hasSale ? sale : base)}</span>
          {hasSale && <span className="text-xs text-muted line-through">{formatTk(base)}</span>}
        </div>
      </Link>
    </div>
  );
}
