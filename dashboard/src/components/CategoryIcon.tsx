import {
  Baby,
  Backpack,
  Briefcase,
  Crown,
  Gem,
  Gift,
  Glasses,
  Heart,
  Home,
  Palette,
  ShoppingBag,
  Shirt,
  Smile,
  Sparkles,
  Star,
  Tag,
  Watch,
  Wind,
  type LucideIcon,
} from 'lucide-react';

/**
 * A closed set rather than all of lucide: the value is stored as a string in
 * the database, so an open list would let a typo render nothing. Everything
 * here suits the marketplace's verticals — bags, jewelry, cosmetics,
 * clothing, footwear.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  ShoppingBag,
  Backpack,
  Briefcase,
  Shirt,
  Watch,
  Gem,
  Crown,
  Sparkles,
  Palette,
  Smile,
  Glasses,
  Heart,
  Gift,
  Star,
  Tag,
  Home,
  Baby,
  Wind,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

/** Image first, then icon, then a neutral placeholder — never an empty cell. */
export function CategoryIcon({
  icon,
  imageUrl,
  name,
  className = 'h-9 w-9',
}: {
  icon?: string | null;
  imageUrl?: string | null;
  name?: string;
  className?: string;
}) {
  if (imageUrl) {
    return <img src={imageUrl} alt="" className={`${className} shrink-0 rounded-lg object-cover`} />;
  }
  const Icon = icon ? CATEGORY_ICONS[icon] : undefined;
  return (
    <span
      aria-hidden
      title={name}
      className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground`}
    >
      {Icon ? <Icon className="h-[18px] w-[18px]" /> : <Tag className="h-[18px] w-[18px] opacity-50" />}
    </span>
  );
}

/** Radio-style grid. `value` of '' means "no icon". */
export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Category icon" className="flex flex-wrap gap-1.5">
      <button
        type="button"
        role="radio"
        aria-checked={value === ''}
        aria-label="No icon"
        onClick={() => onChange('')}
        className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xs transition-[border-color,background-color,transform] duration-200 ease-out active:scale-90 ${
          value === '' ? 'border-primary bg-primary/10 text-primary' : 'border-ink/15 text-muted-foreground hover:border-ink/40'
        }`}
      >
        —
      </button>
      {CATEGORY_ICON_NAMES.map((name) => {
        const Icon = CATEGORY_ICONS[name];
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            title={name}
            onClick={() => onChange(name)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-[border-color,background-color,transform] duration-200 ease-out active:scale-90 ${
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-ink/15 text-muted-foreground hover:border-ink/40 hover:text-ink'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        );
      })}
    </div>
  );
}
