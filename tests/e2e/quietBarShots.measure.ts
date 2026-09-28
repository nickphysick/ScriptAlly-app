/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * quietBarShots — the quiet bar's three states (rest · scrolled · named) on three routes at 1280 and
 * 1440, for the report. Pictures, not locks: the locks are quietBar.measure.ts. Written to
 * reports/quiet-bar/shots/.
 */
import { expect, test } from "@playwright/test";
import { mkdirSync } from "fs";
import { openApp } from "./pageHeaderV2Lib";
import { scrollTo, suppressMotion, tagScroller, titleGoneAt } from "./quietBarLib";

const OUT = "reports/quiet-bar/shots";
const ROUTES = ["/queries", "/agents", "/manuscripts/packages"] as const;
test.describe.configure({ timeout: 900_000 });

for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }] as const) {
  test(`quiet bar shots at ${vp.width}`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    let n = 0;
    for (const route of ROUTES) {
      const slug = route.slice(1).replace(/\//g, "-");
      await openApp(page, route, vp);
      await suppressMotion(page);
      const sc = await tagScroller(page);
      await scrollTo(page, 0);
      await page.screenshot({ path: `${OUT}/${slug}-${vp.width}-rest.png`, clip: { x: 0, y: 0, width: vp.width, height: 360 } }); n++;
      await scrollTo(page, 3);
      await page.screenshot({ path: `${OUT}/${slug}-${vp.width}-scrolled.png`, clip: { x: 0, y: 0, width: vp.width, height: 360 } }); n++;
      const gone = await titleGoneAt(page);
      await scrollTo(page, Math.min(sc?.max ?? 0, (gone ?? 0) + 40));
      await page.screenshot({ path: `${OUT}/${slug}-${vp.width}-named.png`, clip: { x: 0, y: 0, width: vp.width, height: 360 } }); n++;
    }
    expect(n).toBe(ROUTES.length * 3);
  });
}
