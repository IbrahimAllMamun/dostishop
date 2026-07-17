import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatTk } from '@/lib/format';
import type { Product } from '@/lib/types';

export function VendorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api
      .get<{ products: Product[] }>('/products/mine')
      .then((d) => setProducts(d.products))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function remove(id: string) {
    if (!confirm('Delete this product?')) return;
    try {
      await api.del(`/products/${id}`);
      setProducts((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  function stockOf(p: Product) {
    return (p.variants ?? []).reduce((n, v) => n + v.stockQty, 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link to="/vendor/products/new" className="btn-primary">
          + Add product
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/5">
              <th className="th">Product</th>
              <th className="th">Price</th>
              <th className="th">Stock</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="td text-muted" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td className="td text-muted" colSpan={5}>
                  No products yet. Click “Add product”.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-ink/5 last:border-0">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      {p.images?.[0]?.url && (
                        <img
                          src={p.images[0].url}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      )}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="td">
                    {formatTk(p.salePrice ?? p.basePrice)}
                    {p.salePrice && (
                      <span className="ml-1 text-xs text-muted line-through">
                        {formatTk(p.basePrice)}
                      </span>
                    )}
                  </td>
                  <td className="td">
                    <span className={stockOf(p) <= 3 ? 'text-warn' : ''}>{stockOf(p)}</span>
                  </td>
                  <td className="td">
                    <span className={`badge ${p.isActive ? 'bg-success/15 text-success' : 'bg-ink/10'}`}>
                      {p.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="td text-right">
                    <button onClick={() => remove(p.id)} className="text-sm text-muted hover:text-sale">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
