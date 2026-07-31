import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Category } from '@/lib/types';

export function VendorCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function load() {
    api
      .get<{ categories: Category[] }>('/categories')
      .then((d) => setCategories(d.categories))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const tops = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const d = await api.post<{ category: Category }>('/categories', {
        name: name.trim(),
        parentId: parentId || undefined,
      });
      setMsg({ ok: true, text: `Created "${d.category.name}" ✓ — you can use it on your products now.` });
      setName('');
      setParentId('');
      load();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Don’t see a fitting category for your products? Add one — it becomes available to every
          shop. Renaming and removing is handled by the platform admin.
        </p>
      </div>

      <form onSubmit={add} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label className="label">New category</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Watches"
          />
        </div>
        <div>
          <label className="label">Under (optional → subcategory)</label>
          <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— top level —</option>
            {tops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Adding…' : 'Add'}
        </button>
      </form>
      {msg && <p className={`text-sm ${msg.ok ? 'text-success' : 'text-sale'}`}>{msg.text}</p>}

      <div className="card divide-y divide-ink/5">
        {loading ? (
          <p className="p-4 text-muted-foreground">Loading…</p>
        ) : (
          tops.map((top) => (
            <div key={top.id}>
              <div className="px-4 py-2.5 font-medium">{top.name}</div>
              {childrenOf(top.id).map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 py-2 pl-8 text-sm">
                  <span className="text-muted-foreground">└</span> {sub.name}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
