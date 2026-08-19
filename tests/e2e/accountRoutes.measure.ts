/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings routing — MEASURED IN A REAL BROWSER, against the built bundle.
 *
 * ⚠️ THE UNIT TESTS CANNOT ANSWER THIS QUESTION. They prove the tables agree; they cannot prove
 * that typing `/account/notifications` into the address bar renders Notifications, because that
 * answer is produced by the router, four exact-path sets and a redirect, in an order no unit test
 * assembles. "Landed in code" is not "landed on the page" (CLAUDE.md).
 *
 * ⚠️ RUN IT AGAINST A LOCAL `vite preview` OF `npm run build:dev`:
 *     npm run build:dev && npx vite preview --port 4173 &
 *     SA_E2E_BASE_URL=http://localhost:4173 npx playwright test accountRoutes
 * Same built bundle the deploy would serve, no deploy. `playwright.config.ts` reads the env var.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { ACCOUNT_ROUTES, ACCOUNT_DEFAULT_PATH } from "../../src/lib/accountRoutes";

/** The rail tab that is marked selected, read from the DOM rather than inferred from the URL. */
async function selectedTab(page: import("@playwright/test").Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.querySelector('[role="tab"][aria-selected="true"]');
    return el?.id ?? null;
  });
}

test("every settings section loads directly by URL, and the rail marks it", async ({ page }) => {
  const rows: string[] = [];
  for (const r of ACCOUNT_ROUTES) {
    await openRoute(page, r.path, { width: 1440, height: 900 });
    const url = new URL(page.url()).pathname;
    const tab = await selectedTab(page);
    const panelVisible = await page.locator("#acct-panel").isVisible();
    rows.push(`${r.path.padEnd(28)} → url ${url.padEnd(28)} tab ${String(tab).padEnd(22)} panel ${panelVisible}`);

    expect(url, `${r.path} must not be redirected away`).toBe(r.path);
    expect(tab, `${r.path} must mark its own rail tab`).toBe(`acct-tab-${r.id}`);
    expect(panelVisible).toBe(true);
  }
  console.log("\nDIRECT LOAD\n" + rows.join("\n"));
});

test("the bare /account and an unknown sub-path both land on Profile", async ({ page }) => {
  for (const entry of ["/account", "/account/nonsense", "/account/profile/extra"]) {
    await openRoute(page, entry, { width: 1440, height: 900 });
    const url = new URL(page.url()).pathname;
    console.log(`${entry.padEnd(28)} → ${url}`);
    expect(url).toBe(ACCOUNT_DEFAULT_PATH);
  }
});

test("a section survives a refresh, and Back/Forward walk the sections", async ({ page }) => {
  await openRoute(page, "/account/preferences", { width: 1440, height: 900 });
  await page.reload();
  await page.waitForTimeout(2500);
  expect(new URL(page.url()).pathname, "refresh must not reset to Profile").toBe("/account/preferences");
  expect(await selectedTab(page)).toBe("acct-tab-preferences");

  /* Clicking the rail is a real navigation, so Back returns to the previous SECTION — not out of
     settings. That is the whole point of the phase and cannot be read off the source. */
  await page.locator("#acct-tab-data").click();
  await page.waitForTimeout(600);
  expect(new URL(page.url()).pathname).toBe("/account/data");

  await page.goBack();
  await page.waitForTimeout(600);
  expect(new URL(page.url()).pathname).toBe("/account/preferences");

  await page.goForward();
  await page.waitForTimeout(600);
  expect(new URL(page.url()).pathname).toBe("/account/data");
  expect(await selectedTab(page)).toBe("acct-tab-data");
});

test("the breadcrumb still resolves on a section route", async ({ page }) => {
  await openRoute(page, "/account/security", { width: 1440, height: 900 });
  const crumb = await page.evaluate(() => document.querySelector(".sv2-crumb")?.textContent?.trim() ?? null);
  console.log("crumb on /account/security:", JSON.stringify(crumb));
  /* Registration, not wording: an unregistered path renders NO crumb at all, which is the failure
     this asserts against. */
  expect(crumb, "an unregistered path renders no crumb").not.toBeNull();
  expect(crumb).toContain("Setup");
});
