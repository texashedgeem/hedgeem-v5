import { defineConfig } from 'vite';

export default defineConfig({
  // Assets served from src/assets/ (cards, sounds, images)
  publicDir: 'src/assets',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    port: 4000,
  },

  // Vitest config lives here so it shares the same Vite pipeline
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**'],
      reporter: ['text', 'html'],
    },
  },
});
