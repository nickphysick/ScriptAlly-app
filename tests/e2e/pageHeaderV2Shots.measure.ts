/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * pageHeaderV2Shots — the §5 sweep's pictures: every bar route at 1280 and 1440, the two full
 * headers beside the ref at the same widths, the switcher's menu open and the quick-add card open.
 * Pictures, not locks; the locks are in pageHeaderV2.measure.ts. Written to reports/page-header-v2/shots/.
 */
import { expect, test } from "@playwright/test";
import { mkdirSync } from "fs";
import { BAR_ROUTES, MOCK, openApp } from "./pageHeaderV2Lib";

const OUT = "reports/page-header-v2/shots";
test.describe.configure({ timeout: 900_000 });
const slug = (r: string) => (r === "/" ? "root" : r.replace(/^\//, "").replace(/[/?=&]/g, "-"));

for (const w of [1280, 1440] as const) {
  test(`shots at ${w}`, async ({ page, browser }) => {
    mkdirSync(OUT, { recursive: true });
    let n = 0;
    for (const route of BAR_ROUTES) {
      await openApp(page, route, { width: w, height: 900 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${slug(route)}-${w}.png` }); n++;
    }
    const m = await browser.newPage();
    await m.setViewportSize({ width: w, height: 900 });
    await m.goto(MOCK); await m.evaluate(() => document.fonts.ready); await m.waitForTimeout(300);
    await m.screenshot({ path: `${OUT}/mock-${w}.png` }); n++;
    await m.close();
    if (w === 1440) {
      await openApp(page, "/agents", { width: w, height: 900 });
      await page.locator('[data-shell="switcher"] > button').first().click(); await page.waitForTimeout(200);
      await page.screenshot({ path: `${OUT}/switcher-open-${w}.png` }); n++;
      await page.keyboard.press("Escape");
      /* ⚠️ BY LABEL: every workspace page stays mounted, so a bare `.ph-primary` first() is the Query
         Centre's hidden header — the click then waits out the test for an element nobody can see */
      await page.locator('[data-probe="page-header"] .ph-primary').filter({ hasText: "+ Add an agent" }).first().click(); await page.waitForTimeout(200);
      await page.screenshot({ path: `${OUT}/quickadd-open-${w}.png` }); n++;
    }
    expect(n).toBeGreaterThan(BAR_ROUTES.length);
  });
}
