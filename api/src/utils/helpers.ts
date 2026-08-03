export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateOrderNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${ymd}-${rand}`;
}

/** Round to 2 decimal places (money). */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * The two attributes whose values are mirrored onto `ProductVariant.size` /
 * `ProductVariant.color`. Those denormalised columns still feed checkout
 * labels, CSV import/export and the storefront facets, so exactly one attribute
 * may own each — a vendor's second colour-kind attribute ("Shade") must not
 * write to `color`. Anything deriving or syncing those columns reads these.
 */
export const SIZE_AXIS_SLUG = 'size';
export const COLOR_AXIS_SLUG = 'color';
