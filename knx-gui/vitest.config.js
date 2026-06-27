import { defineConfig } from 'vitest/config';

// Self-contained config so vitest does not walk up into the parent repo's
// vite/postcss/tailwind setup. KNX unit tests are pure logic — no CSS pipeline.
export default defineConfig({
  css: { postcss: { plugins: [] } },
  test: {
    root: '.',
    include: ['src/**/*.test.js'],
    environment: 'node',
    // Round-trip tests parse + repack the real 7.5MB .knxproj; ZIP work is heavy.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
