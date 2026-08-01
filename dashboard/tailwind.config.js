import tailwindcssAnimate from 'tailwindcss-animate';

/** Every colour resolves through a CSS variable so the `.dark` class can swap
 *  the whole palette without a single component changing. The `<alpha-value>`
 *  placeholder is what makes opacity modifiers (`bg-muted/60`) actually work —
 *  a bare `hsl(var(--x))` silently drops them. */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Brand palette (Dosti Shop) ----
        ink: token('ink'),
        canvas: token('canvas'),
        surface: token('surface'),
        gold: token('gold'),
        sand: token('sand'),
        // `strong` is the foreground used on a tint of the same hue (badges)
        sale: { DEFAULT: token('sale'), strong: token('sale-strong') },
        success: { DEFAULT: token('success'), strong: token('success-strong') },
        warn: { DEFAULT: token('warn'), strong: token('warn-strong') },

        // The sidebar stays dark in both themes, so it owns its own pair
        sidebar: {
          DEFAULT: token('sidebar'),
          foreground: token('sidebar-foreground'),
        },

        // ---- Shared with shadcn: brand value + the semantic pair it needs ----
        primary: {
          DEFAULT: token('primary'),
          dark: token('primary-dark'),
          strong: token('primary-strong'),
          foreground: token('primary-foreground'),
        },
        // `muted` is shadcn's subtle SURFACE; secondary text is `muted-foreground`
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },

        // ---- shadcn semantic tokens (values defined in index.css) ----
        background: token('background'),
        foreground: token('foreground'),
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        secondary: {
          DEFAULT: token('secondary'),
          foreground: token('secondary-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },
        destructive: {
          DEFAULT: token('destructive'),
          foreground: token('destructive-foreground'),
        },
        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
        },
        popover: {
          DEFAULT: token('popover'),
          foreground: token('popover-foreground'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Dashboard density — an intentional scale, not arbitrary Tailwind steps
      spacing: {
        gutter: '1.5rem',
        'card-p': '1.25rem',
      },
      // Layered, colour-tinted shadows (never flat shadow-md)
      boxShadow: {
        lift: '0 1px 2px -1px rgb(34 32 30 / 0.10), 0 8px 20px -6px rgb(162 75 95 / 0.16)',
        float: '0 2px 4px -2px rgb(34 32 30 / 0.10), 0 16px 32px -8px rgb(162 75 95 / 0.20)',
      },
      // Named so it can be used as `ease-settle` — the arbitrary-value form
      // `ease-[cubic-bezier(...)]` is ambiguous to Tailwind and warns at build.
      transitionTimingFunction: {
        settle: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 10px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        // Table rows settle in from a short horizontal offset as a page loads
        'row-in': {
          from: { opacity: '0', transform: 'translate3d(-6px, 0, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'drawer-in': {
          from: { transform: 'translate3d(-100%, 0, 0)' },
          to: { transform: 'translate3d(0, 0, 0)' },
        },
        'drawer-out': {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(-100%, 0, 0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // Informational UI: plain ease-out, no back.out overshoot on data views
        'fade-up': 'fade-up 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'row-in': 'row-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        // Exit is quicker than enter — dismissal should feel immediate
        'drawer-in': 'drawer-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'drawer-out': 'drawer-out 160ms cubic-bezier(0.4, 0, 1, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
