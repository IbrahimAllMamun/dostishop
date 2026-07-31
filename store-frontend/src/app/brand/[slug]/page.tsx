import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBrands, getProducts } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

/** Brand slugs are derived from the brand name so we don't need a Brand table. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-');
}

async function resolveBrand(slug: string): Promise<string | null> {
  const brands = await getBrands().catch(() => []);
  return brands.find((b) => toSlug(b.name) === slug)?.name ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await resolveBrand(slug);
  if (!brand) return { title: 'Brand' };
  return {
    title: brand,
    description: `Shop ${brand} products — cash on delivery across Bangladesh.`,
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await resolveBrand(slug);
  if (!brand) notFound();

  const data = await getProducts({ brand }).catch(() => ({
    products: [],
    pagination: null as never,
  }));

  return (
    <div className="container-x space-y-6 py-8">
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        {' / '}
        <Link href="/products" className="hover:text-primary">
          Shop
        </Link>
        {' / '}
        <span className="text-ink">{brand}</span>
      </nav>

      <div>
        <h1 className="font-display text-3xl font-bold">{brand}</h1>
        <p className="text-sm text-muted">{data.products.length} products</p>
      </div>

      {data.products.length === 0 ? (
        <div className="card p-12 text-center text-muted">No products from this brand yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
