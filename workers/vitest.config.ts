export default {
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
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/**',
        '**/e2e/**',
        '**/templates/**', // Exclude large HTML template files
        '**/*.config.ts',
        '**/*.spec.ts',
        '**/types/**',
      ],
      // Target: 60% minimum coverage (excluding templates)
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
  },
};
