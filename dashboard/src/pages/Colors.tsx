import { useEffect, useState } from 'react';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { DataTable, type Column } from '@/components/DataTable';
import { useDialogs } from '@/components/Dialogs';
import { ColorEditDialog, type ColorTarget } from '@/components/ColorEditDialog';
import { Swatch } from '@/components/Swatch';
import type { Color } from '@/lib/types';

/**
 * The shared colour palette. Shared by both roles on the same ownership rule as
 * categories and attributes — admins manage everything, vendors only what they
 * added and only until an admin curates it.
 */
export function Colors() {
  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const { confirm, notify } = useDialogs();

  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<ColorTarget>(null);

  function load() {
    api
      .get<{ colors: Color[] }>('/colors')
      .then((d) => setColors(d.colors))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const isMine = (c: Color) => Boolean(user?.id && c.createdById === user.id);
  const canEdit = (c: Color) => isAdmin || (isMine(c) && !c.adminLocked);

  async function remove(c: Color) {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      description:
        'If any attribute value still points at it the delete will be rejected.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.del(`/colors/${c.id}`);
      load();
    } catch (err) {
      await notify({
        title: 'Could not delete',
        description: err instanceof Error ? err.message : 'Failed',
        tone: 'danger',
      });
    }
  }

  const columns: Column<Color>[] = [
    {
      key: 'name',
      header: 'Colour',
      sortable: true,
      value: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <Swatch hex={c.hexCode} size="lg" />
          <span className="font-medium">{c.name}</span>
          {c.createdById &&
            (c.adminLocked ? (
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
      key: 'hex',
      header: 'Hex',
      sortable: true,
      value: (c) => c.hexCode,
      className: 'font-mono text-muted-foreground',
      render: (c) => c.hexCode,
    },
    {
      key: 'used',
      header: 'Used by',
      sortable: true,
      value: (c) => c._count?.values ?? 0,
      className: 'text-muted-foreground',
      render: (c) => {
        const n = c._count?.values ?? 0;
        return n ? `${n} attribute value${n === 1 ? '' : 's'}` : 'Not used yet';
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) =>
        canEdit(c) ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setTarget(c)}
              aria-label={`Edit ${c.name}`}
              className="row-action hover:text-primary"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => remove(c)}
              aria-label={`Delete ${c.name}`}
              className="row-action hover:bg-sale/10 hover:text-sale"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : isMine(c) && c.adminLocked ? (
          <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Admin-managed
          </span>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Colours</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The palette behind every colour attribute. Shoppers see the swatch rather than the word,
          so a colour is defined once here and reused across every shop.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={colors}
        getRowId={(c) => c.id}
        loading={loading}
        searchPlaceholder="Search colours…"
        empty="No colours yet."
        toolbar={
          <button onClick={() => setTarget('new')} className="btn-primary btn-sm">
            <Plus className="h-3.5 w-3.5" /> Add colour
          </button>
        }
      />

      <ColorEditDialog
        target={target}
        onClose={() => setTarget(null)}
        onSaved={load}
        warnOnCuration={isAdmin}
      />
    </div>
  );
}
