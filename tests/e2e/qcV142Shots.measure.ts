/**
 * Query Centre v142 — the report's screenshots, matching the pack's screens 01–07 (design-refs/query-centre-v142/screens/),
 * at 1280 × 800 and 1512 × 900. Writes reports/qc-v142/shots/. Not a lock: the QC142 locks are qcV142.measure.ts.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/qc-v142/shots";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
const press = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);
const scrollBy = (page: Page, y: number) => page.evaluate((v) => { const s = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0); if (s) s.scrollTop += v; }, y);
async function open(page: Page, vp: { width: number; height: number }, view: "cards" | "list", full = false) {
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
async function settle(page: Page) {
  let last = -1, same = 0;
  for (let i = 0; i < 40 && same < 3; i += 1) {
    await page.waitForTimeout(150);
    const y = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)?.scrollTop ?? 0);
    same = y === last ? same + 1 : 0; last = y;
  }
}
for (const vp of SIZES) {
  test(`v142 shots ${vp.width}`, async ({ page }) => {
    test.setTimeout(420_000);
    mkdirSync(OUT, { recursive: true });
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}-${vp.width}.png` });
    await open(page, vp, "list"); await shot("01-list");
    await open(page, vp, "cards"); await scrollBy(page, 420); await page.waitForTimeout(500); await shot("02-cards");
    await press(page, ".qcv-group[data-v138] [data-qc140='filters']"); await page.waitForTimeout(700);
    await press(page, "[data-qc142='filter-strip'] [data-qc140='quick'][data-qp='you']"); await page.waitForTimeout(900); await shot("03-filter-strip");
    await page.keyboard.press("Escape");
    await open(page, vp, "cards", true); await shot("04-full-screen-cards");
    await open(page, vp, "list", true); await shot("05-full-screen-list");
    await open(page, vp, "cards", true); await scrollBy(page, 900); await page.waitForTimeout(600); await shot("06-full-screen-cards-scrolled");
    const k = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qc138-sheet [data-qc140='jump-btn']")].filter((b) => b.getBoundingClientRect().height > 0)[1]?.dataset.gkey ?? null);
    if (k) { await press(page, `.qc138-sheet [data-qc140='jump-btn'][data-gkey="${k}"]`); await settle(page); }
    await shot("07-full-screen-cards-jumped");
    await page.keyboard.press("f"); await page.waitForTimeout(800);
  });
}
