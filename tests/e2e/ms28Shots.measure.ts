/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 — screenshots beside design-refs/manuscripts-v28/screens/* (MS28_SHOTS=1 writes them; a routine run
 * writes none). Signed in as the dedicated ms21-filled account. MS28_ONLY=<prefix> takes one shot only.
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FILLED_EMAIL, MS_ID } from "./ms21Fixture.mjs";
import { assertLocalBundleIsDev } from "./bundleGuard";

const OUT = resolve(process.cwd(), "reports/manuscripts-v28/shots");
test.skip(process.env.MS28_SHOTS !== "1", "MS28_SHOTS=1 writes the report's screenshots");
test.setTimeout(240_000);
const ONLY = process.env.MS28_ONLY ?? "";
const want = (n: string) => !ONLY || n.startsWith(ONLY);
const pw = () => { for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(l); if (m) return m[1].trim().replace(/^["']|["']$/g, ""); } throw new Error("no pw"); };

async function signedIn(browser: import("@playwright/test").Browser, baseURL: string, vp: { width: number; height: number }) {
  const port = new URL(baseURL).port || "443";
  const file = resolve(process.cwd(), `tests/e2e/.auth/${FILLED_EMAIL.split("@")[0]}-${port}.json`);
  if (!existsSync(file)) {
    const c = await browser.newContext({ baseURL, viewport: vp });
    const p = await c.newPage();
    await p.goto("/#/signin");
    await p.locator("#au-email").fill(FILLED_EMAIL);
    await p.locator("#au-pw").fill(pw());
    await p.getByRole("button", { name: /^Sign in$/ }).last().click();
    await expect(p.locator(".ws-work").first()).toBeVisible({ timeout: 30_000 });
    await c.storageState({ path: file, indexedDB: true });
    await c.close();
  }
  return browser.newContext({ storageState: file, viewport: vp, baseURL, deviceScaleFactor: 2 });
}
async function open(page: Page) {
  await page.goto("/manuscripts");
  await page.evaluate((id) => { localStorage.setItem("scriptally_active_manuscript_id", id); sessionStorage.setItem("sa.guide.autoOpened", "1"); }, MS_ID);
  await page.goto("/manuscripts");
  await page.waitForSelector('[data-ms27="book"]');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
}

for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
  test(`shots ${vp.width}`, async ({ browser, baseURL }) => {
    await assertLocalBundleIsDev();
    if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
    const ctx = await signedIn(browser, baseURL!, vp);
    const page = await ctx.newPage();
    await open(page);
    if (want("01")) await page.screenshot({ path: `${OUT}/01-page-${vp.width}@2x.png` });
    await page.locator('[data-ms27="edit"]').click();
    await page.waitForSelector('[data-hdr="ms-edit"].is-in');
    await page.waitForTimeout(600);
    if (want("02")) await page.screenshot({ path: `${OUT}/02-drawer-genre-${vp.width}@2x.png` });
    const search = page.locator('[data-gx="add"], [data-gx="change"]').first();
    if (want("03") && await search.count()) {
      await page.locator('[data-gx="add"]').click().catch(() => {});
      await page.keyboard.type("psych");
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/03-genre-search-${vp.width}@2x.png` });
      await page.keyboard.press("Escape");
    }
    if (want("04") && await page.locator('[data-ag-oth]').count()) {
      await page.locator('[data-ag-oth]').scrollIntoViewIfNeeded();
      await page.locator('[data-ag-oth]').click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/04-age-other-${vp.width}@2x.png` });
      await page.keyboard.press("Escape");
    }
    if (want("05")) {
      await page.locator('[data-ms21-sect="elevatorPitch"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/05-pitch-series-${vp.width}@2x.png` });
    }
    await ctx.close();
  });
}
