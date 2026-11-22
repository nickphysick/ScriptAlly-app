/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v27 — screenshots for the report (MS27_SHOTS=1 writes them; a routine run writes none), beside each
 * design-refs/manuscripts-v27/screens/* file. Signed in as the dedicated filled account.
 */
import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { FILLED_EMAIL, MS_ID } from "./ms21Fixture.mjs";
import { assertLocalBundleIsDev } from "./bundleGuard";

const OUT = resolve(process.cwd(), "reports/manuscripts-v27/shots");
test.skip(process.env.MS27_SHOTS !== "1", "MS27_SHOTS=1 writes the report's screenshots");
test.setTimeout(240_000);

for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
  test(`shots ${vp.width}`, async ({ browser, baseURL }) => {
    if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
    const port = new URL(baseURL!).port || "443";
    const ctx = await browser.newContext({ storageState: resolve(process.cwd(), `tests/e2e/.auth/${FILLED_EMAIL.split("@")[0]}-${port}.json`), viewport: vp, baseURL, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await assertLocalBundleIsDev();
    await page.goto("/manuscripts");
    await page.evaluate((id) => { localStorage.setItem("scriptally_active_manuscript_id", id); sessionStorage.setItem("sa.guide.autoOpened", "1"); }, MS_ID);
    await page.goto("/manuscripts");
    await page.waitForSelector('[data-ms27="book"]');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/01-page-${vp.width}@2x.png` });
    await page.locator('[data-ms27="full"]').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/02-book-cover-${vp.width}@2x.png` });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/03-book-spread-${vp.width}@2x.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1500);
    await page.locator('[data-pck="pill"]').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/04-guide-open-${vp.width}@2x.png` });
    await page.locator('[data-pck="item"][data-k="pitch"] button').first().click();
    await page.waitForSelector('[data-pck="flow"] [data-pck="dim"][data-hole]');
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/05-step-pitch-drawer-${vp.width}@2x.png` });
    await page.locator(".ms21-mc").click();
    await expect(page.locator('[data-ms21="edit-dialog"]')).toHaveCount(0);
    await ctx.close();
  });
}
