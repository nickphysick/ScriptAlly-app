/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.5 — the report's screens beside design-refs/query-centre-v1725/01–03: the panel at rest (1512,
 * 1280), "Materials requested" picked with Sent opened, a key row hovered, keyboard focus on a segment, and the rail
 * scrolled to More filters opened. Not a lock: it writes reports/qc-v1725/shots/*.png over the emulator seed.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openQc } from "./nb1Lib";
import { visiblePage } from "./measure";

test.setTimeout(300_000);
const DIR = "reports/qc-v1725/shots";

async function list(page: Page, vp: { width: number; height: number }) {
  await openQc(page, vp, { group: "attention" });
  const V = await visiblePage(page);
  const sw = page.locator(`${V}[data-qc151='switch'] [data-v='list']`);
  if ((await sw.getAttribute("aria-pressed")) !== "true") { await sw.click(); await page.waitForTimeout(1200); }
  await page.waitForTimeout(900); /* the ring's draw-in and count-up */
  await page.mouse.move(2, 2);
  return V;
}

test("QC1725 shots", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  let V = await list(page, { width: 1512, height: 982 });
  await page.screenshot({ path: `${DIR}/01-rest-1512.png` });

  await page.locator(`${V}.qs172-rb[data-k='req']`).click();
  await page.locator(`${V}.qs172-fold[data-fold='sent'] .qs172-ft`).click();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${DIR}/02-picked-1512.png` });

  V = await list(page, { width: 1280, height: 900 });
  await page.screenshot({ path: `${DIR}/03-rest-1280.png` });

  V = await list(page, { width: 1512, height: 982 });
  await page.locator(`${V}.qs172-rb[data-k='nudge']`).hover();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/04-key-hovered-1512.png` });

  await page.mouse.move(2, 2);
  await page.locator(`${V}.qs172-rsvg circle.arc`).first().focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/05-segment-focused-1512.png` });

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.locator(`${V}.qs172-fold[data-fold='more'] .qs172-ft`).click();
  await page.waitForTimeout(400);
  await page.evaluate((V) => { const r = document.querySelector<HTMLElement>(`${V}.qc153-railcol`); if (r) r.scrollTop = r.scrollHeight; }, V);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/06-rail-more-open-1512.png` });
});
