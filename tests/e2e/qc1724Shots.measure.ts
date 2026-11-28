/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.4 — the report's screens at 1512 and 1280 (emulator seed): the loading shell (held by the review
 * aid `sa.qc155.holdMs`), mid-arrival, settled, the bottom of the list (no sign-off), and the panel's top with the
 * Include closed tick and a slider's handles at both ends. Not a lock: writes reports/qc-v172-4/<name>-<width>.png.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { liftMotionSuppression, openRoute, visiblePage } from "./measure";

test.setTimeout(300_000);
const DIR = "reports/qc-v172-4";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 900 }] as const;

async function toCard(page: Page) {
  await page.evaluate(() => {
    const c = [...document.querySelectorAll<HTMLElement>("[data-qc151='switch']")].find((e) => e.getBoundingClientRect().height > 0);
    const sc = c?.closest<HTMLElement>(".wpg-scroll");
    if (c && sc) sc.scrollTop += c.getBoundingClientRect().top - sc.getBoundingClientRect().top - 150;
  });
  await page.waitForTimeout(300);
}

for (const vp of SIZES) {
  test(`QC172.4 screens @ ${vp.width}`, async ({ page }) => {
    mkdirSync(DIR, { recursive: true });
    const shot = (n: string) => page.screenshot({ path: `${DIR}/${n}-${vp.width}.png` });
    await page.addInitScript(() => {
      try {
        /* every load holds (openRoute loads twice: to sign in, then the page); the context is thrown away after */
        localStorage.setItem("sa.qc155.holdMs", "6000");
        localStorage.setItem("sa.guide.queries", "1");
        localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "attention", sort: { key: "due", reversed: false }, density: "comfortable", sort151: { key: "due", desc: false } }));
        sessionStorage.removeItem("qh.qc.filters");
        sessionStorage.setItem("sa.qc138.folded", "[]");
      } catch { /* */ }
    });
    await openRoute(page, "/queries", vp);
    await liftMotionSuppression(page);
    await toCard(page);
    await page.mouse.move(2, 2);
    await shot("1-loading-shell");
    /* the hold ends; catch the arrival 140ms in */
    await page.waitForFunction(() => !!document.querySelector(".qc153-list[data-en172]"), undefined, { timeout: 15_000, polling: 16 });
    await page.waitForTimeout(140);
    await shot("2-mid-arrival");
    await page.waitForTimeout(900);
    await shot("3-settled");
    await page.evaluate(() => {
      const card = [...document.querySelectorAll<HTMLElement>(".qc169-card")].find((e) => e.getBoundingClientRect().height > 0);
      const sc = card?.closest<HTMLElement>(".wpg-scroll");
      if (card && sc) sc.scrollTop += card.getBoundingClientRect().bottom - sc.getBoundingClientRect().bottom + 160;
    });
    await page.waitForTimeout(500);
    await shot("4-list-bottom");
    await toCard(page);
    const V = await visiblePage(page);
    const rail = (await page.locator(`${V}.qc153-railcol`).boundingBox())!;
    await page.screenshot({ path: `${DIR}/5-panel-top-${vp.width}.png`, clip: { x: rail.x - 8, y: rail.y - 8, width: rail.width + 16, height: Math.min(rail.height, 620) + 16 } });
    await page.evaluate(() => { try { localStorage.removeItem("sa.qc155.holdMs"); } catch { /* */ } });
  });
}
