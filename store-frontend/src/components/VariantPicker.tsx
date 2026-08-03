'use client';
import { useMemo } from 'react';
import type { Variant } from '@/lib/types';

export interface AttributeOption {
  value: string;
  /** Set when the value is backed by the colour palette — the swatch fill */
  hex: string | null;
}

export interface AttributeGroup {
  slug: string;
  name: string;
  /** True when every value carries a colour, so the row renders as swatches */
  isColor: boolean;
  values: AttributeOption[];
}

/** The value this variant carries for a given attribute, if any. */
function valueFor(v: Variant, slug: string): string | undefined {
  return v.attributes?.find((a) => a.value.attribute.slug === slug)?.value.value;
}

/**
 * One picker row per attribute, derived from the variants themselves.
 *
 * Attributes are ordered by first appearance, which follows the API's
 * `sortOrder`, so Size stays before Colour. Values are de-duplicated and keep
 * the order they appear in — the registry already sorts them.
 */
export function attributeGroups(variants: Variant[]): AttributeGroup[] {
  const groups = new Map<string, AttributeGroup>();
  for (const v of variants) {
    for (const a of v.attributes ?? []) {
      const { slug, name } = a.value.attribute;
      const g = groups.get(slug) ?? { slug, name, isColor: false, values: [] };
      if (!g.values.some((o) => o.value === a.value.value)) {
        g.values.push({ value: a.value.value, hex: a.value.color?.hexCode ?? null });
      }
      groups.set(slug, g);
    }
  }
  // A row only becomes swatches when every one of its values has a colour.
  // A half-painted row would read as "these three are unavailable".
  for (const g of groups.values()) {
    g.isColor = g.values.length > 0 && g.values.every((o) => Boolean(o.hex));
  }
  return [...groups.values()];
}

/** Relative luminance per WCAG — decides what a swatch needs to stay visible. */
function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * A cream swatch on a cream page is invisible without a border, and a black one
 * needs none. Strength follows the colour so both read as deliberate.
 */
function swatchRing(hex: string): string {
  return luminance(hex) > 0.75 ? 'ring-1 ring-inset ring-ink/30' : 'ring-1 ring-inset ring-ink/10';
}

/** Attributes the shopper actually chooses between. */
export function choiceGroups(groups: AttributeGroup[]): AttributeGroup[] {
  return groups.filter((g) => g.values.length > 1);
}

/** Attributes fixed for every variant — shown as a detail, never as a button. */
export function fixedGroups(groups: AttributeGroup[]): AttributeGroup[] {
  return groups.filter((g) => g.values.length === 1);
}

/** Variants still reachable given the picks made so far. */
export function matching(variants: Variant[], picked: Record<string, string>): Variant[] {
  return variants.filter((v) =>
    Object.entries(picked).every(([slug, value]) => !value || valueFor(v, slug) === value),
  );
}

/**
 * Is there a variant carrying `value` on `slug` that also honours the picks
 * already made on the other axes? In stock unless `anyStock` says otherwise.
 */
export function combinationExists(
  variants: Variant[],
  picked: Record<string, string>,
  slug: string,
  value: string,
  requireStock = true,
): boolean {
  const wanted = { ...picked, [slug]: value };
  return variants.some(
    (v) =>
      (!requireStock || v.stockQty > 0) &&
      Object.entries(wanted).every(([s, val]) => !val || valueFor(v, s) === val),
  );
}

/**
 * Each axis is chosen independently: picking a colour keeps the size.
 *
 * Only when the resulting combination does not exist does this fall back to
 * adopting a whole variant. That still matters — the older seeded products
 * predate the matrix editor and are sparse, so three variants can span three
 * attributes with no shared axis, and holding the other picks fixed there would
 * strand the shopper on whichever variant loaded first. Dense catalogues never
 * reach the fallback.
 */
