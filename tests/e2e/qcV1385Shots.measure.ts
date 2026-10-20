/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.5 — the report's screenshots: the states of design-refs/query-centre-v138-5/screens/01–11, at
 * 1512 × 900 and 1280 × 800 with the shell. Writes reports/qc-v138-5/shots/. Asserts only that each state was reached.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/qc-v138-5/shots";
const G = ".qcv-group[data-v138]";

async function open(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  await openRoute(page, "/queries", vp);
  await page.locator(G).first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.mouse.move(5, 5);
}
const scrollTo = (page: Page, y: number) => page.evaluate((top) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0 && e.querySelector(".qcv-group[data-v138]"));
  if (sc) { sc.style.scrollBehavior = "auto"; sc.scrollTop = top; }
}, y);

test("v138.5 shots", async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}.png` });
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    const w = vp.width;
    await open(page, vp);
    await shot(`01-02-top-${w}`);
    /* 03 · a status selected */
    await page.locator(`${G} [data-qc138="glyph-btn"][data-k="pr"]`).click();
    await page.mouse.move(5, 5); await page.waitForTimeout(500);
    await shot(`03-status-selected-${w}`);
    await page.locator(`${G} [data-qc138="glyph-btn"][data-k="pr"]`).click();
    /* 05 · a glyph hovered */
    await page.locator(`${G} [data-qc138="glyph-btn"][data-k="ps"]`).hover(); await page.waitForTimeout(400);
    await shot(`05-glyph-hover-${w}`);
    /* 06 · the chart: rest, a week hovered, a week clicked */
    await page.mouse.move(5, 5); await page.waitForTimeout(300);
    const card = (await page.locator(`${G} [data-qc138="chart"]`).boundingBox())!;
    const clip = { x: card.x - 20, y: card.y - 20, width: card.width + 40, height: card.height + 40 };
    await page.screenshot({ path: `${OUT}/06a-chart-rest-${w}.png`, clip });
    await page.locator(`${G} [data-qc138="week"][data-i="8"]`).hover(); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/06b-chart-hover-${w}.png`, clip });
    await page.locator(`${G} [data-qc138="week"][data-i="10"]`).click(); await page.mouse.move(card.x + 30, card.y + 20); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/06c-chart-clicked-${w}.png`, clip });
    await page.mouse.move(5, 5);
    /* 04 · the Filters panel open */
    await page.locator(`${G} [data-qc138="filters-btn"]`).click(); await page.waitForTimeout(500);
    await expect(page.locator('[data-qc138="filters-panel"]')).toBeVisible();
    await shot(`04-filters-open-${w}`);
    await page.keyboard.press("Escape");
    /* 09 · 10 · the columns; 11 · the group bands */
    await scrollTo(page, 330); await page.waitForTimeout(500);
    await shot(`09-10-columns-${w}`);
    const band = (await page.locator(`${G} [data-qcv="gband"]`).first().boundingBox())!;
    await page.screenshot({ path: `${OUT}/11-group-band-${w}.png`, clip: { x: band.x - 10, y: band.y - 10, width: Math.min(560, band.width + 20), height: band.height + 20 } });
    /* 07 · 08 · pinned */
    await scrollTo(page, 0); await page.waitForTimeout(300);
    await page.locator(`${G} [data-qc138="pin"]`).click(); await page.mouse.move(5, 5); await page.waitForTimeout(900);
    await expect(page.locator(`${G} [data-qc138="pin"]`)).toHaveAttribute("aria-pressed", "true");
    await shot(`07-08-pinned-${w}`);
    await page.locator(`${G} [data-qc138="pin"]`).click(); await page.waitForTimeout(600);
  }
});
