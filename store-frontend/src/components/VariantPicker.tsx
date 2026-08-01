'use client';
import { useMemo } from 'react';
import type { Variant } from '@/lib/types';

export interface AttributeGroup {
  slug: string;
  name: string;
  values: string[];
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
      const g = groups.get(slug) ?? { slug, name, values: [] };
      if (!g.values.includes(a.value.value)) g.values.push(a.value.value);
      groups.set(slug, g);
    }
  }
  return [...groups.values()];
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
 * Choosing a value adopts a whole variant, rather than changing one axis and
 * hoping the result exists.
 *
 * Real catalogues are sparse — three variants can span three attributes with
 * no shared axis at all. Holding the other picks fixed would then make every
 * neighbouring combination invalid and strand the shopper on whichever variant
 * loaded first. So: take the in-stock variant carrying this value that agrees
 * with the most of the current selection, and adopt all of its values.
 */
export function pickValue(
  variants: Variant[],
  groups: AttributeGroup[],
  picked: Record<string, string>,
  slug: string,
  value: string,
): Record<string, string> {
  const carriers = variants.filter((v) => valueFor(v, slug) === value);
  const inStock = carriers.filter((v) => v.stockQty > 0);
  const pool = inStock.length ? inStock : carriers;
  if (!pool.length) return { ...picked, [slug]: value };

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
   * A value is offered when some in-stock variant carries it at all — not only
   * when it fits alongside the current picks. Clicking repairs the rest of the
   * selection, so anything reachable stays clickable.
   */
  const availability = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const g of choices) {
      for (const value of g.values) {
        map.set(
          `${g.slug}:${value}`,
          variants.some((v) => v.stockQty > 0 && v.attributes?.some(
            (a) => a.value.attribute.slug === g.slug && a.value.value === value,
          )),
        );
      }
    }
    return map;
  }, [variants, choices]);

  if (!groups.length) return null;

  return (
    <div className="space-y-4">
      {/* Fixed for every variant — information, not a decision */}
      {fixed.length > 0 && (
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {fixed.map((g) => (
            <div key={g.slug} className="flex gap-1.5">
              <dt className="text-muted">{g.name}</dt>
              <dd className="font-medium">{g.values[0]}</dd>
            </div>
          ))}
        </dl>
      )}

      {choices.map((g) => (
        <div key={g.slug} className="space-y-2">
          <p className="text-sm font-medium">
            {g.name}
            {picked[g.slug] && (
              <span className="ml-1.5 font-normal text-muted">{picked[g.slug]}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={g.name}>
            {g.values.map((value) => {
              const selected = picked[g.slug] === value;
              const available = availability.get(`${g.slug}:${value}`) ?? false;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onPick(pickValue(variants, groups, picked, g.slug, value))}
                  disabled={!available}
                  aria-pressed={selected}
                  className={`min-h-11 rounded-full border px-4 text-sm transition-[background-color,border-color,color,transform] duration-200 ease-out active:scale-95 ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-ink/15 text-ink hover:border-ink'
                  } ${available ? '' : 'cursor-not-allowed opacity-40 line-through active:scale-100'}`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
