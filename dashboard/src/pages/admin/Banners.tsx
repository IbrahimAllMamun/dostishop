import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ImageUploader } from '@/components/ImageUploader';
import { useDialogs } from '@/components/Dialogs';
import type { Banner } from '@/lib/types';

export function AdminBanners() {
  const { confirm } = useDialogs();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  function load() {
    api
      .get<{ banners: Banner[] }>('/banners/admin')
      .then((d) => setBanners(d.banners))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl[0]) {
      setError('Upload a banner image first');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post('/banners', {
        imageUrl: imageUrl[0],
        title: title || undefined,
        linkUrl: linkUrl || undefined,
        sortOrder: banners.length,
      });
      setImageUrl([]);
      setTitle('');
      setLinkUrl('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(b: Banner) {
    await api.patch(`/banners/${b.id}`, { isActive: !b.isActive });
    setBanners((bs) => bs.map((x) => (x.id === b.id ? { ...x, isActive: !x.isActive } : x)));
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Delete this banner?',
      description: 'It disappears from the storefront homepage right away.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await api.del(`/banners/${id}`);
    setBanners((bs) => bs.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Homepage banners</h1>

      <form onSubmit={create} className="card space-y-4 p-6">
        <h2 className="font-semibold">New banner</h2>
        <ImageUploader multiple={false} value={imageUrl} onChange={setImageUrl} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Title (shown on the hero)</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Link URL</label>
            <input
              className="input"
              placeholder="/products"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-sale">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary btn-sm">
          {saving ? 'Adding…' : 'Add banner'}
        </button>
      </form>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {banners.map((b) => (
            <div key={b.id} className="card overflow-hidden">
              <img src={b.imageUrl} alt="" className="h-32 w-full object-cover" />
              <div className="space-y-1 p-4">
                <p className="font-medium">{b.title ?? <span className="text-muted-foreground">No title</span>}</p>
                <p className="text-xs text-muted-foreground">{b.linkUrl ?? 'No link'}</p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => toggle(b)}
                    className={`badge ${b.isActive ? 'bg-success/15 text-success' : 'bg-ink/10'}`}
                  >
                    {b.isActive ? 'Active' : 'Hidden'}
                  </button>
                  <button
                    onClick={() => remove(b.id)}
                    className="ml-auto text-sm text-muted-foreground hover:text-sale"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
