/**
 * Comparable titles v26 — the report's screenshots, one beside each reference PNG, plus edit mode
 * and the empty page with the first-comp drawer open. Run on demand: AD_SHOTS=1.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { MS_EMPTY, SIZES, openComps, seed } from "./cv25Lib";

const DIR = "reports/comps-v26/shots";
test.skip(!process.env.AD_SHOTS, "set AD_SHOTS=1 to write the report's screenshots");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seed("--empty"); });
test.afterAll(() => { if (!process.env.CV25_KEEP) seed("--restore"); });

const D = '[data-hdr="comp"] ';
const openAdd = async (page: Page) => {
  await page.locator('[data-cv="page"] [data-cv="add"]').click();
  await page.waitForSelector('[data-hdr="comp"].is-in');
  await page.waitForTimeout(600);
};
const end = (page: Page) => page.evaluate(() => { const b = document.querySelector('[data-hdr="comp"] [data-hdr="body"]') as HTMLElement; b.scrollTop = b.scrollHeight; });

for (const vp of SIZES) {
  const w = vp.width;
  test(`shots · ${w} · first comp`, async ({ page }) => {
    await openComps(page, vp, { ms: MS_EMPTY });
    await page.waitForSelector('[data-cv="empty"]');
    await page.screenshot({ path: `${DIR}/empty-page-${w}.png` });
    await openAdd(page);
    await page.screenshot({ path: `${DIR}/first-${w}.png` });
    await end(page); await page.waitForTimeout(200);
    await page.screenshot({ path: `${DIR}/first-end-${w}.png` });
  });
  test(`shots · ${w} · another, film, edit`, async ({ page }) => {
    await openComps(page, vp);
    await openAdd(page);
    await page.screenshot({ path: `${DIR}/another-empty-${w}.png` });
    await page.locator(`${D}#cpv-f-title`).fill("Salt and Iron");
    await page.locator(`${D}#cpv-f-author`).fill("J. Mercer");
    await page.locator(`${D}#cpv-f-year`).fill("2024");
    await page.locator(`${D}[data-cf="suggestion"]`).first().click();
    await page.locator(`${D}#cpv-f-tag`).fill("Coastal"); await page.keyboard.press("Enter");
    await page.locator(`${D}#cpv-f-title`).blur();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${DIR}/another-filled-${w}.png` });
    await end(page); await page.waitForTimeout(200);
    await page.screenshot({ path: `${DIR}/another-filled-end-${w}.png` });
    await page.evaluate(() => { (document.querySelector('[data-hdr="comp"] [data-hdr="body"]') as HTMLElement).scrollTop = 0; });
    await page.locator(`${D}[data-cf="type"] [data-media="film"]`).click();
    await page.locator(`${D}#cpv-f-title`).fill("Last Light");
    await page.locator(`${D}#cpv-f-author`).fill("Tom Arden");
    await page.locator(`${D}#cpv-f-title`).blur();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${DIR}/film-ready-${w}.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    /* edit mode: a row's Edit */
    await page.locator('[data-cv="page"] [data-cv="row"]').nth(1).hover();
    await page.locator('[data-cv="page"] [data-cv="row"]').nth(1).locator('[data-cv="tray-edit"]').click();
    await page.waitForSelector('[data-hdr="comp"].is-in'); await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/edit-${w}.png` });
    await end(page); await page.waitForTimeout(200);
    await page.screenshot({ path: `${DIR}/edit-end-${w}.png` });
  });
}
