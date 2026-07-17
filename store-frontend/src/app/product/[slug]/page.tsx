import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/api';
import { ProductDetail } from '@/components/ProductDetail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await getProduct(slug);
    return {
      title: p.name,
      description: p.description ?? undefined,
      openGraph: {
        title: p.name,
        description: p.description ?? undefined,
        images: p.images?.[0]?.url ? [p.images[0].url] : undefined,
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    return <ProductDetail product={product} />;
  } catch {
    notFound();
  }
}
