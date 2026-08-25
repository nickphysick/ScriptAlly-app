import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['functions/src/**/*.emulator.spec.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: { concurrent: false },
  },
});
