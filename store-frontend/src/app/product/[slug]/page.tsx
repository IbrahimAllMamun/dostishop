import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/api';
import { ProductDetail } from '@/components/ProductDetail';
import { ReviewsSection } from '@/components/ReviewsSection';
import { RelatedProducts } from '@/components/RelatedProducts';

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
  let product;
  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  // Structured data for Google rich results (price, stars)
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const price = Number(product.salePrice ?? product.basePrice);
  const inStock = (product.variants ?? []).length === 0 || product.variants!.some((v) => v.stockQty > 0);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.images?.map((i) => i.url),
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${site}/product/${product.slug}`,
      priceCurrency: 'BDT',
      price: price.toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(Number(product.ratingCount ?? 0) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(product.ratingAvg).toFixed(1),
            reviewCount: product.ratingCount,
          },
        }
      : {}),
  };

  // Breadcrumb trail: Home / Shop / Category? / Product
  const crumbs = [
    { name: 'Home', item: site },
    { name: 'Shop', item: `${site}/products` },
    ...(product.category
      ? [
          {
            name: product.category.name,
            item: `${site}/products?category=${product.category.slug}`,
          },
        ]
      : []),
    { name: product.name, item: `${site}/product/${product.slug}` },
  ];
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ProductDetail product={product} />
      <RelatedProducts productId={product.id} />
      <ReviewsSection productId={product.id} />
    </>
  );
}
