/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151 — the report's screens, beside design-refs/query-centre-v151/screens/01–11. Off unless
 * QC151_SHOTS=1 (a routine run writes nothing). Harness data, not the mock's.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(300_000);
const ON = process.env.QC151_SHOTS === "1";
const OUT = "reports/qc-v151/shots";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;

async function open(page: Page, vp: { width: number; height: number }, view: "list" | "birds" = "list") {
  await page.addInitScript((v: string) => {
    sessionStorage.removeItem("qh.qc.filters");
    sessionStorage.setItem("qh.qc.view150", v);
    localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "attention", sort: { key: "due", reversed: false }, density: "comfortable" }));
    localStorage.setItem("sa.guide.queries", "1");
    localStorage.removeItem("sa.guide.queries-explainer");
  }, view);
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'], [data-qc151='birds-card']").first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
}
const click = (page: Page, sel: string) => page.evaluate((s) => ([...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0))?.click(), sel);
const shot = (page: Page, name: string, w: number) => page.screenshot({ path: `${OUT}/${name}-${w}.png` });
const scrollBy = (page: Page, sel: string, pad: number) => page.evaluate(([s, p]) => {
  const t = [...document.querySelectorAll<HTMLElement>(s as string)].find((e) => e.getBoundingClientRect().height > 0);
  const sc = t?.closest<HTMLElement>(".wpg-scroll");
  if (t && sc) sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - (p as number);
}, [sel, pad] as const);

for (const vp of SIZES) {
  test(`QC151 screens @ ${vp.width}`, async ({ page }) => {
    test.skip(!ON);
    mkdirSync(OUT, { recursive: true });
    const w = vp.width;
    await open(page, vp);
    await shot(page, "01-top-list", w);
    await scrollBy(page, "[data-qc151='table']", 0);
    const row = page.locator("[data-qc151='row']").first();
    await row.hover({ position: { x: 300, y: 20 } });
    await page.waitForTimeout(1500);
    await shot(page, "02-hover-timeline", w);
    await page.mouse.move(5, 5);
    await scrollBy(page, "[data-qc151='header']", 40);
    await click(page, "[data-qc151='filters']");
    await page.waitForTimeout(300);
    await click(page, "[data-qc140='quick'][data-qp='over']");
    await page.waitForTimeout(500);
    await shot(page, "03-filters-open", w);
    const t = await page.locator("[data-qc151='title']").first().boundingBox();
    if (t) await page.mouse.click(t.x + 4, t.y + 4);
    await page.locator("[data-qc151='find'] input").fill("ma");
    await page.waitForTimeout(500);
    await shot(page, "04-active-strip", w);
    await page.locator("[data-qc151='find'] input").fill("zzzz");
    await page.waitForTimeout(500);
    await shot(page, "05-no-matches", w);
    await click(page, "[data-qc151='strip-reset']");
    await page.waitForTimeout(400);
    await click(page, "[data-qc151='group']");
    await page.waitForTimeout(400);
    await shot(page, "06-group-menu", w);
    await page.keyboard.press("Escape");
    await page.evaluate(() => { const sc = document.querySelector<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop = sc.scrollHeight; });
    await page.waitForTimeout(600);
    await shot(page, "07-closed-and-signoff", w);
    await page.evaluate(() => { const sc = document.querySelector<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop = 0; });
    await click(page, "[data-qc151='switch'] [data-v='birds']");
    await page.waitForTimeout(1500);
    await shot(page, "08-birdseye", w);
    const br = page.locator("[data-qc150='be-row']").nth(1);
    await br.hover({ position: { x: 600, y: 20 } });
    await page.waitForTimeout(600);
    await shot(page, "09-birdseye-hover", w);
    await page.mouse.move(5, 5);
    await click(page, "[data-qc151='be-group']");
    await page.waitForTimeout(400);
    await shot(page, "10-birdseye-group-menu", w);
    await page.keyboard.press("Escape");
    await click(page, "[data-qc151='tabs'] [data-k='closed']");
    await page.waitForTimeout(800);
    await shot(page, "11-birdseye-closed-tab", w);
  });
}
