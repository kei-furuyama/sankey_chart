import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['powerbi/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
  },
});
