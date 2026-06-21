import { defineConfig } from 'vitest/config';

// Separate Vitest config for Firestore Security Rules tests.
// Requires the Firestore emulator to be running (started by firebase emulators:exec).
// Run via: npm run test:rules (wraps this in firebase emulators:exec --only firestore).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: { concurrent: false },
  },
});