export function pickValue(
  variants: Variant[],
  groups: AttributeGroup[],
  picked: Record<string, string>,
  slug: string,
  value: string,
): Record<string, string> {
  // The independent case: hold every other axis exactly where it is. An
  // existing but sold-out combination still counts — telling the shopper this
  // size is out in that colour beats silently moving them to another size.
  const held = { ...picked, [slug]: value };
  if (matching(variants, held).length > 0) return held;

  const carriers = variants.filter((v) => valueFor(v, slug) === value);
  const inStock = carriers.filter((v) => v.stockQty > 0);
  const pool = inStock.length ? inStock : carriers;
  if (!pool.length) return held;

  // Repair by adopting the variant that agrees with the most of the selection
  let best = pool[0];
  let bestScore = -1;
  for (const v of pool) {
    const score = groups.reduce(
      (n, g) =>
        g.slug !== slug && picked[g.slug] && valueFor(v, g.slug) === picked[g.slug] ? n + 1 : n,
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return Object.fromEntries(
    (best.attributes ?? []).map((a) => [a.value.attribute.slug, a.value.value]),
  );
}

/**
 * Resolve picks to a single variant. Returns null while the choice is still
 * ambiguous, so the caller can keep the add-to-cart button disabled.
 */
export function resolveVariant(
  variants: Variant[],
  groups: AttributeGroup[],
  picked: Record<string, string>,
): Variant | null {
  // Only the choosable attributes need a pick; fixed ones are implied
  if (choiceGroups(groups).some((g) => !picked[g.slug])) return null;
  const hits = matching(variants, picked);
  return hits[0] ?? null;
}

export function VariantPicker({
  variants,
  groups,
  picked,
  onPick,
}: {
  variants: Variant[];
  groups: AttributeGroup[];
  picked: Record<string, string>;
  /** Receives the complete next selection, already repaired to a real variant. */
  onPick: (next: Record<string, string>) => void;
}) {
  const choices = useMemo(() => choiceGroups(groups), [groups]);
  const fixed = useMemo(() => fixedGroups(groups), [groups]);

  /**
   * With independent axes a value falls into one of four states, and they need
   * different words — "out of stock" and "doesn't come in that combination" are
   * different facts, and a generated matrix is full of the first.
   *
   * - `fits`    — in stock alongside the picks already made; the normal case.
   * - `soldOut` — that exact combination exists but has no stock. Clickable:
   *   the shopper is entitled to land on it and read why.
   * - `stale`   — no such combination, but the value is in stock elsewhere.
   *   Clicking repairs the other axes.
   * - `dead`    — nothing carries it in stock anywhere, so it is disabled.
   *
   * Compared against `picked` minus this axis, or every value would judge
   * itself against the shopper's existing pick and only the selected one would
   * ever fit.
   */
  const availability = useMemo(() => {
    const map = new Map<string, { fits: boolean; soldOut: boolean; stale: boolean }>();
    for (const g of choices) {
      const others = { ...picked };
      delete others[g.slug];
      for (const option of g.values) {
        const inStockHere = combinationExists(variants, others, g.slug, option.value);
        const existsHere = combinationExists(variants, others, g.slug, option.value, false);
        const inStockAnywhere = combinationExists(variants, {}, g.slug, option.value);
        map.set(`${g.slug}:${option.value}`, {
          fits: inStockHere,
          soldOut: existsHere && !inStockHere,
          stale: !existsHere && inStockAnywhere,
        });
      }
    }
    return map;
  }, [variants, choices, picked]);

  if (!groups.length) return null;

  return (
    <div className="space-y-4">
      {/* Fixed for every variant — information, not a decision */}
      {fixed.length > 0 && (
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {fixed.map((g) => (
            <div key={g.slug} className="flex items-center gap-1.5">
              <dt className="text-muted">{g.name}</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                {g.values[0].hex && (
                  <span
                    aria-hidden
                    style={{ backgroundColor: g.values[0].hex }}
                    className={`inline-block h-3.5 w-3.5 rounded-full ${swatchRing(g.values[0].hex)}`}
                  />
                )}
                {g.values[0].value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {choices.map((g) => (
        <div key={g.slug} className="space-y-2">
          {/* The chosen value is named here as well as shown, so a swatch row
              never leaves colour as the only carrier of the choice. */}
          <p className="text-sm font-medium">
            {g.name}
            {picked[g.slug] && (
              <span className="ml-1.5 font-normal text-muted">{picked[g.slug]}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={g.name}>
            {g.values.map((option) => {
              const selected = picked[g.slug] === option.value;
              const { fits, soldOut, stale } = availability.get(`${g.slug}:${option.value}`) ?? {
                fits: false,
                soldOut: false,
                stale: false,
              };
              const dead = !fits && !soldOut && !stale;
              const onPickThis = () =>
                onPick(pickValue(variants, groups, picked, g.slug, option.value));

              // Screen readers get the reason, not just the absence of one
              const label = fits
                ? option.value
                : stale
                  ? `${option.value} — not available with your current selection`
                  : `${option.value} — out of stock`;
              // Struck through when unbuyable; merely stale stays whole, since
              // one click brings it back
              const struck = soldOut || dead;

              if (g.isColor && option.hex) {
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={onPickThis}
                    disabled={dead}
                    aria-pressed={selected}
                    // The only label this control has — the swatch is decoration
                    aria-label={label}
                    title={label}
                    className={`grid h-11 w-11 place-items-center rounded-full transition-[box-shadow,transform,opacity] duration-200 ease-out active:scale-95 ${
                      selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''
                    } ${fits ? '' : dead ? 'cursor-not-allowed opacity-40 active:scale-100' : 'opacity-45'}`}
                  >
                    <span
                      aria-hidden
                      style={{ backgroundColor: option.hex }}
                      className={`relative block h-8 w-8 rounded-full ${swatchRing(option.hex)}`}
                    >
                      {struck && (
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="h-px w-9 -rotate-45 bg-ink/70" />
                        </span>
                      )}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={onPickThis}
                  disabled={dead}
                  aria-pressed={selected}
                  aria-label={fits ? undefined : label}
                  title={fits ? undefined : label}
                  className={`min-h-11 rounded-full border px-4 text-sm transition-[background-color,border-color,color,transform,opacity] duration-200 ease-out active:scale-95 ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-ink/15 text-ink hover:border-ink'
                  } ${fits ? '' : 'opacity-45'} ${struck ? 'line-through' : ''} ${
                    dead ? 'cursor-not-allowed opacity-40 active:scale-100' : ''
                  }`}
                >
                  {option.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
