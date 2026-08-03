/**
 * One way to draw a colour, used by the palette table, the attribute editor and
 * the product form so a maroon looks the same everywhere.
 *
 * The hex alone is never the whole message — a swatch always sits next to its
 * name, or carries one in `title`/`aria-label`. Colour on its own fails both
 * colour-blind users and screen readers.
 */

/** Relative luminance per WCAG, used to decide what a swatch needs to stay visible. */
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
 * A near-white swatch on a white card is invisible without help, and a dark one
 * needs no border at all. Ring strength follows the colour rather than being
 * fixed, so #f5f3ef and #1a1a1a both read as deliberate.
 */
export function swatchRing(hex: string): string {
  return luminance(hex) > 0.75 ? 'ring-1 ring-inset ring-ink/25' : 'ring-1 ring-inset ring-ink/10';
}

/** Ink that stays legible on top of the swatch — for the selected checkmark. */
export function swatchInk(hex: string): string {
  return luminance(hex) > 0.5 ? '#1a1a1a' : '#ffffff';
}

export function Swatch({
  hex,
  name,
  size = 'md',
  className = '',
}: {
  hex: string;
  /** Rendered as the accessible name when the swatch stands alone */
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
  return (
    <span
      aria-hidden={name ? undefined : true}
      role={name ? 'img' : undefined}
      aria-label={name}
      title={name}
      style={{ backgroundColor: hex }}
      className={`inline-block shrink-0 rounded-full ${box} ${swatchRing(hex)} ${className}`}
    />
  );
}

/** Swatch plus name — the default way to show a colour in a list or a cell. */
export function ColorChip({ hex, name }: { hex: string; name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Swatch hex={hex} size="sm" />
      <span>{name}</span>
    </span>
  );
}
