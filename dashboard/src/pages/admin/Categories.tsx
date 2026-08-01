import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useDialogs } from '@/components/Dialogs';
import type { Category } from '@/lib/types';

interface TreeNode extends Category {
  children: Category[];
}

function buildTree(categories: Category[]): TreeNode[] {
  const tops = categories.filter((c) => !c.parentId);
  return tops.map((t) => ({ ...t, children: categories.filter((c) => c.parentId === t.id) }));
}

export function AdminCategories() {
  const { confirm, notify, prompt } = useDialogs();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState('');

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

  async function fail(title: string, err: unknown) {
    await notify({
      title,
      description: err instanceof Error ? err.message : 'Failed',
      tone: 'danger',
    });
  }

  async function remove(c: Category, hasChildren: boolean) {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      description: hasChildren
        ? 'Its subcategories are promoted to top-level categories. This cannot be undone.'
        : 'Products filed under it keep existing, just without a category. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/categories/${c.id}`);
      load();
    } catch (err) {
      await fail('Could not delete', err);
    }
  }

  async function rename(c: Category) {
    const newName = await prompt({
      title: 'Rename category',
      description: c.createdById
        ? 'This category was added by a vendor — renaming it hands ownership to the platform.'
        : undefined,
      label: 'Name',
      defaultValue: c.name,
      confirmLabel: 'Rename',
    });
    if (!newName || newName.trim() === c.name) return;
    try {
      await api.patch(`/categories/${c.id}`, { name: newName.trim() });
      load();
    } catch (err) {
      await fail('Could not rename', err);
    }
  }

  async function applyMove(c: Category) {
    try {
      await api.patch(`/categories/${c.id}`, { parentId: moveTarget || null });
      setMovingId(null);
      setMoveTarget('');
      load();
    } catch (err) {
      await fail('Could not move', err);
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
    // A category with children must stay top-level (2-level cap); anything else can move
    const canReparent = !hasChildren;

    if (movingId === c.id) {
      return (
        <div
          className="flex flex-wrap items-center justify-between gap-2 bg-canvas px-4 py-2.5"
          style={{ paddingLeft: depth ? 32 : 16 }}
        >
          <span className={depth ? 'text-sm' : 'font-medium'}>{c.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Move under:</span>
            <select
              className="input w-auto py-1 text-sm"
              value={moveTarget}
              onChange={(e) => setMoveTarget(e.target.value)}
            >
              <option value="">— top level —</option>
              {tree
                .filter((t) => t.id !== c.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            <button onClick={() => applyMove(c)} className="btn-primary btn-sm">
              Save
            </button>
            <button onClick={() => setMovingId(null)} className="btn-ghost btn-sm">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ paddingLeft: depth ? 32 : 16 }}
      >
        <div className="flex items-center gap-2">
          {depth > 0 && <span className="text-muted-foreground">└</span>}
          <span className={depth ? 'text-sm' : 'font-medium'}>{c.name}</span>
          <span className="text-xs text-muted-foreground">/{c.slug}</span>
          {c.createdById &&
            (c.adminLocked ? (
              <span
                title="You have curated this one — the vendor who added it can no longer change it"
                className="badge gap-1 bg-muted text-muted-foreground"
              >
                <Lock className="h-3 w-3" /> Curated
              </span>
            ) : (
              <span
                title="A vendor added this and can still rename or delete it. Editing it here takes it over."
                className="badge bg-gold/15 text-warn"
              >
                Vendor-added
              </span>
            ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          {canReparent && (
            <button
              onClick={() => {
                setMovingId(c.id);
                setMoveTarget(c.parentId ?? '');
              }}
              className="text-muted-foreground hover:text-ink"
            >
              Move
            </button>
          )}
          <button
            onClick={() => move(c, siblings, -1)}
            disabled={i === 0}
            className="text-muted-foreground hover:text-ink disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => move(c, siblings, 1)}
            disabled={i === siblings.length - 1}
            className="text-muted-foreground hover:text-ink disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
          <button onClick={() => rename(c)} className="text-primary hover:underline">
            Rename
          </button>
          <button onClick={() => remove(c, hasChildren)} className="text-muted-foreground hover:text-sale">
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
          <p className="p-4 text-muted-foreground">Loading…</p>
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

      <p className="text-xs text-muted-foreground">
        Vendors can also add categories when creating products. Two levels max: category →
        subcategory.
      </p>
    </div>
  );
}
