import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Trash2 } from 'lucide-react';
import { formatTk } from '@/lib/format';
import { DataTable, type Column } from '@/components/DataTable';
import { useDialogs } from '@/components/Dialogs';
import type { Coupon } from '@/lib/types';

export function AdminCoupons() {
  const { confirm } = useDialogs();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: '',
    minOrder: '',
    usageLimit: '',
  });

  function load() {
    api
      .get<{ coupons: Coupon[] }>('/coupons')
      .then((d) => setCoupons(d.coupons))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/coupons', {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minOrder: form.minOrder ? Number(form.minOrder) : 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      });
      setForm({ code: '', type: 'PERCENTAGE', value: '', minOrder: '', usageLimit: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Coupon) {
    await api.patch(`/coupons/${c.id}`, { isActive: !c.isActive });
    setCoupons((cs) => cs.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x)));
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Delete this coupon?',
      description: 'Customers who have not checked out yet will stop being able to apply it.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await api.del(`/coupons/${id}`);
    setCoupons((cs) => cs.filter((x) => x.id !== id));
  }

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      value: (c) => c.code,
      render: (c) => <span className="font-mono font-medium">{c.code}</span>,
    },
    {
      key: 'discount',
      header: 'Discount',
      sortable: true,
      value: (c) => Number(c.value),
      render: (c) => (c.type === 'PERCENTAGE' ? `${Number(c.value)}%` : formatTk(c.value)),
    },
    {
      key: 'minOrder',
      header: 'Min order',
      sortable: true,
      value: (c) => Number(c.minOrder ?? 0),
      render: (c) => formatTk(c.minOrder),
    },
    {
      key: 'usage',
      header: 'Usage',
      sortable: true,
      value: (c) => c.usageCount,
      render: (c) => `${c.usageCount}${c.usageLimit ? ` / ${c.usageLimit}` : ''}`,
    },
    {
      key: 'active',
      header: 'Active',
      sortable: true,
      value: (c) => (c.isActive ? 'Active' : 'Off'),
      render: (c) => (
        <button
          onClick={() => toggle(c)}
          aria-pressed={c.isActive}
          className={`${c.isActive ? 'badge-success' : 'badge-neutral'} transition-transform duration-200 ease-out active:scale-95`}
        >
          {c.isActive ? 'Active' : 'Off'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <button
          onClick={() => remove(c.id)}
          aria-label={`Delete coupon ${c.code}`}
          className="row-action ml-auto hover:bg-sale/10 hover:text-sale"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Coupons</h1>

      <form onSubmit={create} className="card grid gap-3 p-4 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <label className="label">Code</label>
          <input
            className="input uppercase"
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="SAVE10"
          />
        </div>
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'PERCENTAGE' | 'FIXED' }))}
          >
            <option value="PERCENTAGE">%</option>
            <option value="FIXED">৳</option>
          </select>
        </div>
        <div>
          <label className="label">Value</label>
          <input
            className="input"
            type="number"
            min="0"
            required
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Min order</label>
          <input
            className="input"
            type="number"
            min="0"
            value={form.minOrder}
            onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Usage limit</label>
          <input
            className="input"
            type="number"
            min="1"
            placeholder="∞"
            value={form.usageLimit}
            onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-6">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create coupon'}
          </button>
          {error && <span className="ml-3 text-sm text-sale">{error}</span>}
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={coupons}
        getRowId={(c) => c.id}
        loading={loading}
        searchPlaceholder="Search codes…"
        empty="No coupons yet."
      />
    </div>
  );
}
