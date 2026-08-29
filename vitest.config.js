import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.js'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'sw.js',
      'vite.config.js',
      'cursive-connector.test.js',
      'diagram-engine.test.js',
      'doubt-solver.test.js',
      'solution-streaming.test.js',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
