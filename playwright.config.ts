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
 * ⚠️ IT MEASURES A BUILT BUNDLE, NEVER SOURCE. The faults being chased are in what SHIPS: the
 * built stylesheet, its cascade, and the real DOM. A `vite dev` server serves unbundled sources and
 * would reintroduce exactly the gap between "what I built" and "what is served" that this closes.
 *
 * ⚠️ AND THE TARGET IS NAMED EVERY TIME — THERE IS NO DEFAULT. `SA_E2E_BASE_URL` used to fall back
 * to the deployed dev site, which is the most expensive failure shape there is: an unset variable
 * measured a REAL page, produced TRUE readings, and reported them against a lock written for a
 * build that page did not contain. Nothing looked wrong. The numbers were plausible and the subject
 * was silently the wrong one — a masthead measurement read 26/20 padding and 38px marks off a
 * deploy predating three sections of the pack that was asserting against it.
 *
 * ⚠️ `bundleGuard` CANNOT COVER THIS AND IS NOT MEANT TO. It knows how to refuse a stale local
 * bundle and a production one; it has no way to know whether a REMOTE deploy contains the change
 * under test, and it returns early for any non-localhost base — the empty string included. So the
 * hole was not in the guard, it was in there being something to guard by default.
 */
import { defineConfig, devices } from "@playwright/test";

/** The deployed dev site, addressable as `dev` so naming it stays one word. */
const DEV_SITE = "https://scriptally-dev.web.app";

/**
 * ⚠️ REQUIRED. An unset target fails here, loudly, before a browser opens — because the alternative
 * is measuring something real and irrelevant. See the note at the top of this file.
 *
 * `SA_E2E_BASE_URL=dev`                          → the deployed dev site
 * `SA_E2E_BASE_URL=http://localhost:4190`        → a local `vite preview` of your own build
 *
 * The two answer different questions and the difference matters: the deploy tells you what other
 * people currently see, a local bundle tells you what your working tree does. A measurement that
 * does not say which one it took is not a measurement of anything in particular.
 */
function resolveBaseUrl(): string {
  const raw = process.env.SA_E2E_BASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "SA_E2E_BASE_URL is not set, and there is no default.\n" +
      "  Local build:   SA_E2E_BASE_URL=http://localhost:4190 npm run e2e\n" +
      `  Deployed dev:  SA_E2E_BASE_URL=dev npm run e2e   (${DEV_SITE})\n` +
      "A default sent measurements at the deployed site whether or not it contained the change " +
      "being measured — true readings about the wrong build, which is worse than no readings.",
    );
  }
  const url = raw === "dev" ? DEV_SITE : raw;
  /* ⚠️ PROD IS REFUSED OUTRIGHT. `bundleGuard` catches a local prod BUNDLE; a remote prod URL never
     reaches it. The harness signs in as a real account and some measurements write, so pointing it
     at production is not a thing to discover afterwards from a request payload. */
  for (const banned of ["scriptally-app.web.app", "scriptally-app.firebaseapp.com", "gen-lang-client-", "scriptally.ink"]) {
    if (url.includes(banned)) {
      throw new Error(`SA_E2E_BASE_URL points at production (${url}). The harness signs in and some measurements write. Refusing.`);
    }
  }
  return url;
}

export const BASE_URL = resolveBaseUrl();

/** The saved logged-in session. Gitignored — it IS a credential. */
export const STORAGE_STATE = "tests/e2e/.auth/state.json";

export default defineConfig({
  testDir: "tests/e2e",
  /* measurement, not a test suite — one worker keeps the numbers attributable and the log readable */
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  /* each measurement signs in — Firebase auth lives in IndexedDB, which storageState cannot carry */
  /* nine pages, two viewports, a wheel gesture each — the matrix is one long test by design */
  timeout: 420_000,
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
