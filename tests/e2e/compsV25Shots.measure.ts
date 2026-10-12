/**
 * Comparable titles v25 — the report's screenshots, one beside each reference PNG, plus the page at
 * 1920 × 1080 and 1024 × 768. Run on demand: CV25_SHOTS=1.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { SIZES, openComps, scrollTo, seed } from "./cv25Lib";

const DIR = "reports/comps-v25/shots";
test.skip(!process.env.CV25_SHOTS, "set CV25_SHOTS=1 to write the report's screenshots");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seed(); });
test.afterAll(() => { if (!process.env.CV25_KEEP) seed("--restore"); });

for (const vp of [...SIZES, { width: 1920, height: 1080 }, { width: 1024, height: 768 }]) {
  const w = vp.width;
  const refs = w === 1512 || w === 1280;
  test(`shots · ${w}`, async ({ page }) => {
    await openComps(page, vp);
    await page.screenshot({ path: `${DIR}/top-${w}.png` });
    /* the band left the page with comps v27: its shot is compsV27Shots' pop-up */
    await scrollTo(page, '[data-cv="lib-head"]', 24);
    await page.screenshot({ path: `${DIR}/list-${w}.png` });
    if (!refs) return;
    await page.locator('[data-cv="page"] [data-cv="row"]').first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/drawer-${w}.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    if (w === 1512) {
      await page.locator('[data-cv="page"] [data-cv="group-btn"]').click();
      await page.locator('[data-cv="group-menu"] [data-g="where"]').click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${DIR}/grouped-${w}.png` });
      await page.locator('[data-cv="page"] [data-cv="group-btn"]').click();
      await page.locator('[data-cv="group-menu"] [data-g="none"]').click();
      await page.locator('[data-cv="page"] [data-cv="unrec-log"]').first().click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${DIR}/picker-${w}.png` });
      await page.keyboard.press("Escape");
    }
    await page.locator('[data-cv="page"] [data-cv="full-btn"]').click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${DIR}/full-${w}.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
  });
}
