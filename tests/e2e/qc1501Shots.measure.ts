/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v150.1 — the report's screens at 1280 × 800 and 1512 × 900, matching design-refs/query-centre-v150-1/
 * screens 01–06. Not a lock: it writes reports/qc-v150-1/shots/<name>-<width>.png.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openQc } from "./nb1Lib";

test.setTimeout(420_000);
const DIR = "reports/qc-v150-1/shots";
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
const click = (page: Page, sel: string) => page.evaluate((s) => ([...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0))?.click(), sel);
async function toTitle(page: Page, gap: number) {
  await page.evaluate((g) => {
    const t = [...document.querySelectorAll<HTMLElement>("[data-qc150='title']")].find((e) => e.getBoundingClientRect().height > 0);
    const sc = t?.closest<HTMLElement>(".wpg-scroll");
    if (t && sc) sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - g;
  }, gap);
  await page.waitForTimeout(500);
}

for (const vp of SIZES) {
  test(`QC1501 shots @ ${vp.width}`, async ({ page }) => {
    mkdirSync(DIR, { recursive: true });
    const shot = (n: string) => page.screenshot({ path: `${DIR}/${n}-${vp.width}.png` });
    await openQc(page, vp);
    await page.mouse.move(2, 2);
    await shot("01-top");
    await toTitle(page, 40);
    await shot("02-list");
    await click(page, "[data-qc150='switch']:not([data-compact]) [data-v='birds']");
    await page.waitForTimeout(900);
    await toTitle(page, 40);
    const id = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='be-row']")].find((r) => r.getBoundingClientRect().top > 420 && r.querySelector(".qc150-xa button"))?.dataset.id ?? "");
    if (id) await page.hover(`[data-qc150='be-row'][data-id='${id}'] .qc150-ag`);
    await page.waitForTimeout(400);
    await shot("03-birdseye-hover");
    await page.mouse.move(2, 2);
    await click(page, "[data-qc150='be-group-pill']");
    await page.waitForTimeout(400);
    await shot("04-birdseye-group-menu");
    await page.keyboard.press("Escape");
    await click(page, "[data-qc150='switch']:not([data-compact]) [data-v='list']");
    await page.waitForTimeout(700);
    await click(page, "[data-qc149='full']");
    await page.waitForTimeout(1300);
    await shot("05-full-list");
    await click(page, "[data-qc150='switch'][data-compact] [data-v='birds']");
    await page.waitForTimeout(1000);
    await shot("06-full-birdseye");
    await click(page, "[data-qc142='full-tb']");
    await page.waitForTimeout(800);
    await click(page, "[data-qc150='switch']:not([data-compact]) [data-v='list']");
  });
}
