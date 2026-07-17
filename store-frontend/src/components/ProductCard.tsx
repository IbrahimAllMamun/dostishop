import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { formatTk, toNumber } from '@/lib/format';

export function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0]?.url;
  const hasSale =
    product.salePrice != null && toNumber(product.salePrice) < toNumber(product.basePrice);

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-sand">
        {img && (
          <Image
            src={img}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {hasSale && (
          <span className="absolute left-3 top-3 rounded-full bg-sale px-2 py-1 text-xs font-medium text-white">
            Sale
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        {product.shop && (
          <p className="text-xs uppercase tracking-wide text-muted">{product.shop.name}</p>
        )}
        <h3 className="line-clamp-1 text-sm font-medium text-ink">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">
            {formatTk(hasSale ? product.salePrice : product.basePrice)}
          </span>
          {hasSale && (
            <span className="text-sm text-muted line-through">{formatTk(product.basePrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
