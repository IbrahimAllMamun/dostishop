import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_URL } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { formatTk } from '@/lib/format';
import { TableSkeleton } from '@/components/Skeleton';
import { useDialogs } from '@/components/Dialogs';
import { ProductEditDialog } from './ProductEditDialog';
import type { Product } from '@/lib/types';

export function VendorProducts() {
  const { notify } = useDialogs();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    api
      .get<{ products: Product[] }>('/products/mine')
      .then((d) => setProducts(d.products))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function stockOf(p: Product) {
    return (p.variants ?? []).reduce((n, v) => n + v.stockQty, 0);
  }

  async function exportCsv() {
    const token = useAuth.getState().token;
    const res = await fetch(`${API_URL}/products/mine/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      await notify({ title: 'Export failed', description: 'Please try again.', tone: 'danger' });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importCsv(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await api.post<{
          created: number;
          failed: number;
          errors: Array<{ row: number; message: string }>;
        }>('/products/mine/import', { csv: String(reader.result) });
        setImportMsg(
          `Imported ${result.created} product${result.created === 1 ? '' : 's'}` +
            (result.failed
              ? `; ${result.failed} failed (${result.errors
                  .slice(0, 3)
                  .map((e) => `row ${e.row}: ${e.message}`)
                  .join('; ')})`
              : ''),
        );
        load();
      } catch (e) {
        setImportMsg(e instanceof Error ? e.message : 'Import failed');
      } finally {
        setImporting(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-ghost btn-sm">
            ⬇ Export CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="btn-ghost btn-sm"
          >
            {importing ? 'Importing…' : '⬆ Import CSV'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => importCsv(e.target.files)}
          />
          <Link to="/vendor/products/new" className="btn-primary btn-sm">
            + Add product
          </Link>
        </div>
      </div>

      {importMsg && (
        <div className="rounded-lg bg-sand/70 px-4 py-2 text-sm">{importMsg}</div>
      )}

      <p className="text-sm text-muted-foreground">
        Select a product to edit it.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/5">
              <th className="th">Product</th>
              <th className="th">Price</th>
              <th className="th">Stock</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={4} />
            ) : products.length === 0 ? (
              <tr>
                <td className="td text-muted-foreground" colSpan={4}>
                  No products yet. Click “Add product”.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Edit ${p.name}`}
                  onClick={() => setEditing(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEditing(p);
                    }
                  }}
                  className="cursor-pointer border-b border-ink/5 transition-colors duration-150 last:border-0 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
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
                      <span className="ml-1 text-xs text-muted-foreground line-through">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProductEditDialog
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={load}
        onDeleted={(id) => setProducts((list) => list.filter((x) => x.id !== id))}
      />
    </div>
  );
}
