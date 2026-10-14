/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 — the report's screenshots (reports/qc-v138/shots), beside each design-refs screens/* file.
 * Writes images only; asserts nothing.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/qc-v138/shots";
const guide = () => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } };
const scrollTo = (page: import("@playwright/test").Page, y: number) => page.evaluate((top) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.querySelector(".qcv-group[data-v138]") && e.getBoundingClientRect().height > 0)!;
  sc.style.scrollBehavior = "auto"; sc.scrollTop = top;
}, y);

test("shots", async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  await page.addInitScript(guide);
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    const w = vp.width;
    await openRoute(page, "/queries", vp);
    await page.locator('.qcv-group[data-v138] [data-qcv="row"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/01-top-${w}.png` });
    await scrollTo(page, 420); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/02-list-${w}.png` });
    await scrollTo(page, 1500); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/03-pinned-${w}.png` });
    await scrollTo(page, 420);
    await page.locator('.qcv-group[data-v138] [data-d="compact"]').click(); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/04-compact-${w}.png` });
    await page.locator('.qcv-group[data-v138] [data-d="comfortable"]').click(); await page.waitForTimeout(300);
    if (w === 1512) {
      for (const [n, sel] of [["05-hover-overdue", '[data-qcv="row"][data-move="true"][data-court="agent"]'], ["06-hover-waiting", '[data-qcv="row"][data-move="false"][data-court="agent"]']] as const) {
        const row = page.locator(`.qcv-group[data-v138] ${sel}`).first();
        await row.scrollIntoViewIfNeeded();
        await page.mouse.move(2, 2);
        await row.hover({ position: { x: 300, y: 18 } });
        await page.waitForTimeout(1100);
        await page.screenshot({ path: `${OUT}/${n}-1512.png` });
      }
      await page.mouse.move(2, 2);
      const picks = page.locator('.qcv-group[data-v138] [data-qcv="row-pick"]');
      await picks.nth(0).click(); await picks.nth(1).click(); await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/07-select-1512.png` });
      await page.keyboard.press("Escape");
      await scrollTo(page, 0);
      await page.locator('.qcv-group[data-v138] [data-qc138="glyph-btn"][data-k="fr"]').click(); await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/11-glyph-filter-1512.png` });
      await page.locator('.qcv-group[data-v138] [data-qc138="glyph-btn"][data-k="fr"]').click();
    }
  }
  /* the empty page, through the dev count override */
  await page.addInitScript(() => { (window as unknown as { __SA_LH_COUNT: number }).__SA_LH_COUNT = 0; });
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    await openRoute(page, "/queries", vp);
    await page.locator('[data-qc138="empty"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/08-empty-${vp.width}.png` });
    await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.querySelector('[data-qc138="empty"]') && e.getBoundingClientRect().height > 0)!; sc.scrollTop = 640; });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/09-empty-lower-${vp.width}.png` });
  }
});

test("peek sheet and widths", async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  const D = 86_400_000, now = Date.now(), t = (d: number) => now + d * D;
  const cases = [
    { events: [{ name: "Queried", ms: t(-3906) }], due: t(-3846), yours: true },
    { events: [{ name: "Queried", ms: t(-7) }, { name: "Partial requested", ms: t(-6) }], due: t(-5), yours: true },
    { events: [{ name: "Queried", ms: now - 3_600_000 }], due: now, yours: false },
    { events: [{ name: "Queried", ms: t(-2777) }, { name: "Full sent", ms: t(-2) }], due: t(355), yours: false },
    { events: [{ name: "Queried", ms: t(-37) }, { name: "Partial requested", ms: t(-30) }, { name: "Partial sent", ms: t(-29) }, { name: "Full requested", ms: t(-20) }, { name: "Full sent", ms: t(-19) }, { name: "Offer", ms: t(-3) }], due: now, yours: true },
  ];
  await page.addInitScript(guide);
  await page.addInitScript((c) => { (window as unknown as { __SA_QC138_PEEK_LAB: unknown }).__SA_QC138_PEEK_LAB = c; }, cases);
  for (const vp of [{ width: 1512, height: 900 }, { width: 1100, height: 800 }]) {
    await openRoute(page, "/queries", vp);
    const lab = page.locator('[data-qc138="peek-lab"]').filter({ visible: true }).first();
    await lab.waitFor({ timeout: 30_000 });
    await page.waitForTimeout(600);
    await lab.screenshot({ path: `${OUT}/10-peek-edge-cases-${vp.width}.png` });
  }
  await page.evaluate(() => { (window as unknown as { __SA_QC138_PEEK_LAB?: unknown }).__SA_QC138_PEEK_LAB = undefined; });
});

test("widths", async ({ page }) => {
  test.setTimeout(300_000);
  await page.addInitScript(guide);
  for (const vp of [{ width: 1920, height: 1080 }, { width: 1024, height: 800 }]) {
    await openRoute(page, "/queries", vp);
    await page.locator('[data-qcv="row"]').filter({ visible: true }).first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/queries-${vp.width}.png` });
  }
});
