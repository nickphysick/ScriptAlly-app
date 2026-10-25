/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v150 — the report's screens, at 1280 × 800 and 1512 × 900, matching design-refs/query-centre-v150/
 * screens 01–10. Not a lock: it writes reports/qc-v150/shots/<name>-<width>.png.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openQc } from "./nb1Lib";

test.setTimeout(420_000);
const DIR = "reports/qc-v150/shots";
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
async function birds(page: Page) { await click(page, "[data-qc150='switch'] [data-v='birds']"); await page.waitForTimeout(900); }

for (const vp of SIZES) {
  test(`QC150 shots @ ${vp.width}`, async ({ page }) => {
    mkdirSync(DIR, { recursive: true });
    const shot = (n: string) => page.screenshot({ path: `${DIR}/${n}-${vp.width}.png` });
    await openQc(page, vp);
    await page.mouse.move(2, 2);
    await shot("01-top");
    await toTitle(page, 160);
    await shot("02-list");
    await click(page, "[data-qc150='card'][data-k='you'] [data-qc150='hit']");
    await page.waitForTimeout(900);
    await page.evaluate(() => { const sc = document.querySelector<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop = Math.max(0, sc.scrollTop - 330); });
    await page.waitForTimeout(400);
    await shot("03-card-pressed");
    await click(page, "[data-qc150='card'][data-k='you'] [data-qc150='hit']");
    await page.waitForTimeout(700);
    await birds(page);
    await toTitle(page, 160);
    await shot("04-birdseye");
    await page.evaluate(() => { const sc = document.querySelector<HTMLElement>(".wpg-scroll"); if (sc) sc.scrollTop += 700; });
    await page.waitForTimeout(500);
    await shot("05-birdseye-pinned");
    await toTitle(page, 160);
    await click(page, "[data-qc150='zoom'] [data-z='6m']");
    await page.waitForTimeout(800);
    await shot("06-birdseye-6m");
    await click(page, "[data-qc150='zoom'] [data-z='6w']");
    await page.waitForTimeout(800);
    const ax = (await page.locator("[data-qc150='axis']").boundingBox())!;
    await page.mouse.move(ax.x + ax.width / 2, ax.y + 60);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(ax.x + ax.width / 2 + i * 40, ax.y + 60);
    await page.waitForTimeout(150);
    await page.mouse.move(ax.x + ax.width / 2 + 399, ax.y + 60);
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(900);
    await shot("07-birdseye-6w-back");
    await click(page, "[data-qc150='zoom'] [data-z='3m']");
    await page.waitForTimeout(500);
    await click(page, "[data-qc150='today']");
    await page.waitForTimeout(700);
    await click(page, "[data-qc150='be-group-pill']");
    await page.waitForTimeout(400);
    await shot("08-group-menu");
    await click(page, "[data-qc150='be-menu'] [data-v='status']");
    await page.waitForTimeout(800);
    await shot("09-group-status");
    await click(page, "[data-qc150='be-menu'] [data-v='urgency']");
    await click(page, "[data-qc150='be-group-pill']");
    await page.waitForTimeout(300);
    await click(page, "[data-qc150='be-menu'] [data-v='urgency']");
    await page.waitForTimeout(700);
    await click(page, "[data-qc150='be-row']:nth-of-type(2) [data-qc150='be-bar']");
    await page.waitForTimeout(1600);
    await shot("10-birdseye-card");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await click(page, "[data-qc150='switch'] [data-v='list']");
  });
}
