/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * plateShots — the plate header's report pictures (not a lock): the Query Centre at rest and scrolled,
 * a 3× crop where the courier crosses the plate's top edge, and the Contact list for comparison, at
 * 1280 and 1440. Written to reports/qc-plate/.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";
import { scrollTo, suppressMotion, tagScroller } from "./quietBarLib";

test.describe.configure({ timeout: 600_000 });
const DIR = "reports/qc-plate";

for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }] as const) {
  test(`plate shots at ${vp.width}`, async ({ page, browser }) => {
    mkdirSync(DIR, { recursive: true });
    await openApp(page, "/queries", vp);
    await suppressMotion(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${DIR}/qc-rest-${vp.width}.png` });
    const sc = await tagScroller(page);
    if (sc) { await scrollTo(page, Math.min(240, sc.max)); await page.screenshot({ path: `${DIR}/qc-scrolled-${vp.width}.png` }); await scrollTo(page, 0); }
    const fig = await page.evaluate(() => {
      const f = [...document.querySelectorAll('[data-probe="art-figure"]')].find((e) => (e as HTMLElement).getBoundingClientRect().height > 0);
      const p = f?.closest('[data-probe="hero-frame"]');
      if (!f || !p) return null;
      const a = f.getBoundingClientRect(), b = p.getBoundingClientRect();
      return { x: a.left, w: a.width, top: b.top, figTop: a.top };
    });
    if (fig) {
      const ctx = await browser.newContext({ deviceScaleFactor: 3, viewport: vp, storageState: "tests/e2e/.auth/state.json" });
      const p3 = await ctx.newPage();
      await openApp(p3, "/queries", vp);
      await suppressMotion(p3);
      await p3.waitForTimeout(400);
      await p3.screenshot({ path: `${DIR}/qc-edge-3x-${vp.width}.png`, clip: { x: fig.x, y: fig.figTop - 4, width: fig.w, height: fig.top - fig.figTop + 60 } });
      await ctx.close();
    }
    await openApp(page, "/agents", vp);
    await suppressMotion(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${DIR}/contact-${vp.width}.png` });
  });
}
