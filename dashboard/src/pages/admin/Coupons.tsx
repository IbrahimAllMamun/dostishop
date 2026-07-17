import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTk } from '@/lib/format';
import type { Coupon } from '@/lib/types';

export function AdminCoupons() {
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
    if (!confirm('Delete this coupon?')) return;
    await api.del(`/coupons/${id}`);
    setCoupons((cs) => cs.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Coupons</h1>

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

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/5">
              <th className="th">Code</th>
              <th className="th">Discount</th>
              <th className="th">Min order</th>
              <th className="th">Usage</th>
              <th className="th">Active</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="td text-muted" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td className="td text-muted" colSpan={6}>
                  No coupons yet.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="border-b border-ink/5 last:border-0">
                  <td className="td font-medium">{c.code}</td>
                  <td className="td">
                    {c.type === 'PERCENTAGE' ? `${Number(c.value)}%` : formatTk(c.value)}
                  </td>
                  <td className="td">{formatTk(c.minOrder)}</td>
                  <td className="td">
                    {c.usageCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                  </td>
                  <td className="td">
                    <button
                      onClick={() => toggle(c)}
                      className={`badge ${c.isActive ? 'bg-success/15 text-success' : 'bg-ink/10'}`}
                    >
                      {c.isActive ? 'Active' : 'Off'}
                    </button>
                  </td>
                  <td className="td text-right">
                    <button onClick={() => remove(c.id)} className="text-sm text-muted hover:text-sale">
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
