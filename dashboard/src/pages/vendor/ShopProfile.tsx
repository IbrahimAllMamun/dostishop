import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { ImageUploader } from '@/components/ImageUploader';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import type { Shop } from '@/lib/types';

export function ShopProfile() {
  const setUser = useAuth((s) => s.setUser);
  const user = useAuth((s) => s.user);
  const [shop, setShop] = useState<Shop | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    logoUrl: '',
    bannerUrl: '',
  });

  useEffect(() => {
    api.get<{ shop: Shop }>('/shops/me').then((d) => {
      setShop(d.shop);
      setForm({
        name: d.shop.name ?? '',
        description: d.shop.description ?? '',
        phone: d.shop.phone ?? '',
        address: d.shop.address ?? '',
        logoUrl: d.shop.logoUrl ?? '',
        bannerUrl: d.shop.bannerUrl ?? '',
      });
    });
  }, []);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        logoUrl: form.logoUrl || undefined,
        bannerUrl: form.bannerUrl || undefined,
      };
      const d = await api.patch<{ shop: Shop }>('/shops/me', payload);
      setShop(d.shop);
      setSaved(true);
      if (user) setUser({ ...user, shop: { ...user.shop!, name: d.shop.name } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shop profile</h1>
        {shop && <StatusBadge status={shop.status} />}
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6">
        <div>
          <label className="label">Shop name</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            rows={3}
            className="input"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Address</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Logo</label>
            <ImageUploader
              multiple={false}
              value={form.logoUrl ? [form.logoUrl] : []}
              onChange={(urls) => set('logoUrl', urls[0] ?? '')}
            />
          </div>
          <div>
            <label className="label">Banner</label>
            <ImageUploader
              multiple={false}
              value={form.bannerUrl ? [form.bannerUrl] : []}
              onChange={(urls) => set('bannerUrl', urls[0] ?? '')}
            />
          </div>
        </div>

        {error && <p className="text-sm text-sale">{error}</p>}
        {saved && <p className="text-sm text-success">Saved ✓</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <ChangePasswordCard />
    </div>
  );
}
