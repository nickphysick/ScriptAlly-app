/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v17 — the report's screenshots, beside each `design-refs/contact-list-v17/screens/*` file. Not a
 * lock: it asserts nothing and runs only with `CL17_SHOTS=1`.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";
import { openContacts16, setScroll16 } from "./cl16Lib";

const OUT = "reports/contact-list-v17/shots";
const ON = process.env.CL17_SHOTS === "1";
const pill = (page: import("@playwright/test").Page, k: string) => page.locator(`.aglist [data-cl14-dd="${k}"]`).filter({ visible: true }).first();

test.describe("Contact list v17 · shots", () => {
  test.skip(!ON, "set CL17_SHOTS=1 to write the report's screenshots");
  test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }, { width: 1024, height: 768 }]) {
    test(`populated · ${vp.width}`, async ({ page }) => {
      await openContacts16(page, vp);
      await page.screenshot({ path: `${OUT}/01-top-${vp.width}.png` });
      if (vp.width === 1920 || vp.width === 1024) return;
      await setScroll16(page, 1500); await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/02-pinned-${vp.width}.png` });
      await setScroll16(page, 0); await page.waitForTimeout(400);
      await page.locator('.aglist [data-cl17="card-row"][data-k="live"]').filter({ visible: true }).first().click(); await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/03-filtered-${vp.width}.png` });
      await page.locator('.aglist [data-cl17="card-row"][data-k="live"]').filter({ visible: true }).first().click(); await page.waitForTimeout(500);
      if (vp.width !== 1512) return;
      for (const [k, n] of [["status", "04-filter-status"], ["open", "05-filter-open"], ["more", "06-filter-more"]] as const) {
        await pill(page, k).click(); await page.waitForTimeout(400);
        await page.screenshot({ path: `${OUT}/${n}-1512.png` });
        await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      }
      await page.keyboard.press("f"); await page.waitForTimeout(1000);
      await page.screenshot({ path: `${OUT}/07-full-screen-1512.png` });
      await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    });
  }

  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    test(`empty · ${vp.width}`, async ({ page }) => {
      await page.addInitScript(() => { (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT = 0; try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* */ } });
      await openApp(page, "/agents", vp);
      await page.locator('[data-cl17="empty"]').waitFor({ timeout: 30_000 });
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/08-empty-${vp.width}.png` });
      await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!; sc.scrollTop = sc.scrollHeight; });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/09-empty-lower-${vp.width}.png` });
    });
  }
});
