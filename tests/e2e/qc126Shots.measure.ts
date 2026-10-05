/**
 * Query Centre v126 §8 — the nine states the pack's reference PNGs draw, at 1512 × 900 @2×, written to
 * reports/qc-v126/. A picture for the report, not a lock: every claim about these states is QC126-1…20.
 */
import { test } from "@playwright/test";
import { openQc, openDrawer, AT_1512 } from "./qc126Lib";

test.use({ deviceScaleFactor: 2 });
const OUT = "reports/qc-v126";
const scrollTo = (page: import("@playwright/test").Page, sel: string | null, off = 0) => page.evaluate(([s, o]) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".ws-winwrap .wpg-scroll")].find((e) => e.clientHeight > 0)!;
  if (s === null) { sc.scrollTop = sc.scrollHeight; return; }
  const el = document.querySelector<HTMLElement>(s as string);
  if (el) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - (o as number);
}, [sel, off] as const);

test("qc126 · the nine reference states", async ({ page }) => {
  test.setTimeout(240_000);
  await openQc(page, AT_1512);
  /* the page guide is a once-per-writer card; dismiss it so it covers nothing */
  await page.locator('[data-qcv="guide-x"]').first().click({ timeout: 2000 }).catch(() => {});
  await page.screenshot({ path: `${OUT}/01-top@2x.png` });
  await scrollTo(page, '[data-qcv="lbanner"]', 30);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/02-list@2x.png` });
  await scrollTo(page, null);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/03-footer@2x.png` });
  await scrollTo(page, '[data-qcv="courts"]', 40);
  await openDrawer(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/04-birdseye@2x.png` });
  await page.locator('[data-qcv="bvd-pill"][data-k="filter"]').click({ timeout: 4000 });
  const chips = page.locator('[data-qcv="bvd-pop"][data-k="filter"] [data-qcv="bvd-chip"]');
  await chips.nth(0).click({ timeout: 4000 }); await chips.nth(4).click({ timeout: 4000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/05-birdseye-filtered@2x.png` });
  await page.locator('[data-qcv="bvd-fclear"]').click({ timeout: 4000 });
  await page.locator('[data-qcv="bvd-pill"][data-k="group"]').click({ timeout: 4000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/06-birdseye-group@2x.png` });
  await page.keyboard.press("Escape");
  await page.locator('[data-qcv="bvd-pill"][data-k="sort"]').click({ timeout: 4000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/07-birdseye-sort@2x.png` });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await scrollTo(page, '[data-qcv="lbanner"]', 30);
  await page.locator('[data-qcv="row"]').first().click({ timeout: 8000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/08-card@2x.png` });
  await page.locator('[data-qcv="qm-card"] .qcv-open-act').first().click({ timeout: 4000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/09-action-drawer@2x.png` });
});
