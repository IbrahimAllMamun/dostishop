import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Category } from '@/lib/types';

interface TreeNode extends Category {
  children: Category[];
}

function buildTree(categories: Category[]): TreeNode[] {
  const tops = categories.filter((c) => !c.parentId);
  return tops.map((t) => ({ ...t, children: categories.filter((c) => c.parentId === t.id) }));
}

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
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

  const tree = buildTree(categories);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/categories', {
        name: name.trim(),
        parentId: parentId || undefined,
      });
      setName('');
      setParentId('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Category, hasChildren: boolean) {
    const warning = hasChildren
      ? `Delete "${c.name}"? Its subcategories become top-level categories.`
      : `Delete "${c.name}"? Products in it keep existing without a category.`;
    if (!confirm(warning)) return;
    try {
      await api.del(`/categories/${c.id}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function rename(c: Category) {
    const newName = prompt('Rename category', c.name);
    if (!newName || newName.trim() === c.name) return;
    try {
      await api.patch(`/categories/${c.id}`, { name: newName.trim() });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function move(c: Category, siblings: Category[], dir: -1 | 1) {
    const idx = siblings.findIndex((x) => x.id === c.id);
    const swap = siblings[idx + dir];
    if (!swap) return;
    await Promise.all([
      api.patch(`/categories/${c.id}`, { sortOrder: swap.sortOrder }),
      api.patch(`/categories/${swap.id}`, { sortOrder: c.sortOrder }),
    ]);
    load();
  }

  function Row({
    c,
    siblings,
    depth,
    hasChildren,
  }: {
    c: Category;
    siblings: Category[];
    depth: number;
    hasChildren: boolean;
  }) {
    const i = siblings.findIndex((x) => x.id === c.id);
    return (
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ paddingLeft: depth ? 32 : 16 }}
      >
        <div className="flex items-center gap-2">
          {depth > 0 && <span className="text-muted">└</span>}
          <span className={depth ? 'text-sm' : 'font-medium'}>{c.name}</span>
          <span className="text-xs text-muted">/{c.slug}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => move(c, siblings, -1)}
            disabled={i === 0}
            className="text-muted hover:text-ink disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => move(c, siblings, 1)}
            disabled={i === siblings.length - 1}
            className="text-muted hover:text-ink disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
          <button onClick={() => rename(c)} className="text-primary hover:underline">
            Rename
          </button>
          <button onClick={() => remove(c, hasChildren)} className="text-muted hover:text-sale">
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Categories</h1>

      <form onSubmit={add} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label className="label">New category</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sneakers"
          />
        </div>
        <div>
          <label className="label">Parent (optional → subcategory)</label>
          <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— top level —</option>
            {tree.map((c) => (
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
      {error && <p className="text-sm text-sale">{error}</p>}

      <div className="card divide-y divide-ink/5">
        {loading ? (
          <p className="p-4 text-muted">Loading…</p>
        ) : (
          tree.map((top) => (
            <div key={top.id}>
              <Row c={top} siblings={tree} depth={0} hasChildren={top.children.length > 0} />
              {top.children.map((sub) => (
                <Row key={sub.id} c={sub} siblings={top.children} depth={1} hasChildren={false} />
              ))}
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-muted">
        Vendors can also add categories when creating products. Two levels max: category →
        subcategory.
      </p>
    </div>
  );
}
