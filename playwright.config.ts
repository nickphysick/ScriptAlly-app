/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Playwright — REAL-BROWSER MEASUREMENT, and it exists because harnesses kept lying.
 *
 * ⚠️ A HARNESS IS A RECONSTRUCTION OF THE PAGE THAT CONTAINS ONLY WHAT SOMEONE REMEMBERED TO PUT
 * IN IT. Four separate harness results were wrong in one day, each agreeing with itself while
 * measuring something the app does not render: a `pkgw-mschip` class that exists nowhere, a
 * stylesheet that 404'd and parsed to zero rules, a first-match slice that read a grouped stub
 * instead of the real rule, and a `(?!100%)` lookahead that matches `100%`. This opens the
 * deployed page and asks the browser.
 *
 * ⚠️ LOCAL ONLY. Not wired into CI — that needs secret handling and is a separate decision.
 *
 * ⚠️ IT MEASURES THE DEPLOYED DEV SITE, NOT A LOCAL SERVER, deliberately. The faults being chased
 * are in what SHIPS: the built stylesheet, its cascade, and the real DOM. A `vite dev` server
 * serves unbundled sources and would reintroduce exactly the gap between "what I built" and "what
 * is served" that this is here to close.
 */
import { defineConfig, devices } from "@playwright/test";

/** The deployed dev site. Override for a one-off against another target. */
export const BASE_URL = process.env.SA_E2E_BASE_URL ?? "https://scriptally-dev.web.app";

/** The saved logged-in session. Gitignored — it IS a credential. */
export const STORAGE_STATE = "tests/e2e/.auth/state.json";

export default defineConfig({
  testDir: "tests/e2e",
  /* measurement, not a test suite — one worker keeps the numbers attributable and the log readable */
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  /* each measurement signs in — Firebase auth lives in IndexedDB, which storageState cannot carry */
  timeout: 120_000,
  use: {
    baseURL: BASE_URL,
    /**
     * ⚠️ CLASSIC SCROLLBARS, FORCED. macOS defaults to overlay scrollbars, which take no layout
     * width — and that hid a real 15px content loss for a full session, because every measurement
     * taken on this machine agreed with every other one. Every report states the mode.
     */
    /* ⚠️ THE DEVICE SPREAD COMES FIRST. Below the settings it overrides them — my first version
       put it last and silently reset the viewport to the device's 1280x720 while the config said
       1440x900. Same shape as a CSS rule losing to a later one. */
    ...devices["Desktop Chrome"],
    /**
     * ⚠️ CLASSIC SCROLLBARS, AND THE FLAG ALONE DOES NOT DO IT. Headless Chromium reported a 0px
     * scrollbar with `--disable-features=OverlayScrollbar`, i.e. overlay — the exact mode that hid
     * a 15px content loss for a session. `--hide-scrollbars=false` plus the plural feature name is
     * what actually lands classic bars; `scrollbarWidth()` asserts the outcome rather than trusting
     * the flag, and every report states the measured width.
     */
    launchOptions: { args: ["--disable-features=OverlayScrollbars", "--hide-scrollbars=false"] },
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "measure",
      testMatch: /.*\.measure\.ts/,
      dependencies: ["setup"],
      use: { storageState: STORAGE_STATE },
    },
  ],
});
