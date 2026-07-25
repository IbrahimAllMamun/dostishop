import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // Expose both prefixes: VITE_ (Vite convention) and NEXT_PUBLIC_ (used in Vercel setup)
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: {
    port: 5174,
  },
});
