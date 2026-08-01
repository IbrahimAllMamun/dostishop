import Link from 'next/link';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { Reveal } from './Reveal';

/** A titled merchandising row (best sellers, price drops, related…). */
export function ProductRow({
  title,
  products,
  href,
  viewAllLabel,
}: {
  title: string;
  products: Product[];
  href?: string;
  viewAllLabel?: string;
}) {
  if (!products.length) return null;
  return (
    <Reveal>
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          {href && viewAllLabel && (
            <Link
              href={href}
              className="text-sm text-primary transition-transform duration-200 ease-out hover:underline active:scale-95"
            >
              {viewAllLabel}
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </Reveal>
  );
}
