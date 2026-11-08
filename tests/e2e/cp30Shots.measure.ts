/**
 * Comparable titles v30 — the report's screenshots (reports/comps-v30/shots/), named as the ref's screens:
 * 01 top · 02 shelf · 03 letters · 04 Scout · 05 list · 06 drawer · 07 how-it-works pop-up · 08 early top ·
 * 09 early letters · 10 empty · 11 empty steps. Writes nothing to the account it does not remove.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { MS_EMPTY, SIZES, openCp, scrollTo, seed } from "./cp30Lib";

const DIR = "reports/comps-v30/shots";
mkdirSync(DIR, { recursive: true });
test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
test.afterAll(() => { seed("--restore"); });

for (const vp of SIZES) {
  test(`shots at ${vp.width}`, async ({ page }) => {
    const shot = (n: string) => page.screenshot({ path: `${DIR}/${n}-${vp.width}.png` });
    seed("--empty");
    await openCp(page, vp);
    await shot("01-top");
    await scrollTo(page, '[data-cp="shelf"]'); await shot("02-shelf");
    await scrollTo(page, '[data-cp="letters"]'); await shot("03-letters");
    await scrollTo(page, '[data-cp="scout"]', 200); await shot("04-scout");
    await page.evaluate(() => (window as any).__q('[data-cp="view-list"]').click());
    await scrollTo(page, '[data-cp="shelf"]'); await shot("05-list");
    await page.evaluate(() => (window as any).__q('[data-cp="view-cards"]').click());
    await page.evaluate(() => (window as any).__q('[data-cp="card"]').click());
    await page.waitForTimeout(600); await shot("06-drawer");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await scrollTo(page, '[data-cp="top"]', 0);
    await page.evaluate(() => (window as any).__q('[data-cp="how"]').click());
    await page.waitForTimeout(500); await shot("07-how");
    await page.keyboard.press("Escape");
    seed("--empty", "--variant", "early");
    await openCp(page, vp); await shot("08-early-top");
    await scrollTo(page, '[data-cp="letters"]'); await shot("09-early-letters");
    seed("--empty");
    await openCp(page, vp, { ms: MS_EMPTY }); await shot("10-empty");
    await scrollTo(page, '[data-cp="how-steps"]', 20); await shot("11-empty-steps");
  });
}
