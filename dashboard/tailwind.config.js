/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#22201E',
        canvas: '#F6F3EF',
        surface: '#FFFFFF',
        primary: { DEFAULT: '#A24B5F', dark: '#7E3A49' },
        gold: '#C7A15A',
        sand: '#EDE4D8',
        sale: '#C0392B',
        success: '#2E7D5B',
        warn: '#B8860B',
        muted: '#8A8178',
      },
    },
  },
  plugins: [],
};
