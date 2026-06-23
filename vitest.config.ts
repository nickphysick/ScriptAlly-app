import { defineConfig } from 'vitest/config';

// Pure-logic test runner. Deliberately standalone (not the app's vite.config.ts) so the
// Tailwind/React plugins and Firebase env aren't pulled into unit tests. Node env: the suites
// here cover pure modules (derivation, enums, orphan logic) with no DOM or Firestore.
// functions/src is included so the Smart Import date parser's golden-fixture suite runs under the
// same `npm test` (functions/ has its own tsconfig but no runner of its own; these are pure modules).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'functions/src/**/*.test.ts'],
  },
});
