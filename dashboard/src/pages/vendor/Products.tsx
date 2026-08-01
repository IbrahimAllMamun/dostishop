import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Plus, Upload } from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { formatTk, formatDate } from '@/lib/format';
import { DataTable, type Column } from '@/components/DataTable';
import { useDialogs } from '@/components/Dialogs';
import { ProductEditDialog } from './ProductEditDialog';
import type { Product } from '@/lib/types';

function stockOf(p: Product) {
  return (p.variants ?? []).reduce((n, v) => n + v.stockQty, 0);
}

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

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      value: (p) => p.name,
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.images?.[0]?.url ? (
            <img src={p.images[0].url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
          )}
          <span className="font-medium">{p.name}</span>
        </div>
      ),
    },
    {
      key: 'id',
      header: 'Product ID',
      value: (p) => p.id,
      className: 'text-muted-foreground',
      render: (p) => <span className="font-mono text-xs">#{p.id.slice(-6).toUpperCase()}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      value: (p) => Number(p.salePrice ?? p.basePrice),
      render: (p) => (
        <>
          {formatTk(p.salePrice ?? p.basePrice)}
          {p.salePrice && (
            <span className="ml-1 text-xs text-muted-foreground line-through">
              {formatTk(p.basePrice)}
            </span>
          )}
        </>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      sortable: true,
      value: stockOf,
      render: (p) => {
        const n = stockOf(p);
        if (n === 0) return <span className="badge-danger">Out of stock</span>;
        return <span className={n <= 3 ? 'font-medium text-warn' : ''}>{n}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      value: (p) => (p.isActive ? 'Active' : 'Hidden'),
      render: (p) =>
        p.isActive ? (
          <span className="badge-success">Active</span>
        ) : (
          <span className="badge-neutral">Hidden</span>
        ),
    },
    {
      key: 'created',
      header: 'Added',
      sortable: true,
      value: (p) => p.createdAt ?? '',
      className: 'text-muted-foreground',
      render: (p) => (p.createdAt ? formatDate(p.createdAt) : '—'),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Products</h1>
          <p className="text-sm text-muted-foreground">Select a product to edit it.</p>
        </div>
      </div>

      {importMsg && (
        <div className="animate-fade-up rounded-lg bg-sand/70 px-4 py-2 text-sm">{importMsg}</div>
      )}

      <DataTable
        columns={columns}
        rows={products}
        getRowId={(p) => p.id}
        loading={loading}
        onRowClick={setEditing}
        searchPlaceholder="Search products…"
        empty="No products yet. Click “Add product”."
        toolbar={
          <>
            <button onClick={exportCsv} className="btn-ghost btn-sm">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="btn-ghost btn-sm"
            >
              <Upload className="h-3.5 w-3.5" /> {importing ? 'Importing…' : 'Import'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => importCsv(e.target.files)}
            />
            <Link to="/vendor/products/new" className="btn-primary btn-sm">
              <Plus className="h-3.5 w-3.5" /> Add product
            </Link>
          </>
        }
      />

      <ProductEditDialog
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={load}
        onDeleted={(id) => setProducts((list) => list.filter((x) => x.id !== id))}
      />
    </div>
  );
}
