/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The browsing grid, photographed at the four widths. Evidence, not an assertion — the claims live
 * in `queryCentreCard.measure.ts`; these are what a reader looks at.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync } from "node:fs";

const WIDTHS = [1280, 1440, 1920, 2560];

test("the browsing grid at four widths", async ({ page }) => {
  mkdirSync("reports/query-centre-shots", { recursive: true });
  for (const width of WIDTHS) {
    await openRoute(page, "/queries", { width, height: 900 });
    await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
    /* ⚠️ COLUMN COUNT IS REPORTED, NOT ASSERTED. It is a property of the width available beside the
       rail, not of the card — pinning it here would fail the day the content cap moves. */
    const cols = await page.evaluate(() => {
      const g = document.querySelector(".qcc-grid") as HTMLElement | null;
      return g ? getComputedStyle(g).gridTemplateColumns.split(" ").length : 0;
    });
    // eslint-disable-next-line no-console
    console.log(`  ${width}px → ${cols} columns`);
    await page.screenshot({ path: `reports/query-centre-shots/pass2-${width}.png`, fullPage: false });
  }

  /* ⚠️ AND ONE WITH A POPOVER OPEN, AT THE WIDTH WHERE IT USED TO RUN OFF THE SCREEN. A grid shot
     cannot show a clipped menu; this is the only frame that can. */
  await openRoute(page, "/queries", { width: 1280, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  const sort = page.locator('.f12-lhead [aria-label="Sort"]').first();
  await expect(sort).toBeVisible({ timeout: 15_000 });
  await sort.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "reports/query-centre-shots/pass2-1280-sort-open.png", fullPage: false });
});
