/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151.1 — the report's screens, beside design-refs/query-centre-v151-1/screens/01–12. Off unless
 * QC1511_SHOTS=1 (a routine run writes nothing). Harness data, not the mock's.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(300_000);
const ON = process.env.QC1511_SHOTS === "1";
const OUT = "reports/qc-v151-1/shots";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;

async function open(page: Page, vp: { width: number; height: number }, view: "list" | "birds" = "list") {
  await page.addInitScript((v: string) => {
    sessionStorage.removeItem("qh.qc.filters");
    sessionStorage.removeItem("qh.qc.collapsed1511");
    sessionStorage.setItem("qh.qc.view150", v);
    localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "attention", sort: { key: "due", reversed: false }, density: "comfortable" }));
    localStorage.setItem("sa.guide.queries", "1");
  }, view);
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'], [data-qc151='birds-card']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
}
const click = (page: Page, sel: string) => page.evaluate((s) => ([...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0))?.click(), sel);
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${OUT}/${name}-${w}.png` });
const scrollTo = (page: Page, sel: string, pad: number) => page.evaluate(([s, p]) => {
  const t = [...document.querySelectorAll<HTMLElement>(s as string)].find((e) => e.getBoundingClientRect().height > 0);
  const sc = t?.closest<HTMLElement>(".wpg-scroll");
  if (t && sc) sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - (p as number);
}, [sel, pad] as const);
const top = (page: Page) => page.evaluate(() => { const sc = document.querySelector<HTMLElement>(".qc151")?.closest<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop = 0; });

for (const vp of SIZES) {
  test(`QC1511 screens @ ${vp.width}`, async ({ page }) => {
    test.skip(!ON);
    mkdirSync(OUT, { recursive: true });
    const w = vp.width;
    await open(page, vp);
    await shot(page, "01-top", w);
    await scrollTo(page, "[data-qc1511='control-line']", 0);
    await page.waitForTimeout(300);
    await shot(page, "02-list", w);
    await page.evaluate(() => {
      const g = document.querySelectorAll<HTMLElement>("[data-qc1511='group']")[1];
      const r = g?.querySelectorAll<HTMLElement>("[data-qc151='row']")[2];
      const sc = r?.closest<HTMLElement>(".wpg-scroll");
      if (r && sc) sc.scrollTop += r.getBoundingClientRect().top - sc.getBoundingClientRect().top - 120;
    });
    await page.waitForTimeout(300);
    await shot(page, "03-sticky-group-header", w);
    await page.evaluate(() => { const sc = document.querySelector<HTMLElement>(".qc151")?.closest<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop = sc.scrollHeight; });
    await page.waitForTimeout(500);
    await shot(page, "04-closed-and-signoff", w);
    await top(page);
    await click(page, "[data-qc151='filters']");
    await page.waitForTimeout(300);
    await click(page, "[data-qc140='quick'][data-qp='over']");
    await click(page, "[data-qc140='stand'][data-k='pr']");
    await click(page, "[data-qc140='stand'][data-k='ps']");
    await page.waitForTimeout(400);
    await scrollTo(page, "[data-qc1511='quick-row']", 20);
    await page.waitForTimeout(300);
    await shot(page, "05-filters-open", w);
    await click(page, "[data-qc140='filter-close']");
    await page.waitForTimeout(300);
    await click(page, "[data-qc151='group']");
    await page.waitForTimeout(400);
    await shot(page, "06-group-menu", w);
    await click(page, "[data-qc151='menu'][data-k='group'] [data-qc151='menu-opt'][data-v='status']");
    await page.waitForTimeout(300);
    await click(page, "[data-qc1511='label'][data-k='queried'] button");
    await page.waitForTimeout(400);
    await top(page);
    await shot(page, "07-pills", w);
    await page.locator("[data-qc151='find'] input").fill("zzzz");
    await page.waitForTimeout(500);
    await shot(page, "08-no-matches", w);
    await click(page, "[data-qc1511='clear-all']");
    await page.waitForTimeout(400);
    await click(page, "[data-qc1511='quick'] [data-k='you']");
    await page.waitForTimeout(500);
    await shot(page, "09-your-move-tab", w);
    await click(page, "[data-qc1511='quick'] [data-k='all']");
    await page.waitForTimeout(400);
    await click(page, "[data-qc1511='group'] [data-qc1511='fold']");
    await page.waitForTimeout(400);
    await scrollTo(page, "[data-qc1511='control-line']", 0);
    await shot(page, "10-collapsed-group", w);
    await click(page, "[data-qc1511='group'] [data-qc1511='fold']");
    await top(page);
    await click(page, "[data-qc151='switch'] [data-v='birds']");
    await page.waitForTimeout(1500);
    await scrollTo(page, "[data-qc1511='quick-row']", 20);
    await page.waitForTimeout(300);
    await shot(page, "11-birdseye", w);
    const br = page.locator("[data-qc150='be-row']").nth(1);
    await br.hover({ position: { x: 600, y: 20 } }).catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, "12-birdseye-hover", w);
  });
}
