import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite configuration for the Drift Dashboard client.
 * Builds the React frontend to dist/client/ for static serving.
 */
export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  base: '/',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/client/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@client': resolve(__dirname, 'src/client'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3847',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3847',
        ws: true,
      },
    },
  },
});
