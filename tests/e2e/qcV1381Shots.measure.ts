/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.1 — the report's screenshots (reports/qc-v138-1/shots), named beside each
 * design-refs/query-centre-v138-1/screens/* file. Writes images only; asserts nothing.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/qc-v138-1/shots";
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
    await scrollTo(page, 420); await page.waitForTimeout(300);
    const s = page.locator('.qcv-group[data-v138] [data-qc138="search"] input');
    await s.click(); await s.fill("ag"); await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/08-search-${w}.png` });
    await s.fill(""); await page.keyboard.press("Escape");
    if (w === 1512) {
      for (const [n, sel] of [["04-timeline-overdue", '[data-qcv="row"][data-move="true"][data-court="agent"]'], ["05-timeline-waiting", '[data-qcv="row"][data-move="false"][data-court="agent"]']] as const) {
        const row = page.locator(`.qcv-group[data-v138] ${sel}`).first();
        await row.scrollIntoViewIfNeeded();
        await page.mouse.move(2, 2);
        await row.hover({ position: { x: 300, y: 18 } });
        await page.waitForTimeout(1100);
        await page.screenshot({ path: `${OUT}/${n}-1512.png` });
      }
    }
  }
});

test("scale sheet", async ({ page }) => {
  test.setTimeout(300_000);
  mkdirSync(OUT, { recursive: true });
  const D = 86_400_000, now = Date.now(), t = (d: number) => now + d * D;
  const cases = [
    { events: [{ name: "Queried", ms: t(-195) }, { name: "Full requested", ms: t(-15) }], due: t(7), yours: true },
    { events: [{ name: "Queried", ms: t(-70) }, { name: "Partial sent", ms: t(-35) }], due: t(2), yours: false },
    { events: [{ name: "Queried", ms: t(-3906) }], due: t(-3846), yours: true },
    { events: [{ name: "Queried", ms: t(-9) }, { name: "Partial requested", ms: t(-8) }], due: t(-7), yours: true },
    { events: [{ name: "Queried", ms: t(-2779) }, { name: "Full sent", ms: t(-2) }], due: t(355), yours: false },
  ];
  await page.addInitScript(guide);
  await page.addInitScript((c) => { (window as unknown as { __SA_QC138_PEEK_LAB: unknown }).__SA_QC138_PEEK_LAB = c; }, cases);
  for (const vp of [{ width: 1512, height: 900 }, { width: 1100, height: 800 }]) {
    await openRoute(page, "/queries", vp);
    const lab = page.locator('[data-qc138="peek-lab"]').filter({ visible: true }).first();
    await lab.waitFor({ timeout: 30_000 });
    await page.waitForTimeout(600);
    await lab.screenshot({ path: `${OUT}/${vp.width === 1512 ? "06" : "07"}-timeline-scale-${vp.width}.png` });
  }
});
