import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import type { Settings } from '@/lib/types';

export function AdminSettings() {
  const [form, setForm] = useState({
    storeName: '',
    shippingInsideDhaka: '',
    shippingOutsideDhaka: '',
    supportPhone: '',
    supportEmail: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api
      .get<{ settings: Settings | null }>('/settings/admin')
      .then((d) => {
        if (d.settings) {
          setForm({
            storeName: d.settings.storeName,
            shippingInsideDhaka: String(Number(d.settings.shippingInsideDhaka)),
            shippingOutsideDhaka: String(Number(d.settings.shippingOutsideDhaka)),
            supportPhone: d.settings.supportPhone ?? '',
            supportEmail: d.settings.supportEmail ?? '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.patch('/settings/admin', {
        storeName: form.storeName,
        shippingInsideDhaka: Number(form.shippingInsideDhaka),
        shippingOutsideDhaka: Number(form.shippingOutsideDhaka),
        supportPhone: form.supportPhone || undefined,
        supportEmail: form.supportEmail || undefined,
      });
      setMsg({ ok: true, text: 'Settings saved ✓ (applies to new checkouts immediately)' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Store settings</h1>

      <form onSubmit={submit} className="card space-y-4 p-6">
        <div>
          <label className="label">Store name</label>
          <input
            required
            className="input"
            value={form.storeName}
            onChange={(e) => set('storeName', e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Shipping — inside Dhaka (৳)</label>
            <input
              required
              type="number"
              min="0"
              className="input"
              value={form.shippingInsideDhaka}
              onChange={(e) => set('shippingInsideDhaka', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Shipping — outside Dhaka (৳)</label>
            <input
              required
              type="number"
              min="0"
              className="input"
              value={form.shippingOutsideDhaka}
              onChange={(e) => set('shippingOutsideDhaka', e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Support phone</label>
            <input
              className="input"
              value={form.supportPhone}
              onChange={(e) => set('supportPhone', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Support email</label>
            <input
              type="email"
              className="input"
              value={form.supportEmail}
              onChange={(e) => set('supportEmail', e.target.value)}
            />
          </div>
        </div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-success' : 'text-sale'}`}>{msg.text}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <ChangePasswordCard />
    </div>
  );
}
