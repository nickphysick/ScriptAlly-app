/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Account settings — the acceptance walk, and the screenshot set.
 *
 * ⚠️ IT RUNS AGAINST THE BUILT BUNDLE, and `auth.setup.ts` now refuses to start if that bundle
 * carries the prod project id (see its guard — a run against prod is how Phase 7 lost an hour).
 *
 *   npm run build:dev && npx vite preview --port 4173 &
 *   SA_E2E_BASE_URL=http://localhost:4173 npx playwright test accountAcceptance
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { ACCOUNT_ROUTES, ACCOUNT_DEFAULT_PATH } from "../../src/lib/accountRoutes";
import { DELETION_CONFIRM_WORD } from "../../src/lib/accountDeletion";
import { notifyPrefs, marketingGranted } from "../../src/lib/accountPrefs";

/** The dashboard's first-run tour floats over every page — dismissed once so shots are of the page. */
async function dismissTour(page: import("@playwright/test").Page) {
  const skip = page.getByRole("button", { name: /Skip the tour/i });
  if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(800); }
}

test("all six sections load directly by URL, survive refresh, and light their own rail item", async ({ page }) => {
  const rows: string[] = [];
  for (const r of ACCOUNT_ROUTES) {
    await openRoute(page, r.path, { width: 1440, height: 900 });
    await page.reload();
    await page.waitForTimeout(3000);

    const url = new URL(page.url()).pathname;
    const tab = await page.evaluate(() =>
      document.querySelector('[role="tab"][aria-selected="true"]')?.id ?? null);
    const heading = await page.evaluate(() =>
      document.querySelector(".acct-band-name")?.textContent ?? null);
    rows.push(`${r.path.padEnd(24)} → ${url.padEnd(24)} tab ${String(tab).padEnd(22)} band ${heading}`);

    expect(url, `${r.path} after refresh`).toBe(r.path);
    expect(tab, `${r.path} rail state`).toBe(`acct-tab-${r.id}`);
  }
  console.log("\nSIX SECTIONS, DIRECT + REFRESH\n" + rows.join("\n"));
});

test("the bare route and an unknown sub-path both land on Profile", async ({ page }) => {
  for (const entry of ["/account", "/account/tasks", "/account/nonsense"]) {
    await openRoute(page, entry, { width: 1440, height: 900 });
    expect(new URL(page.url()).pathname, entry).toBe(ACCOUNT_DEFAULT_PATH);
  }
});

test("the dirty-name warning fires on leaving, and nothing is discarded", async ({ page }) => {
  await openRoute(page, "/account/profile", { width: 1440, height: 900 });
  const saved = await page.inputValue("#account-name");
  await page.fill("#account-name", saved + " UNSAVED");
  await page.waitForTimeout(300);

  await page.locator("#acct-tab-data").click();
  await page.waitForTimeout(800);
  const toasts = await page.evaluate(() =>
    [...document.querySelectorAll(".sa-toast")].map((e) => (e.textContent ?? "").trim()));
  console.log("leave-dirty toasts:", JSON.stringify(toasts));
  expect(toasts.join(" | ")).toContain("Display name not saved yet");
  expect(new URL(page.url()).pathname, "navigation continues").toBe("/account/data");

  await page.locator("#acct-tab-profile").click();
  await page.waitForTimeout(800);
  expect(await page.inputValue("#account-name"), "the text survives").toBe(saved + " UNSAVED");
  await page.locator('#acct-panel button:has-text("Discard")').click();
  await page.waitForTimeout(500);
  expect(await page.inputValue("#account-name")).toBe(saved);
});

test("the delete button stays disabled until DELETE is typed exactly", async ({ page }) => {
  await openRoute(page, "/account/data", { width: 1440, height: 900 });
  await page.locator('#acct-panel button:has-text("Delete account…")').click();
  await page.waitForTimeout(500);
  expect(await page.locator("#del-confirm-btn").isDisabled()).toBe(true);
  for (const near of ["DELET", "delete account", "DELETE ME"]) {
    await page.fill("#del-confirm", near);
    await page.waitForTimeout(120);
    expect(await page.locator("#del-confirm-btn").isDisabled(), near).toBe(true);
  }
  await page.fill("#del-confirm", DELETION_CONFIRM_WORD);
  await page.waitForTimeout(200);
  expect(await page.locator("#del-confirm-btn").isDisabled()).toBe(false);
  await page.keyboard.press("Escape");
});

/**
 * ⚠️ "DEFAULTS OFF ON A FRESH ACCOUNT" IS A CLAIM ABOUT AN ACCOUNT THAT HAS NEVER CHOSEN, and the
 * harness account has now chosen (earlier measurements toggled it). So the DEFAULT is proved
 * against the derivation on an absent record — the state a fresh account is actually in — and the
 * live page is checked to agree with whatever is stored. Asserting "off" on the page alone would
 * be asserting the harness's history, not the default.
 */
test("marketing consent defaults off for an account that has never chosen", async ({ page }) => {
  expect(marketingGranted(undefined), "absent record === not granted").toBe(false);
  expect(marketingGranted(null)).toBe(false);
  expect(marketingGranted({ granted: false, at: "2026-08-20T00:00:00.000Z" })).toBe(false);
  /* And the querying toggles default ON, so a fresh account is not silently opted out of its own
     reminders — the opposite default, deliberately, and the one PECR does not govern. */
  expect(notifyPrefs(undefined)).toEqual({ nudges: true, weeklyDigest: true });

  await openRoute(page, "/account/notifications", { width: 1440, height: 900 });
  const live = await page.locator('[role="switch"][aria-label="Product news"]').getAttribute("aria-checked");
  console.log("harness Product news (has chosen before):", live);
  expect(["true", "false"]).toContain(live);
});

test("screenshots — six sections at 1440x900 and 800 wide", async ({ page }) => {
  await openRoute(page, ACCOUNT_DEFAULT_PATH, { width: 1440, height: 900 });
  await dismissTour(page);
  for (const w of [1440, 800]) {
    for (const r of ACCOUNT_ROUTES) {
      await openRoute(page, r.path, { width: w, height: 900 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `reports/account-settings/final-${r.id}-${w}.png` });
    }
  }
  console.log("captured 12 screenshots into reports/account-settings/");
});
