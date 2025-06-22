import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'future'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'future/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/cli/index.ts', // CLI entry point
        'src/tools/**', // Dev tools
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    // TypeScript optimizations
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Faster for small test suites
      },
    },
    // Performance optimizations
    isolate: true, // Ensure proper test isolation for singletons
    passWithNoTests: true,
    // Type checking
    typecheck: {
      enabled: false, // Disable for now, can be enabled when needed
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
