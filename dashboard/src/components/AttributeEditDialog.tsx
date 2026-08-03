import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Swatch, swatchInk } from '@/components/Swatch';
import type { Attribute, AttributeKind, Color } from '@/lib/types';

/** `null` = closed, `'new'` = create, an Attribute = edit that one. */
export type AttributeTarget = Attribute | 'new' | null;

/** Two-option segmented control, styled from the existing tokens. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; hint: string }>;
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <div>
      <span className="label">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex rounded-lg bg-muted p-1"
      >
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-muted-foreground hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {active && <p className="mt-1.5 text-xs text-muted-foreground">{active.hint}</p>}
    </div>
  );
}

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
  const user = useAuth((s) => s.user);
  const colorsHref = user?.role === 'SUPER_ADMIN' ? '/admin/colors' : '/vendor/colors';

  const [shown, setShown] = useState<AttributeTarget>(target);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AttributeKind>('TEXT');
  const [isVariant, setIsVariant] = useState(true);
  const [values, setValues] = useState<string[]>([]);
  const [colorIds, setColorIds] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [palette, setPalette] = useState<Color[]>([]);
  useEffect(() => {
    api.get<{ colors: Color[] }>('/colors').then((d) => setPalette(d.colors)).catch(() => {});
  }, [target]);

  useEffect(() => {
    if (!target) return;
    setShown(target);
    const isNewTarget = target === 'new';
    setName(isNewTarget ? '' : target.name);
    setKind(isNewTarget ? 'TEXT' : target.kind);
    setIsVariant(isNewTarget ? true : target.isVariant);
    setValues(isNewTarget ? [] : target.values.map((v) => v.value));
    setColorIds(
      isNewTarget
        ? []
        : target.values.map((v) => v.colorId).filter((id): id is string => Boolean(id)),
    );
    setDraft('');
    setError(null);
  }, [target]);

  /**
   * Switching an existing text attribute to Colour would otherwise start from
   * an empty selection, and saving that reads as "delete every value" — which
   * the server rightly refuses. Seed from the palette by name so the common
   * case (a Colour attribute that was text all along) just works.
   */
  useEffect(() => {
    if (kind !== 'COLOR' || colorIds.length || !values.length || !palette.length) return;
    const byName = new Map(palette.map((c) => [c.name.toLowerCase(), c.id]));
    const matched = values.map((v) => byName.get(v.toLowerCase())).filter((id): id is string => Boolean(id));
    if (matched.length) setColorIds(matched);
  }, [kind, colorIds.length, values, palette]);

  const isNew = shown === 'new';
  const attribute = isNew ? null : (shown as Attribute | null);

  // Values already built into variants pin the scope: turning such an attribute
  // into a specification would strand them, and the server rejects it anyway.
  const builtIntoVariants = (attribute?.values ?? []).some((v) => (v._count?.variants ?? 0) > 0);

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

  function toggleColor(id: string) {
    setColorIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    // A colour attribute's values are colour ids; a text one's are strings, and
    // anything typed but not yet committed still counts.
    const finalValues =
      kind === 'COLOR'
        ? colorIds.map((colorId) => ({ colorId }))
        : draft.trim()
          ? [...new Set([...values, ...draft.split(',').map((p) => p.trim()).filter(Boolean)])]
          : values;

    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), kind, isVariant, values: finalValues };
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
        <DialogContent className="w-[min(94vw,34rem)]">
          <DialogHeader>
            <DialogTitle>{isNew ? 'New attribute' : 'Edit attribute'}</DialogTitle>
            <DialogDescription>
              An attribute is something a product varies along — Size, Colour — or something it is
              described by, like Fabric or Warranty.
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Segmented
                label="Used as"
                value={isVariant ? 'variant' : 'spec'}
                onChange={(next) => setIsVariant(next === 'variant')}
                disabled={builtIntoVariants}
                options={[
                  {
                    value: 'variant',
                    label: 'Variant axis',
                    hint: builtIntoVariants
                      ? 'Products already have variants along this attribute, so it has to stay an axis.'
                      : 'Each value creates its own stock row and price.',
                  },
                  {
                    value: 'spec',
                    label: 'Specification',
                    hint: 'Stated once on the product. Never creates a variant.',
                  },
                ]}
              />
              <Segmented
                label="Values are"
                value={kind}
                onChange={(next) => setKind(next)}
                options={[
                  { value: 'TEXT', label: 'Text', hint: 'Typed freely — S, M, L, Cotton…' },
                  { value: 'COLOR', label: 'Colour', hint: 'Picked from the palette, shown as a swatch.' },
                ]}
              />
            </div>

            {kind === 'COLOR' ? (
              <div>
                <span className="label">Colours</span>
                {palette.length === 0 ? (
                  <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                    The palette is empty. Add colours on the{' '}
                    <Link to={colorsHref} className="text-primary hover:underline">
                      Colours
                    </Link>{' '}
                    page first.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Colours">
                    {palette.map((c, i) => {
                      const selected = colorIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleColor(c.id)}
                          style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}
                          className={`inline-flex animate-row-in items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition-[border-color,background-color,transform] duration-200 ease-out active:scale-[0.97] ${
                            selected
                              ? 'border-primary bg-primary/10 text-primary-strong'
                              : 'border-ink/15 text-ink hover:border-ink/40'
                          }`}
                        >
                          <span className="relative inline-flex">
                            <Swatch hex={c.hexCode} />
                            {/* A tick, not just a border — colour alone can't
                                carry "selected" for everyone. */}
                            {selected && (
                              <Check
                                aria-hidden
                                strokeWidth={3}
                                style={{ color: swatchInk(c.hexCode) }}
                                className="absolute inset-0 m-auto h-3 w-3"
                              />
                            )}
                          </span>
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Manage the palette itself on the{' '}
                  <Link to={colorsHref} className="text-primary hover:underline">
                    Colours
                  </Link>{' '}
                  page. Removing a colour that products already use will be rejected.
                </p>
              </div>
            ) : (
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
            )}

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
