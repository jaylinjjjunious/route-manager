/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.mts'],
    exclude: ['tests/*.cjs', 'node_modules', 'dist'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/services/scan/**'],
      reporter: ['text'],
    },
  },
});
