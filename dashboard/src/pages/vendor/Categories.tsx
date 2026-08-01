import { useEffect, useState } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useDialogs } from '@/components/Dialogs';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryEditDialog } from '@/components/CategoryEditDialog';
import type { Category } from '@/lib/types';

export function VendorCategories() {
  const userId = useAuth((s) => s.user?.id);
  const { confirm, notify } = useDialogs();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);

  function load() {
    api
      .get<{ categories: Category[] }>('/categories')
      .then((d) => setCategories(d.categories))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const tops = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  /** Mirrors `assertCanMutate` on the API — mine, and not yet curated by an admin. */
  const isMine = (c: Category) => Boolean(userId && c.createdById === userId);
  const canEdit = (c: Category) => isMine(c) && !c.adminLocked;

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

  async function remove(c: Category) {
    const hasChildren = childrenOf(c.id).length > 0;
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      description: hasChildren
        ? 'It still has subcategories — remove those first, or this will be rejected.'
        : 'Products filed under it keep existing, just without a category. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/categories/${c.id}`);
      load();
    } catch (err) {
      await notify({
        title: 'Could not delete',
        description: err instanceof Error ? err.message : 'Failed',
        tone: 'danger',
      });
    }
  }

  function Actions({ c }: { c: Category }) {
    if (canEdit(c)) {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(c)}
            aria-label={`Edit ${c.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,transform] duration-200 ease-out hover:bg-muted hover:text-primary active:scale-90"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => remove(c)}
            aria-label={`Delete ${c.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,transform] duration-200 ease-out hover:bg-sale/10 hover:text-sale active:scale-90"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    }
    if (isMine(c) && c.adminLocked) {
      return (
        <span
          title="An admin has curated this category, so it is managed by the platform now"
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Lock className="h-3.5 w-3.5" /> Admin-managed
        </span>
      );
    }
    return null;
  }

  function Row({ c, depth }: { c: Category; depth: number }) {
    return (
      <div
        className={`flex min-h-12 items-center gap-3 pr-4 ${depth ? 'py-1.5 pl-10' : 'px-4 py-2'}`}
      >
        {depth > 0 && <span aria-hidden className="text-muted-foreground">└</span>}
        <CategoryIcon
          icon={c.icon}
          imageUrl={c.imageUrl}
          name={c.name}
          className={depth ? 'h-7 w-7' : 'h-9 w-9'}
        />
        <span className={depth ? 'text-sm' : 'font-medium'}>{c.name}</span>
        <span className="text-xs text-muted-foreground">
          {c._count?.products ?? 0} product{(c._count?.products ?? 0) === 1 ? '' : 's'}
        </span>
        <div className="ml-auto">
          <Actions c={c} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Every category on the platform is listed here. You can rename or delete the ones you
          added — until an admin curates one, after which the platform manages it.
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
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-9 w-full" />
            ))}
          </div>
        ) : (
          tops.map((top, i) => (
            <div key={top.id} style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }} className="animate-row-in">
              <Row c={top} depth={0} />
              {childrenOf(top.id).map((sub) => (
                <Row key={sub.id} c={sub} depth={1} />
              ))}
            </div>
          ))
        )}
      </div>

      <CategoryEditDialog category={editing} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  );
}
