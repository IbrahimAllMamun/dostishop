import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#22201E',
        canvas: '#FBF8F4',
        surface: '#FFFFFF',
        primary: { DEFAULT: '#A24B5F', dark: '#7E3A49' },
        gold: '#C7A15A',
        sand: '#EDE4D8',
        sale: '#C0392B',
        success: '#2E7D5B',
        muted: '#8A8178',
      },
      fontFamily: {
        display: ['var(--font-display)', 'var(--font-bangla)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'var(--font-bangla)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
      // Layered, colour-tinted shadows (never flat shadow-md)
      boxShadow: {
        lift: '0 1px 2px -1px rgb(34 32 30 / 0.10), 0 8px 20px -6px rgb(162 75 95 / 0.16)',
        float: '0 2px 4px -2px rgb(34 32 30 / 0.10), 0 16px 32px -8px rgb(162 75 95 / 0.20)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 12px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        // 150-300ms micro-interaction band; ease-out on enter
        'fade-up': 'fade-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 220ms ease-out both',
        'scale-in': 'scale-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
