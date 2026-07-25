import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { formatTk, toNumber } from '@/lib/format';
import { Stars } from './Stars';

export function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0]?.url;
  const hasSale =
    product.salePrice != null && toNumber(product.salePrice) < toNumber(product.basePrice);

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-sand">
        {img && (
          <Image
            src={img}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {hasSale && (
          <span className="absolute left-2 top-2 rounded-full bg-sale px-1.5 py-0.5 text-[10px] font-medium text-white">
            Sale
          </span>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
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
          <span className="text-sm font-semibold text-ink">
            {formatTk(hasSale ? product.salePrice : product.basePrice)}
          </span>
          {hasSale && (
            <span className="text-xs text-muted line-through">{formatTk(product.basePrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
