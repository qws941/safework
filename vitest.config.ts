import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude Playwright E2E tests from Vitest
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**', // Exclude Playwright E2E tests
      '**/*.spec.ts', // Exclude Playwright test files
    ],
    // Include only Vitest test files
    include: [
      '**/tests/**/*.test.ts',
    ],
  },
});
