'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Facets } from '@/lib/api';

/** Faceted filter panel. All state lives in the URL so the server component refetches. */
export function Filters({ facets }: { facets: Facets }) {
  const router = useRouter();
  const params = useSearchParams();
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');

  function push(patch: Record<string, string | null>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') q.delete(k);
      else q.set(k, v);
    }
    q.delete('page');
    router.push(`/products?${q.toString()}`);
  }

  function toggleInList(key: 'brand' | 'size' | 'color', value: string) {
    const current = (params.get(key) ?? '').split(',').filter(Boolean);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    push({ [key]: next.length ? next.join(',') : null });
  }

  const active = (key: string, value: string) =>
    (params.get(key) ?? '').split(',').includes(value);

  const hasAnyFilter = ['minPrice', 'maxPrice', 'brand', 'size', 'color', 'inStock', 'minRating'].some(
    (k) => params.get(k),
  );

  return (
    <aside className="space-y-5">
      {/* Price */}
      <div className="card space-y-2 p-4">
        <p className="text-sm font-semibold">Price (৳)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={String(facets.priceMin)}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="input px-2 py-1.5 text-sm"
            aria-label="Min price"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            placeholder={String(facets.priceMax)}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="input px-2 py-1.5 text-sm"
            aria-label="Max price"
          />
        </div>
        <button
          onClick={() => push({ minPrice: minPrice || null, maxPrice: maxPrice || null })}
          className="w-full rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-primary"
        >
          Apply
        </button>
      </div>

      {/* Availability + rating */}
      <div className="card space-y-2 p-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={params.get('inStock') === 'true'}
            onChange={(e) => push({ inStock: e.target.checked ? 'true' : null })}
          />
          In stock only
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={params.get('minRating') === '4'}
            onChange={(e) => push({ minRating: e.target.checked ? '4' : null })}
          />
          <span className="text-gold">★★★★</span> &amp; up
        </label>
      </div>

      {/* Brands */}
      {facets.brands.length > 0 && (
        <div className="card space-y-2 p-4">
          <p className="text-sm font-semibold">Brand</p>
          <div className="flex flex-wrap gap-1.5">
            {facets.brands.map((b) => (
              <button
                key={b}
                onClick={() => toggleInList('brand', b)}
                className={`rounded-full px-3 py-1 text-xs ${
                  active('brand', b) ? 'bg-ink text-white' : 'bg-sand text-ink'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sizes */}
      {facets.sizes.length > 0 && (
        <div className="card space-y-2 p-4">
          <p className="text-sm font-semibold">Size</p>
          <div className="flex flex-wrap gap-1.5">
            {facets.sizes.map((s) => (
              <button
                key={s}
                onClick={() => toggleInList('size', s)}
                className={`rounded-full px-3 py-1 text-xs ${
                  active('size', s) ? 'bg-ink text-white' : 'bg-sand text-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Colors */}
      {facets.colors.length > 0 && (
        <div className="card space-y-2 p-4">
          <p className="text-sm font-semibold">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {facets.colors.map((c) => (
              <button
                key={c}
                onClick={() => toggleInList('color', c)}
                className={`rounded-full px-3 py-1 text-xs ${
                  active('color', c) ? 'bg-ink text-white' : 'bg-sand text-ink'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasAnyFilter && (
        <button
          onClick={() =>
            push({
              minPrice: null,
              maxPrice: null,
              brand: null,
              size: null,
              color: null,
              inStock: null,
              minRating: null,
            })
          }
          className="w-full text-center text-xs text-primary hover:underline"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}
