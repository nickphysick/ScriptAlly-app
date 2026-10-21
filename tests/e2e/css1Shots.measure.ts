/**
 * cards-sort-search v1 — the report's screenshots, matching the pack's screens (design-refs/cards-sort-search-v1/screens/),
 * at 1280 × 800 and 1512 × 900. Writes reports/cards-sort-search-v1/shots/. Not a lock: the locks are css1.measure.ts.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";
import { openContacts16 } from "./cl16Lib";

const OUT = "reports/cards-sort-search-v1/shots";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
async function qc(page: Page, vp: { width: number; height: number }, view: "cards" | "list", full = false) {
  await page.addInitScript((v) => {
    try {
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.setItem("sa.qc138.folded", "[]");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "status", sort: { key: "due", reversed: false }, density: "comfortable", view: v }));
      localStorage.setItem("sa.guide.queries", "1"); localStorage.removeItem("sa.pinList.queries");
    } catch { /* */ }
  }, view);
  await openRoute(page, "/queries", vp);
  await page.locator(".qc138-sheet [data-qcv='row'], .qc138-sheet [data-qc142='card']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  await page.mouse.move(5, 5);
  if (full) { await page.keyboard.press("f"); await page.waitForTimeout(1300); }
}
async function cl(page: Page, vp: { width: number; height: number }, view: "cards" | "list", sort = "surname") {
  if (/^https?:/.test(page.url())) await page.evaluate(() => { try { localStorage.removeItem("qh.cl.view"); sessionStorage.removeItem("__cl16_cleared"); } catch { /* */ } });
  await openContacts16(page, vp);
  await page.evaluate(({ v, s }) => localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: "none", sort: s, reversed: false, pinned: false, view: v })), { v: view, s: sort });
  await page.reload();
  await page.locator(".clv-group:not([data-loading]) [data-clv='row'], .clv-group:not([data-loading]) [data-clv='card']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}
for (const vp of SIZES) {
  test(`css1 shots ${vp.width}`, async ({ page }) => {
    test.setTimeout(420_000);
    mkdirSync(OUT, { recursive: true });
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${vp.width}.png` });
    await qc(page, vp, "list"); await shot("qc-01-list");
    await qc(page, vp, "cards"); await shot("qc-02-cards");
    await press(page, "[data-qc1421='sort']"); await page.waitForTimeout(600); await shot("qc-03-sort-menu");
    await page.keyboard.press("Escape");
    await page.locator(".qc138-sheet [data-qc140='find'] input").first().fill("ar"); await page.waitForTimeout(800); await shot("qc-04-search-typed");
    await qc(page, vp, "cards", true); await shot("qc-05-full-screen-cards");
    await page.keyboard.press("f"); await page.waitForTimeout(800);
    await cl(page, vp, "cards"); await press(page, "[data-cl21='sort']"); await page.waitForTimeout(600); await shot("cl-06-sort-menu");
    await page.keyboard.press("Escape");
    await cl(page, vp, "cards", "added"); await shot("cl-07-cards-by-date-added");
    await cl(page, vp, "list", "added"); await shot("cl-08-list-same-sort");
  });
}
