/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pinned-row fix — the report's before-and-after shots: each page's pinned row, scrolled 1500px, at 1512 and 1280,
 * with 24px of context above and below. `PIN_SHOT_TAG=before|after` names the set. Writes images only.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";
import { PIN_PAGES, scrollPage } from "./pinLib";

const TAG = process.env.PIN_SHOT_TAG ?? "after";
test("pin shots", async ({ page }) => {
  test.setTimeout(300_000);
  mkdirSync("reports/pin-row/shots", { recursive: true });
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    for (const p of PIN_PAGES) {
      await openRoute(page, p.route, vp);
      await page.locator(p.group).first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1200);
      await scrollPage(page, p.group, 1500);
      const b = (await page.locator(p.row).first().boundingBox())!;
      await page.screenshot({ path: `reports/pin-row/shots/${TAG}-${p.key}-${vp.width}.png`, clip: { x: b.x, y: Math.max(0, b.y - 24), width: b.width, height: b.height + 48 } });
    }
  }
});
