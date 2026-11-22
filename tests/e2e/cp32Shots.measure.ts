/**
 * Comparable titles v32 — the screenshots, named as the ref's `screens/` (design-refs/comps-v32/screens/), at 1512 × 900
 * and 1280 × 800, on `seedComps32.mjs`. Written to reports/comps-v32/shots/. Not a lock: CP32 (cp32.measure.ts) holds.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { LIB, MS_EMPTY, openCp, scrollTo, seed, type Vp } from "./cp32Lib";

test.describe.configure({ mode: "serial" });
test.setTimeout(900_000);
const DIR = "reports/comps-v32/shots";
mkdirSync(DIR, { recursive: true });
const SHOTS: Vp[] = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];

const snap = (page: Page, name: string, vp: Vp, full = false) => page.screenshot({ path: `${DIR}/${name}-${vp.width}@2x.png`, fullPage: full });
/** a full-page shot of the page's own scroller: the viewport is grown to its content for the shot */
async function whole(page: Page, name: string, vp: Vp) {
  const h = await page.evaluate(() => { const sc = (window as any).__cp().closest(".wpg-scroll") as HTMLElement; sc.scrollTop = 0; return sc.scrollHeight + (window.innerHeight - sc.clientHeight); });
  await page.setViewportSize({ width: vp.width, height: Math.min(h, 7000) }); await page.waitForTimeout(700);
  await snap(page, name, vp);
  await page.setViewportSize(vp); await page.waitForTimeout(400);
}
const top = (page: Page) => page.evaluate(() => { ((window as any).__cp().closest(".wpg-scroll") as HTMLElement).scrollTop = 0; });

test.use({ deviceScaleFactor: 2 });
test.afterAll(() => { seed("--restore"); });

for (const vp of SHOTS) {
  test(`CP32 shots at ${vp.width}`, async ({ page }) => {
    seed("--empty");
    await openCp(page, vp);
    await snap(page, "01-everyday-top", vp);
    await whole(page, "02-everyday-full", vp);
    await top(page);
    await page.evaluate(`window.__q('[data-cp="switch-btn"][data-v="queries"]').click()`); await page.waitForTimeout(300);
    await scrollTo(page, '[data-cp="grid"]', 70); await snap(page, "03-open-comp-queries", vp);
    await page.locator('[data-cp="page"] [data-cp="row"]', { hasText: "Bright Water" }).click(); await page.waitForTimeout(300);
    await snap(page, "04-open-comp-not-used", vp);
    await scrollTo(page, '[data-cp="podium-sec"]', 80); await snap(page, "05-podium", vp);
    await scrollTo(page, '[data-cp="pendium"]', 80); await snap(page, "06-comp-pendium", vp);
    await scrollTo(page, '[data-cp="scout"]', 200); await snap(page, "07-scout-and-footer", vp);
    await scrollTo(page, '[data-cp="grid"]', 70); await page.waitForTimeout(400); await snap(page, "08-collapsed-bar", vp);
    await top(page); await page.waitForTimeout(300);
    await page.locator('[data-cp="page"] [data-cp="add"]').click(); await page.waitForSelector('[data-hdr="comp"].is-in'); await page.waitForTimeout(500);
    await snap(page, "09-add-drawer", vp); await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    await page.locator('[data-cp="page"] [data-cp="row"]', { hasText: "Nine Miles Out" }).click();
    await page.locator('[data-cp="page"] [data-cp="open-add"]').first().click(); await page.waitForSelector('[data-cv="picker"]'); await page.waitForTimeout(400);
    await snap(page, "10-add-to-letter-drawer", vp); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await top(page); await page.locator('[data-cp="page"] [data-cp="notice-log"]').click(); await page.waitForSelector('[data-cv="picker"]'); await page.waitForTimeout(400);
    await snap(page, "11-choose-comps-drawer", vp); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await page.locator('[data-cp="page"] [data-cp="how"]').click(); await page.waitForSelector('[data-cp="how-pop"]'); await page.waitForTimeout(400);
    await snap(page, "12-how-it-works", vp); await page.keyboard.press("Escape"); await page.waitForTimeout(400);

    seed("--variant", "nosent", "--empty");
    await openCp(page, vp);
    await snap(page, "13-nothing-sent-top", vp);
    await whole(page, "14-nothing-sent-full", vp);

    await openCp(page, vp, { ms: MS_EMPTY });
    await page.evaluate(LIB);
    await snap(page, "15-day-one", vp);
  });
}
