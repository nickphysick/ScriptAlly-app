/**
 * Comparable titles v27.1 — the report's screenshots: the library in normal view and full screen, and each
 * of the five close buttons, at both sizes. Run on demand: V271_SHOTS=1.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { SIZES, openComps, scrollTo, seed } from "./cv25Lib";

const DIR = "reports/comps-v27-1/shots";
test.skip(!process.env.V271_SHOTS, "set V271_SHOTS=1 to write the report's screenshots");
test.describe.configure({ mode: "serial" });
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); seed("--empty"); });
test.afterAll(() => { if (!process.env.CV25_KEEP) seed("--restore"); });

const P = '[data-cv="page"] ';
const top = (page: Page) => page.evaluate(() => { ((window as any).__cv().closest(".wpg-scroll") as HTMLElement).scrollTop = 0; });
/** the button and 30px around it */
const close = async (page: Page, sel: string, path: string) => {
  await page.waitForTimeout(700);
  const b = (await page.locator(sel).boundingBox())!;
  await page.screenshot({ path, clip: { x: b.x - 30, y: b.y - 30, width: b.width + 60, height: b.height + 60 } });
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
};

for (const vp of SIZES) {
  const w = vp.width;
  test(`shots · ${w} · the library, normal and full screen`, async ({ page }) => {
    await openComps(page, vp);
    await scrollTo(page, '[data-gst="comps"]', 12);
    await page.screenshot({ path: `${DIR}/library-${w}.png` });
    await page.locator(`${P}[data-cv="full-btn"]`).click(); await page.waitForTimeout(900);
    await page.screenshot({ path: `${DIR}/library-full-screen-${w}.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(900);
  });
  test(`shots · ${w} · the five close buttons`, async ({ page }) => {
    await openComps(page, vp);
    await scrollTo(page, '[data-cv="lib-head"]', 24);
    await page.locator(`${P}[data-cv="row"]`).first().click(); await page.waitForSelector('[data-hdr="comp"].is-in');
    await close(page, '[data-hdr="comp"] button[aria-label="Close"]', `${DIR}/close-comp-drawer-${w}.png`);
    await top(page);
    await page.locator(`${P}[data-cv="add"]`).click(); await page.waitForSelector('[data-hdr="comp"].is-in');
    await close(page, '[data-hdr="comp"] button[aria-label="Close"]', `${DIR}/close-add-drawer-${w}.png`);
    await scrollTo(page, '[data-cv="lib-head"]', 24);
    const row = page.locator(`${P}[data-cv="row"]`).nth(2); await row.hover(); await row.locator('[data-cv="tray-act"]').click(); await page.waitForSelector('[data-cv="picker"]');
    await close(page, '[data-cv="picker"] button[aria-label="Close"]', `${DIR}/close-picker-${w}.png`);
    await page.locator('[data-ftab="scout"]').click(); await page.waitForSelector('[data-hdr="scout"].is-in');
    await close(page, '[data-hdr="scout"] button[aria-label="Close"]', `${DIR}/close-scout-${w}.png`);
    await top(page);
    await page.locator(`${P}[data-cv="how-link"]`).click(); await page.waitForSelector('[data-cv="how-pop"]');
    await close(page, '[data-cv="how-pop"] button[aria-label="Close"]', `${DIR}/close-pop-up-${w}.png`);
  });
}
