/**
 * Chart palette and shared axis config.
 *
 * The categorical order below was validated with the dataviz skill's checker,
 * not chosen by eye. In light mode it passes every check outright. In dark it
 * passes lightness, chroma, CVD separation and the normal-vision floor, with a
 * contrast warning on the blue and purple steps — which is why every chart
 * using it ships a legend AND a table view. That relief is required, not
 * optional.
 *
 * One palette serves both themes on purpose: a series colour identifies the
 * entity, so it must not change when the viewer flips the theme.
 */
export const CATEGORICAL = [
  '#A24B5F', // clay rose — the brand primary, always series 1
  '#B8791F', // amber
  '#2F9E68', // green
  '#2563A8', // blue
  '#C0562B', // terracotta
  '#6D4C9F', // purple
] as const;

/** Hues are assigned in fixed order and never cycled. Beyond six, fold into
 *  "Other" rather than generating a seventh colour. */
export function seriesColor(index: number): string {
  return CATEGORICAL[index] ?? 'hsl(var(--muted-foreground))';
}

/** Group a long tail into a single "Other" slice so colours stay meaningful. */
export function withOther<T extends { name: string; revenue: number }>(
  rows: T[],
  max = CATEGORICAL.length,
): Array<{ name: string; revenue: number }> {
  if (rows.length <= max) return rows;
  const head = rows.slice(0, max - 1);
  const tail = rows.slice(max - 1);
  return [
    ...head,
    { name: 'Other', revenue: Math.round(tail.reduce((n, r) => n + r.revenue, 0) * 100) / 100 },
  ];
}

/** Recessive grid and axes — the data is the subject, not the frame. */
export const AXIS = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const GRID_STROKE = 'hsl(var(--ink) / 0.08)';

/** Short day label for a YYYY-MM-DD key. */
export function dayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
