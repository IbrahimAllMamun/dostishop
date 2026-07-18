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
    },
  },
  plugins: [],
} satisfies Config;
