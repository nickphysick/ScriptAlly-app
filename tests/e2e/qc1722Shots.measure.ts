/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.2 — close-ups of the current step's badge: inbound, outbound, closed (ended) and quiet, on the
 * emulator seed. Not a lock: it writes reports/qc-v172-2/badge-<dir>.png (the current step, 3× zoom).
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openQc } from "./nb1Lib";
import { visiblePage } from "./measure";

test.use({ deviceScaleFactor: 3 });
test.setTimeout(180_000);
const DIR = "reports/qc-v172-2";

test("QC172.2 badge close-ups", async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  await openQc(page, { width: 1512, height: 982 }, { group: "attention" });
  const V = await visiblePage(page);
  const sw = page.locator(`${V}[data-qc151='switch'] [data-v='list']`);
  if ((await sw.getAttribute("aria-pressed")) !== "true") { await sw.click(); await page.waitForTimeout(1200); }
  const fold = page.locator(`${V}[data-qc153='fold'][data-k='closed'] [data-qc153='show-all']`);
  if (await fold.count()) { await fold.click(); await page.waitForTimeout(600); }
  for (const dir of ["in", "out", "end", "quiet"]) {
    const step = page.locator(`${V}[data-qc172='row'] .qr170-sp.is-cur:has(.qr170-arw.d-${dir})`).first();
    if (!(await step.count())) continue;
    await step.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const b = (await step.boundingBox())!;
    await page.screenshot({ path: `${DIR}/badge-${dir}.png`, clip: { x: b.x - 24, y: b.y - 12, width: b.width + 48, height: b.height + 20 } });
  }
});
