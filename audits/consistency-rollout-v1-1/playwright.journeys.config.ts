/** Consistency roll-out v1.1, Phase 6 — the journey-fields walk (journeys.measure.ts), one worker, after the harness login. */
import { defineConfig } from "@playwright/test";
import base, { STORAGE_STATE } from "../../playwright.config";

export default defineConfig({
  ...base,
  workers: 1,
  projects: [
    { name: "setup", testDir: "../../tests/e2e", testMatch: /auth\.setup\.ts/ },
    { name: "journeys", testDir: ".", testMatch: /journeys\.measure\.ts/, dependencies: ["setup"], use: { storageState: STORAGE_STATE } },
  ],
});
