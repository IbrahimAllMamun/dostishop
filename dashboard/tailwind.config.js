import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Brand palette (Boutique BD) ----
        ink: '#22201E',
        canvas: '#F6F3EF',
        surface: '#FFFFFF',
        gold: '#C7A15A',
        sand: '#EDE4D8',
        sale: '#C0392B',
        success: '#2E7D5B',
        warn: '#B8860B',

        // ---- Shared with shadcn: brand value + the semantic pair it needs ----
        primary: {
          DEFAULT: '#A24B5F',
          dark: '#7E3A49',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // `muted` is shadcn's subtle SURFACE; secondary text is `muted-foreground`
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },

        // ---- shadcn semantic tokens (values defined in index.css) ----
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Layered, colour-tinted shadows (never flat shadow-md)
      boxShadow: {
        lift: '0 1px 2px -1px rgb(34 32 30 / 0.10), 0 8px 20px -6px rgb(162 75 95 / 0.16)',
        float: '0 2px 4px -2px rgb(34 32 30 / 0.10), 0 16px 32px -8px rgb(162 75 95 / 0.20)',
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
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // Informational UI: plain ease-out, no back.out overshoot on data views
        'fade-up': 'fade-up 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
