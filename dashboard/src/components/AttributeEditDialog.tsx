import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Attribute } from '@/lib/types';

/** `null` = closed, `'new'` = create, an Attribute = edit that one. */
export type AttributeTarget = Attribute | 'new' | null;

export function AttributeEditDialog({
  target,
  onClose,
  onSaved,
  warnOnCuration,
}: {
  target: AttributeTarget;
  onClose: () => void;
  onSaved: () => void;
  warnOnCuration?: boolean;
}) {
  const [shown, setShown] = useState<AttributeTarget>(target);
  const [name, setName] = useState('');
  const [values, setValues] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setShown(target);
    setName(target === 'new' ? '' : target.name);
    setValues(target === 'new' ? [] : target.values.map((v) => v.value));
    setDraft('');
    setError(null);
  }, [target]);

  const isNew = shown === 'new';
  const attribute = isNew ? null : (shown as Attribute | null);

  /** Commit whatever is in the box — comma or Enter both add. */
  function commitDraft(raw = draft) {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setValues((v) => [...new Set([...v, ...parts])]);
    setDraft('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    // Don't lose a value the user typed but never committed
    const finalValues = draft.trim()
      ? [...new Set([...values, ...draft.split(',').map((p) => p.trim()).filter(Boolean)])]
      : values;

    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), values: finalValues };
      if (isNew) await api.post('/attributes', payload);
      else await api.patch(`/attributes/${attribute!.id}`, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const takingOver = warnOnCuration && attribute?.createdById && !attribute.adminLocked;

  return (
    <Dialog open={Boolean(target)} onOpenChange={(next) => !next && onClose()}>
      {shown && (
        <DialogContent className="w-[min(94vw,32rem)]">
          <DialogHeader>
            <DialogTitle>{isNew ? 'New attribute' : 'Edit attribute'}</DialogTitle>
            <DialogDescription>
              An attribute is a dimension a product varies along — Size, Colour, Material. Its
              values become the choices on a product's variants.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="grid gap-4">
            {takingOver && (
              <p className="rounded-lg bg-gold/15 px-3 py-2 text-xs text-warn-strong">
                A vendor added this attribute. Saving hands ownership to the platform — they will
                not be able to change it afterwards.
              </p>
            )}
            {error && (
              <p className="animate-fade-up rounded-lg bg-sale/10 px-3 py-2 text-sm text-sale-strong">
                {error}
              </p>
            )}

            <div>
              <label className="label" htmlFor="attr-name">
                Name
              </label>
              <input
                id="attr-name"
                autoFocus
                required
                className="input"
                placeholder="e.g. Material"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="attr-value">
                Values
              </label>
              {values.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {values.map((v, i) => (
                    <span
                      key={v}
                      style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}
                      className="badge animate-row-in bg-muted pr-1 text-ink"
                    >
                      {v}
                      <button
                        type="button"
                        onClick={() => setValues((list) => list.filter((x) => x !== v))}
                        aria-label={`Remove ${v}`}
                        className="flex h-5 w-5 items-center justify-center rounded-full transition-[background-color,transform] duration-200 ease-out hover:bg-ink/10 active:scale-90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                id="attr-value"
                className="input"
                placeholder="Type a value and press Enter"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    // Enter must not submit the form while adding values
                    e.preventDefault();
                    commitDraft();
                  } else if (e.key === 'Backspace' && !draft && values.length) {
                    setValues((list) => list.slice(0, -1));
                  }
                }}
                onBlur={() => commitDraft()}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Removing a value that products already use will be rejected.
              </p>
            </div>

            <DialogFooter>
              <button type="button" onClick={onClose} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
                {saving ? 'Saving…' : isNew ? 'Create attribute' : 'Save changes'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
