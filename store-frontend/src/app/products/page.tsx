import Link from 'next/link';
import { getCategories, getProducts } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export const metadata = { title: 'Shop all' };

const SORTS = [
  { key: '', label: 'Newest' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
];

type SP = Record<string, string | undefined>;

function buildQuery(base: SP, patch: SP): string {
  const q = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `/products?${s}` : '/products';
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = sp.page ? Number(sp.page) : 1;

  const [data, categories] = await Promise.all([
    getProducts({ category: sp.category, search: sp.search, sort: sp.sort, page }),
    getCategories().catch(() => []),
  ]);

  const { products, pagination } = data;
  const heading = sp.search
    ? `Results for “${sp.search}”`
    : sp.category
      ? categories.find((c) => c.slug === sp.category)?.name ?? 'Products'
      : 'Shop all';

  return (
    <div className="container-x space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{heading}</h1>
          <p className="text-sm text-muted">{pagination.total} products</p>
        </div>

        {/* Sort */}
        <div className="flex gap-2 text-sm">
          {SORTS.map((s) => {
            const active = (sp.sort ?? '') === s.key;
            return (
              <Link
                key={s.label}
                href={buildQuery(sp, { sort: s.key || undefined, page: undefined })}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-ink/15 text-muted'
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildQuery(sp, { category: undefined, page: undefined })}
          className={`rounded-full px-3 py-1.5 text-sm ${
            !sp.category ? 'bg-ink text-white' : 'bg-sand text-ink'
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={buildQuery(sp, { category: c.slug, page: undefined })}
            className={`rounded-full px-3 py-1.5 text-sm ${
              sp.category === c.slug ? 'bg-ink text-white' : 'bg-sand text-ink'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="card p-12 text-center text-muted">No products found.</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          {page > 1 && (
            <Link href={buildQuery(sp, { page: String(page - 1) })} className="btn-outline py-2">
              Previous
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {pagination.page} of {pagination.pages}
          </span>
          {page < pagination.pages && (
            <Link href={buildQuery(sp, { page: String(page + 1) })} className="btn-outline py-2">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
