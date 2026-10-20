/**
 * Comparable titles v28 — screenshots beside the reference PNGs (design-refs/comps-v28/ref-*), and at 1920×1080 and
 * 1024×768. Writes to reports/comps-v28/shots/ only when CX28_SHOTS=1.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> CX28_SHOTS=1 npx playwright test tests/e2e/cx28Shots.measure.ts --workers=1
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { MS_EMPTY, openCx, scrollTo, type Vp } from "./cx28Lib";

const OUT = "reports/comps-v28/shots";
const ON = process.env.CX28_SHOTS === "1";
const VPS: Vp[] = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }, { width: 1024, height: 768 }];
test.skip(!ON, "set CX28_SHOTS=1 to write the screenshots");
test.setTimeout(240_000);

for (const vp of VPS) {
  test(`shots ${vp.width}`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    const w = vp.width;
    await openCx(page, vp);
    await page.screenshot({ path: `${OUT}/top-${w}.png` });
    await scrollTo(page, '[data-cx="shelf"]', 24);
    await page.screenshot({ path: `${OUT}/shelf-${w}.png` });
    await scrollTo(page, '[data-cx="landing"]', 0);
    await page.screenshot({ path: `${OUT}/landing-${w}.png` });
    if (w === 1512 || w === 1280) {
      await scrollTo(page, '[data-cx="shelf"]', 24);
      await page.locator('[data-cx="card"]:visible').first().click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/drawer-${w}.png` });
      await page.locator('[data-cv="drawer-edit"]:visible').click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/edit-${w}.png` });
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      await scrollTo(page, '[data-cx="header"]', 0);
      await page.locator('[data-cx="pick"]:visible').click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/picker-${w}.png` });
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      await page.locator('[data-cx="how-link"]:visible').click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/how-it-works-${w}.png` });
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    }
    await openCx(page, vp, { ms: MS_EMPTY });
    await page.screenshot({ path: `${OUT}/empty-${w}.png` });
    if (w === 1512 || w === 1280) {
      await scrollTo(page, '[data-cv="empty"]', 24);
      await page.screenshot({ path: `${OUT}/empty-steps-${w}.png` });
      await scrollTo(page, '[data-cx="empty-panel"]', 0);
      await page.locator('[data-cx="explain"]:visible').click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/explainer-${w}.png` });
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      await page.locator('[data-cx="add-first"]:visible').click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/first-comp-${w}.png` });
    }
  });
}
