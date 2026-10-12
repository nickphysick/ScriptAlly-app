/**
 * Comparable titles v27 — the report's screenshots, one beside each reference PNG, plus the empty page
 * with the first-comp drawer open. Run on demand: V27_SHOTS=1.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { MS_EMPTY, SIZES, openComps, seed } from "./cv25Lib";

const DIR = "reports/comps-v27/shots";
test.skip(!process.env.V27_SHOTS, "set V27_SHOTS=1 to write the report's screenshots");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seed("--empty"); });
test.afterAll(() => { if (!process.env.CV25_KEEP) seed("--restore"); });

for (const vp of SIZES) {
  const w = vp.width;
  test(`shots · ${w} · the empty page, and its first-comp drawer`, async ({ page }) => {
    await openComps(page, vp, { ms: MS_EMPTY });
    await page.waitForSelector('[data-cv="empty"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${DIR}/empty-${w}.png` });
    await page.locator('[data-cv="page"] [data-cv="add"]').click();
    await page.waitForSelector('[data-hdr="comp"].is-in');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/empty-first-drawer-${w}.png` });
  });
  test(`shots · ${w} · with comps, and the pop-up`, async ({ page }) => {
    await openComps(page, vp);
    await page.screenshot({ path: `${DIR}/with-comps-${w}.png` });
    const link = page.locator('[data-cv="page"] [data-cv="how-link"]');
    if (!(await link.count())) return;
    await link.click();
    await page.waitForSelector('[data-cv="how-pop"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/how-it-works-${w}.png` });
  });
}
