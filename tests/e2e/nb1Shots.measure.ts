/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * navy-bar-address-book v1 — the report's screens, matching the pack's qc-01..05 and cl-01..06 at 1280 and 1512.
 * `NB1_SHOTS=qc` or `=cl` draws one page's set only.
 */
import { test } from "@playwright/test";
import { SIZES, freshCl, openQc, shot } from "./nb1Lib";

const ONLY = process.env.NB1_SHOTS ?? "";
const scrollList = (page: import("@playwright/test").Page, by: number) => page.evaluate((y) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
  if (sc) sc.scrollTop += y;
}, by);

test("NB1 shots · Query Centre", async ({ page }) => {
  test.skip(ONLY === "cl");
  test.setTimeout(600_000);
  for (const vp of SIZES) {
    await openQc(page, vp, { view: "list" });
    await scrollList(page, 330); await page.waitForTimeout(500);
    await shot(page, `qc-01-list-${vp.width}`);
    await scrollList(page, 520); await page.waitForTimeout(500);
    await shot(page, `qc-02-list-scrolled-${vp.width}`);
    await openQc(page, vp, { view: "cards" });
    await scrollList(page, 300); await page.waitForTimeout(500);
    await shot(page, `qc-03-cards-${vp.width}`);
    await openQc(page, vp, { view: "cards", full: true });
    await shot(page, `qc-04-full-screen-cards-${vp.width}`);
    await openQc(page, vp, { view: "list", full: true });
    await scrollList(page, 260); await page.waitForTimeout(500);
    await shot(page, `qc-05-full-screen-list-${vp.width}`);
  }
});

test("NB1 shots · Contact list", async ({ page }) => {
  test.skip(ONLY === "qc");
  test.setTimeout(600_000);
  for (const vp of SIZES) {
    await freshCl(page, vp);
    await shot(page, `cl-01-at-rest-${vp.width}`);
    await scrollList(page, 2000); await page.waitForTimeout(600);
    await shot(page, `cl-02-docked-${vp.width}`);
    await page.locator("[data-nb1='book'] [data-nb1='pill'][data-k='you']").first().click();
    await page.locator("[data-nb1='book'] [data-nb1='find'] input").first().fill("a");
    await page.waitForTimeout(500);
    await shot(page, `cl-03-your-move-search-${vp.width}`);
    await freshCl(page, vp);
    await scrollList(page, 2000); await page.waitForTimeout(400);
    await page.locator("[data-nb1='book'] [data-nb1='filters']").first().click();
    await page.waitForTimeout(500);
    await shot(page, `cl-04-filters-${vp.width}`);
    await freshCl(page, vp, { sort: "added" });
    await scrollList(page, 2000); await page.waitForTimeout(400);
    await shot(page, `cl-05-sort-date-added-${vp.width}`);
    await freshCl(page, vp);
    await page.locator("[data-nb1='book'] [data-nb1='full']").first().click();
    await page.waitForTimeout(800);
    await shot(page, `cl-06-full-screen-${vp.width}`);
  }
});
