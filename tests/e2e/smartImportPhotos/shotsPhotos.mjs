/**
 * Smart Import from photos, phase 2 — the photos screen against the ref's #photos, by one browser.
 *   SIP_BASE=http://127.0.0.1:4473 node tests/e2e/smartImportPhotos/shotsPhotos.mjs
 * Feeds the lab's real flow three real-sized images (a sharp notebook photo, a blurred one, a
 * spreadsheet screenshot), and writes screenshots + readings to reports/smart-import-photos-v1/.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.SIP_BASE; if (!BASE) throw new Error("SIP_BASE is required");
const OUT = resolve("reports/smart-import-photos-v1"); mkdirSync(OUT, { recursive: true });
const FX = resolve("functions/eval/fixtures/photos");
const FILES = [`${FX}/hand-caveat-1p-sharp/page-1.jpg`, `${FX}/hand-indie-2p-blur/page-1.jpg`, `${FX}/shot-sheet-12-sharp/page-1.jpg`];
const REF = "file://" + resolve("design-refs/smart-import-photos-v1.html") + "#photos";
const readings = {};
const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#/onb-lab?s=photos`);
  await page.waitForSelector('[data-act="photos"]');
  await page.screenshot({ path: `${OUT}/fork-${w}.png` });
  await page.setInputFiles('[data-picker="photos"]', FILES);
  await page.waitForFunction(() => document.querySelectorAll('[data-sf="photo"][data-status="ready"]').length === 3, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({
    pages: [...document.querySelectorAll('[data-sf="photo"]')].map((f) => ({ n: f.getAttribute("data-page"), status: f.getAttribute("data-status"), hard: !!f.querySelector('[data-sf="photo-hard"]'), img: f.querySelector("img")?.naturalWidth + "x" + f.querySelector("img")?.naturalHeight })),
    note: document.querySelector('[data-sf="photo-note"]')?.textContent ?? null,
    lede: document.querySelector('[data-sf="photos-lede"]')?.textContent ?? null,
    read: !document.querySelector('[data-act="read"]')?.hasAttribute("disabled"),
    cols: getComputedStyle(document.querySelector(".o9-photos")).gridTemplateColumns.split(" ").length,
  }));
  readings[`${w}`] = r;
  await page.screenshot({ path: `${OUT}/photos-${w}.png`, fullPage: true });
  // the ref, at the same size
  const ref = await ctx.newPage();
  await ref.goto(REF); await ref.waitForTimeout(1200);
  await ref.screenshot({ path: `${OUT}/ref-photos-${w}.png`, fullPage: true });
  await ref.close();
  if (w === 1440) {
    // keyboard: Alt+→ on page 1 moves it to 2; Remove page 3; Keep it clears the note
    const firstSrc = await page.locator('[data-sf="photo"] img').first().getAttribute("src");
    await page.locator('[data-photo-id]').first().focus();
    await page.keyboard.press("Alt+ArrowRight");
    readings.altMove = { movedToTwo: (await page.locator('[data-sf="photo"]').nth(1).locator("img").getAttribute("src")) === firstSrc, focusStayed: await page.evaluate(() => document.activeElement?.closest('[data-sf="photo"]')?.getAttribute("data-page")) };
    await page.locator('[data-act="keep"]').click();
    readings.afterKeep = { note: await page.locator('[data-sf="photo-note"]').count(), hard: await page.locator('[data-sf="photo-hard"]').count() };
    await page.locator('[data-sf="photo"]').nth(2).locator('[data-act="remove"]').click();
    readings.afterRemove = { pages: await page.locator('[data-sf="photo"]').count(), lede: await page.locator('[data-sf="photos-lede"]').textContent() };
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/phase2-readings.json`, JSON.stringify(readings, null, 2) + "\n");
console.log(JSON.stringify(readings, null, 2));
