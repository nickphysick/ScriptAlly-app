/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28.1 — the report's shots: the book container and the open book, at 1512 and 1280, on the ms21-filled
 * account. MS281_SHOTS=1 writes them; a routine run writes none.
 */
import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FILLED_EMAIL, MS_ID } from "./ms21Fixture.mjs";
import { assertLocalBundleIsDev } from "./bundleGuard";

const OUT = resolve(process.cwd(), "reports/manuscripts-v28-1/shots");
test.skip(process.env.MS281_SHOTS !== "1", "MS281_SHOTS=1 writes the report's screenshots");
test.setTimeout(240_000);
const pw = () => { for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(l); if (m) return m[1].trim().replace(/^["']|["']$/g, ""); } throw new Error("no pw"); };

for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
  test(`shots ${vp.width}`, async ({ browser, baseURL }) => {
    await assertLocalBundleIsDev();
    if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
    const port = new URL(baseURL!).port || "443";
    const file = resolve(process.cwd(), `tests/e2e/.auth/${FILLED_EMAIL.split("@")[0]}-${port}.json`);
    if (!existsSync(file)) {
      const c = await browser.newContext({ baseURL, viewport: vp }); const p = await c.newPage();
      await p.goto("/#/signin"); await p.locator("#au-email").fill(FILLED_EMAIL); await p.locator("#au-pw").fill(pw());
      await p.getByRole("button", { name: /^Sign in$/ }).last().click();
      await expect(p.locator(".ws-work").first()).toBeVisible({ timeout: 30_000 });
      await c.storageState({ path: file, indexedDB: true }); await c.close();
    }
    const ctx = await browser.newContext({ storageState: file, viewport: vp, baseURL, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto("/manuscripts");
    await page.evaluate((id) => { localStorage.setItem("scriptally_active_manuscript_id", id); sessionStorage.setItem("sa.guide.autoOpened", "1"); }, MS_ID);
    await page.goto("/manuscripts");
    await page.waitForSelector('[data-ms27="book"]');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    await page.locator('[data-ms27="book"]').screenshot({ path: `${OUT}/01-book-container-${vp.width}@2x.png` });
    await page.locator('[data-ms27="full"]').click();
    await page.waitForSelector('[data-ms27bx="root"]');
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/02-open-book-${vp.width}@2x.png` });
    await ctx.close();
  });
}
