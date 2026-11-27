/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.1 — a recording of the real list (emulator seed): the pointer moving down the rows so each replays
 * its track, then the filter panel scrolling under its pinned header. Not a lock: it writes
 * reports/qc-v172-1/hover-and-pin.webm and a few stills.
 */
import { test } from "@playwright/test";
import { copyFileSync, mkdirSync } from "node:fs";
import { openQc } from "./nb1Lib";
import { liftMotionSuppression, visiblePage } from "./measure";

test.use({ video: { mode: "on", size: { width: 1512, height: 982 } }, viewport: { width: 1512, height: 982 } });
test.setTimeout(240_000);
const DIR = "reports/qc-v172-1";

test("QC172.1 recording", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  await openQc(page, { width: 1512, height: 982 }, { group: "attention" });
  const V = await visiblePage(page);
  await liftMotionSuppression(page); /* the harness kills animation for measurements; this is a recording of it */
  const sw = page.locator(`${V}[data-qc151='switch'] [data-v='list']`);
  if ((await sw.getAttribute("aria-pressed")) !== "true") { await sw.click(); await page.waitForTimeout(1200); }
  await page.evaluate((V) => {
    const c = document.querySelector<HTMLElement>(`${V}[data-qc151='switch']`); const sc = c?.closest<HTMLElement>(".wpg-scroll");
    if (c && sc) sc.scrollTop += c.getBoundingClientRect().top - sc.getBoundingClientRect().top - 150;
  }, V);
  await page.waitForTimeout(800);
  const rows = page.locator(`${V}[data-qc172='row']`);
  for (let i = 0; i < 5; i++) {
    const b = (await rows.nth(i).boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.35, b.y + b.height / 2, { steps: 12 });
    await page.waitForTimeout(i === 0 ? 350 : 1400);
    if (i === 0) await page.screenshot({ path: `${DIR}/hover-mid-replay.png` });
    if (i === 0) await page.waitForTimeout(1050);
  }
  await page.screenshot({ path: `${DIR}/hover-settled.png` });
  /* the panel: open More filters and scroll it — the navy header stays */
  await page.locator(`${V}.qs172-more`).click();
  await page.waitForTimeout(500);
  const col = (await page.locator(`${V}.qc153-railcol`).boundingBox())!;
  await page.mouse.move(col.x + col.width / 2, col.y + 300, { steps: 10 });
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(120); }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${DIR}/panel-scrolled-header-pinned.png` });
  await page.waitForTimeout(500);
  const v = page.video();
  await page.close();
  if (v) copyFileSync(await v.path(), `${DIR}/hover-and-pin.webm`);
});
