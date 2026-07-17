import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProducts, getShop } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const shop = await getShop(slug);
    return { title: shop.name, description: shop.description ?? undefined };
  } catch {
    return { title: 'Shop' };
  }
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let shop;
  try {
    shop = await getShop(slug);
  } catch {
    notFound();
  }

  const data = await getProducts({ shop: slug }).catch(() => ({
    products: [],
    pagination: null as never,
  }));

  return (
    <div className="container-x space-y-8 py-8">
      <div className="card overflow-hidden">
        {shop.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.bannerUrl} alt="" className="h-40 w-full object-cover" />
        )}
        <div className="space-y-2 p-6">
          <h1 className="font-display text-3xl font-bold">{shop.name}</h1>
          {shop.description && <p className="text-muted">{shop.description}</p>}
        </div>
      </div>

      {data.products.length === 0 ? (
        <div className="card p-12 text-center text-muted">This shop has no products yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
