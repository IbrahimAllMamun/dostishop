import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Swatch } from '@/components/Swatch';
import type { Color } from '@/lib/types';

/** `null` = closed, `'new'` = create, a Color = edit that one. */
export type ColorTarget = Color | 'new' | null;

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** A neutral starting point that is obviously a placeholder, not a real product colour. */
const DEFAULT_HEX = '#b7b7b7';

export function ColorEditDialog({
  target,
  onClose,
  onSaved,
  warnOnCuration,
}: {
  target: ColorTarget;
  onClose: () => void;
  onSaved: () => void;
  warnOnCuration?: boolean;
}) {
  // Keep the last payload while the dialog animates out — unmounting mid-exit
  // leaves Radix animating an empty box.
  const [shown, setShown] = useState<ColorTarget>(target);
  const [name, setName] = useState('');
  const [hex, setHex] = useState(DEFAULT_HEX);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setShown(target);
    setName(target === 'new' ? '' : target.name);
    setHex(target === 'new' ? DEFAULT_HEX : target.hexCode);
    setError(null);
  }, [target]);

  const isNew = shown === 'new';
  const color = isNew ? null : (shown as Color | null);
  const valid = HEX.test(hex.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !valid) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), hexCode: hex.trim().toLowerCase() };
      if (isNew) await api.post('/colors', payload);
      else await api.patch(`/colors/${color!.id}`, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const takingOver = warnOnCuration && color?.createdById && !color.adminLocked;
  const inUse = color?._count?.values ?? 0;

  return (
    <Dialog open={Boolean(target)} onOpenChange={(next) => !next && onClose()}>
      {shown && (
        <DialogContent className="w-[min(94vw,28rem)]">
          <DialogHeader>
            <DialogTitle>{isNew ? 'New colour' : 'Edit colour'}</DialogTitle>
            <DialogDescription>
              A name and a hex code. Every product using this colour shows the same swatch, so
              correcting it here corrects it everywhere.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="grid gap-4">
            {takingOver && (
              <p className="rounded-lg bg-gold/15 px-3 py-2 text-xs text-warn-strong">
                A vendor added this colour. Saving hands ownership to the platform — they will not
                be able to change it afterwards.
              </p>
            )}
            {error && (
              <p className="animate-fade-up rounded-lg bg-sale/10 px-3 py-2 text-sm text-sale-strong">
                {error}
              </p>
            )}

            <div>
              <label className="label" htmlFor="color-name">
                Name
              </label>
              <input
                id="color-name"
                autoFocus
                required
                className="input"
                placeholder="e.g. Charcoal"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="color-hex">
                Colour
              </label>
              <div className="flex items-center gap-3">
                {/* The native picker is the fast path; the text field is the
                    precise one. Both write the same state. */}
                <input
                  type="color"
                  aria-label="Pick a colour"
                  value={valid ? hex : DEFAULT_HEX}
                  onChange={(e) => setHex(e.target.value)}
                  className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-ink/15 bg-surface p-1"
                />
                <input
                  id="color-hex"
                  className="input font-mono"
                  placeholder="#6e1f2e"
                  spellCheck={false}
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                  aria-invalid={!valid}
                  aria-describedby="color-hex-help"
                />
              </div>
              <p id="color-hex-help" className="mt-1.5 text-xs text-muted-foreground">
                {valid ? (
                  <span className="inline-flex items-center gap-1.5">
                    Preview <Swatch hex={hex.trim()} size="sm" /> {name.trim() || 'unnamed'}
                  </span>
                ) : (
                  <span className="text-sale-strong">Use a hex code such as #6e1f2e</span>
                )}
              </p>
            </div>

            {!isNew && inUse > 0 && (
              <p className="text-xs text-muted-foreground">
                Used by {inUse} attribute value{inUse === 1 ? '' : 's'}. Renaming updates the label
                on every product that uses it.
              </p>
            )}

            <DialogFooter>
              <button type="button" onClick={onClose} className="btn-ghost">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim() || !valid}
                className="btn-primary"
              >
                {saving ? 'Saving…' : isNew ? 'Create colour' : 'Save changes'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
