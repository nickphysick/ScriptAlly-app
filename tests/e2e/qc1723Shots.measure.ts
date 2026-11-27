/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.3 — stills: the Sent chart over the whole (long) campaign, the same chart narrowed by search to an
 * agent whose queries all went out within 26 weeks (weekly bars), and Ottoline Frayn's row (no stage start recorded:
 * the reason line from the track's date). Not a lock: writes reports/qc-v172-3/*.png on the emulator seed.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openQc } from "./nb1Lib";
import { visiblePage } from "./measure";

test.use({ deviceScaleFactor: 2 });
test.setTimeout(240_000);
const DIR = "reports/qc-v172-3";
const sentBox = (page: Page, V: string) => page.evaluate((V) => {
  const sec = [...document.querySelectorAll<HTMLElement>(`${V}.qs172-s`)].find((s) => s.querySelector(".qs172-sh b")?.textContent?.trim() === "Sent");
  if (!sec) return null;
  const b = sec.getBoundingClientRect();
  return { x: b.x, y: b.y, width: b.width, height: b.height, scale: [...sec.querySelectorAll(".qs172-scale span")].map((x) => x.textContent ?? ""), bars: sec.querySelectorAll(".qs172-hist > i").length };
}, V);

test("QC172.3 stills", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  await openQc(page, { width: 1512, height: 982 }, { group: "attention" });
  const V = await visiblePage(page);
  const sw = page.locator(`${V}[data-qc151='switch'] [data-v='list']`);
  if ((await sw.getAttribute("aria-pressed")) !== "true") { await sw.click(); await page.waitForTimeout(1200); }
  const long = (await sentBox(page, V))!;
  console.log(`long campaign: ${long.bars} bars · ${JSON.stringify(long.scale)}`);
  await page.screenshot({ path: `${DIR}/sent-long.png`, clip: { x: long.x, y: long.y, width: long.width, height: long.height } });
  /* a short campaign: search each agent in turn until the chart is weekly (no year on its scale) */
  const names = await page.evaluate((V) => [...new Set([...document.querySelectorAll(`${V}[data-qc172='row'] .qr170-who b`)].map((b) => b.textContent ?? ""))], V);
  const find = page.locator(`${V}[data-qc151='toolbar'] input`).first();
  for (const n of names) {
    await find.fill(n);
    await page.waitForTimeout(500);
    const b = await sentBox(page, V);
    if (b && b.bars > 2 && !b.scale.some((t) => /’/.test(t))) {
      console.log(`short campaign (${n}): ${b.bars} bars · ${JSON.stringify(b.scale)}`);
      await page.screenshot({ path: `${DIR}/sent-short.png`, clip: { x: b.x, y: b.y, width: b.width, height: b.height } });
      break;
    }
  }
  await find.fill("");
  await page.waitForTimeout(600);
  const row = page.locator(`${V}[data-qc172='row'][data-ss='none'][data-court='you']`).first();
  if (await row.count()) {
    await row.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);
    await row.screenshot({ path: `${DIR}/row-no-stage-start.png` });
  }
});
