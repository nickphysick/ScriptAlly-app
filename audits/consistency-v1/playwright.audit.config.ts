/**
 * Consistency audit v1 — Playwright config. The repo's config with two projects: its own sign-in
 * (tests/e2e/auth.setup.ts, unchanged) and the audit. Run through the emulator lane only:
 *   npm run e2e:emu -- --config audits/consistency-v1/playwright.audit.config.ts
 */
import { defineConfig } from "@playwright/test";
import base, { STORAGE_STATE } from "../../playwright.config";

export default defineConfig({
  ...base,
  workers: 1,
  projects: [
    { name: "setup", testDir: "../../tests/e2e", testMatch: /auth\.setup\.ts/ },
    { name: "audit", testDir: ".", testMatch: /audit\.measure\.ts/, dependencies: ["setup"], use: { storageState: STORAGE_STATE } },
  ],
});
