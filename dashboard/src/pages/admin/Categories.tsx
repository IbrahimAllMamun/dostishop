import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Category } from '@/lib/types';

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<{ categories: Category[] }>('/categories')
      .then((d) => setCategories(d.categories))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/categories', { name: name.trim() });
      setName('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this category?')) return;
    try {
      await api.del(`/categories/${id}`);
      setCategories((c) => c.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed (category may have products)');
    }
  }

  async function rename(c: Category) {
    const name = prompt('Rename category', c.name);
    if (!name || name.trim() === c.name) return;
    try {
      await api.patch(`/categories/${c.id}`, { name: name.trim() });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function move(c: Category, dir: -1 | 1) {
    const sorted = [...categories];
    const idx = sorted.findIndex((x) => x.id === c.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      api.patch(`/categories/${c.id}`, { sortOrder: swap.sortOrder }),
      api.patch(`/categories/${swap.id}`, { sortOrder: c.sortOrder }),
    ]);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Categories</h1>

      <form onSubmit={add} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1">
          <label className="label">New category</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sneakers"
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Adding…' : 'Add category'}
        </button>
      </form>
      {error && <p className="text-sm text-sale">{error}</p>}

      <div className="card divide-y divide-ink/5">
        {loading ? (
          <p className="p-4 text-muted">Loading…</p>
        ) : (
          categories.map((c, i) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-xs text-muted">/{c.slug}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => move(c, -1)}
                  disabled={i === 0}
                  className="text-muted hover:text-ink disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(c, 1)}
                  disabled={i === categories.length - 1}
                  className="text-muted hover:text-ink disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button onClick={() => rename(c)} className="text-primary hover:underline">
                  Rename
                </button>
                <button onClick={() => remove(c.id)} className="text-muted hover:text-sale">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
