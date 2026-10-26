/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.3 — the report's screen beside the ref's `screens/01-empties-hover-1512.png`, from the deployed dev
 * site (`CL253_SHOTS=1 SA_E2E_BASE_URL=dev`): a row with no genres and no wishlist, hovered. Read-only. Skipped unless
 * asked.
 */
import { test } from "@playwright/test";
import { openCl24, shot } from "./cl253Lib";

test.skip(process.env.CL253_SHOTS !== "1", "CL253_SHOTS=1 to take the report's screen");

test("CL253 screen @ 1512", async ({ page }) => {
  test.setTimeout(300_000);
  await openCl24(page, { width: 1512, height: 900 });
  const row = page.locator("[data-cl24='row'][data-id='clv181-bare']").first();
  await row.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const r = document.querySelector<HTMLElement>("[data-cl24='row'][data-id='clv181-bare']");
    const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetWidth);
    if (r && sc) sc.scrollBy(0, r.getBoundingClientRect().top - sc.getBoundingClientRect().top - 260);
  });
  await page.waitForTimeout(400);
  await row.hover();
  await page.waitForTimeout(400);
  await shot(page, "01-empties-hover-1512");
});
