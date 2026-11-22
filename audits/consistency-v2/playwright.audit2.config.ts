/**
 * Consistency audit v2 — Playwright config: the repo's own sign-in (tests/e2e/auth.setup.ts) then the audit, one
 * worker. Through the emulator lane only:
 *   npm run e2e:emu -- --config audits/consistency-v2/playwright.audit2.config.ts      (CA2_MODE=audit, the default)
 *   npm run audit:rules                                                                  (CA2_MODE=rules)
 */
import { defineConfig } from "@playwright/test";
import base, { STORAGE_STATE } from "../../playwright.config";

export default defineConfig({
  ...base,
  workers: 1,
  projects: [
    { name: "setup", testDir: "../../tests/e2e", testMatch: /auth\.setup\.ts/ },
    { name: "audit2", testDir: ".", testMatch: /audit2\.measure\.ts/, dependencies: ["setup"], use: { storageState: STORAGE_STATE } },
  ],
});
