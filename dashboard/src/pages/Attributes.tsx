import { useEffect, useState } from 'react';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { DataTable, type Column } from '@/components/DataTable';
import { useDialogs } from '@/components/Dialogs';
import { AttributeEditDialog, type AttributeTarget } from '@/components/AttributeEditDialog';
import type { Attribute } from '@/lib/types';

/**
 * Shared by both roles — admins get full rights, vendors only over what they
 * created, exactly as with categories. The route decides which nav it hangs off.
 */
export function Attributes() {
  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const { confirm, notify } = useDialogs();

  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<AttributeTarget>(null);

  function load() {
    api
      .get<{ attributes: Attribute[] }>('/attributes')
      .then((d) => setAttributes(d.attributes))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const isMine = (a: Attribute) => Boolean(user?.id && a.createdById === user.id);
  const canEdit = (a: Attribute) => isAdmin || (isMine(a) && !a.adminLocked);

  async function remove(a: Attribute) {
    const ok = await confirm({
      title: `Delete "${a.name}"?`,
      description:
        'Its values go with it. If any product still uses them the delete will be rejected.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/attributes/${a.id}`);
      load();
    } catch (err) {
      await notify({
        title: 'Could not delete',
        description: err instanceof Error ? err.message : 'Failed',
        tone: 'danger',
      });
    }
  }

  const columns: Column<Attribute>[] = [
    {
      key: 'name',
      header: 'Attribute',
      sortable: true,
      value: (a) => a.name,
      render: (a) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{a.name}</span>
          {a.createdById &&
            (a.adminLocked ? (
              <span className="badge-neutral" title="Curated by the platform">
                <Lock className="h-3 w-3" /> Curated
              </span>
            ) : (
              <span className="badge-warn" title="Added by a vendor">
                Vendor-added
              </span>
            ))}
        </div>
      ),
    },
    {
      key: 'values',
      header: 'Values',
      // Searchable by value, so "XL" finds the Size attribute
      value: (a) => a.values.map((v) => v.value).join(', '),
      render: (a) =>
        a.values.length ? (
          <div className="flex flex-wrap gap-1">
            {a.values.slice(0, 8).map((v) => {
              const used = v._count?.variants ?? 0;
              return (
                <span
                  key={v.id}
                  title={used ? `Used by ${used} variant${used === 1 ? '' : 's'}` : 'Not used yet'}
                  className={used ? 'badge bg-muted text-ink' : 'badge-neutral'}
                >
                  {v.value}
                </span>
              );
            })}
            {a.values.length > 8 && (
              <span className="badge-neutral">+{a.values.length - 8} more</span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">No values yet</span>
        ),
    },
    {
      key: 'count',
      header: 'Count',
      sortable: true,
      value: (a) => a.values.length,
      className: 'text-muted-foreground',
      render: (a) => a.values.length,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (a) =>
        canEdit(a) ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setTarget(a)}
              aria-label={`Edit ${a.name}`}
              className="row-action hover:text-primary"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => remove(a)}
              aria-label={`Delete ${a.name}`}
              className="row-action hover:bg-sale/10 hover:text-sale"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : isMine(a) && a.adminLocked ? (
          <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Admin-managed
          </span>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Attributes</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The dimensions your products vary along. Values defined here become the choices on a
          product's variants — {isAdmin ? 'you manage all of them.' : 'you can edit the ones you added, until an admin curates them.'}
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={attributes}
        getRowId={(a) => a.id}
        loading={loading}
        searchPlaceholder="Search attributes or values…"
        empty="No attributes yet."
        toolbar={
          <button onClick={() => setTarget('new')} className="btn-primary btn-sm">
            <Plus className="h-3.5 w-3.5" /> Add attribute
          </button>
        }
      />

      <AttributeEditDialog
        target={target}
        onClose={() => setTarget(null)}
        onSaved={load}
        warnOnCuration={isAdmin}
      />
    </div>
  );
}
