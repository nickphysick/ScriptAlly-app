import { defineConfig } from 'vitest/config';

// Pure-logic test runner. Deliberately standalone (not the app's vite.config.ts) so the
// Tailwind/React plugins and Firebase env aren't pulled into unit tests. Node env: the suites
// here cover pure modules (derivation, enums, orphan logic) with no DOM or Firestore.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
