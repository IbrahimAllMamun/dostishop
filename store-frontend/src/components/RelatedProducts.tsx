import { getRelatedProducts } from '@/lib/api';
import { ProductRow } from './ProductRow';
import { getT } from '@/i18n/server';

export async function RelatedProducts({ productId }: { productId: string }) {
  const [t, products] = await Promise.all([getT(), getRelatedProducts(productId, 5).catch(() => [])]);
  if (!products.length) return null;
  return (
    <div className="container-x pb-4">
      <ProductRow title={t('product.related')} products={products} />
    </div>
  );
}
