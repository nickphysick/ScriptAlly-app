/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PRICING v4 — the signed-in /plans page must not move. Captures it before and after the pack and
 * compares the two screenshots pixel for pixel.
 *
 *   PV4_PLANS=before  write reports/pricing-v4/plans/before-<w>.png (run against the pre-pack build)
 *   PV4_PLANS=after   write after-<w>.png and compare with before-<w>.png
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/pricingV4.plans.measure.ts
 */
import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/pricing-v4/plans";
const MODE = process.env.PV4_PLANS ?? "after";

for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`/plans renders as it did before the pack @${vp.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    mkdirSync(DIR, { recursive: true });
    /* Signed in at desktop width (the shell check reads the desktop sidebar), then sized. */
    await openRoute(page, "/plans", { width: 1440, height: 900 });
    await page.setViewportSize(vp);
    await page.waitForSelector(".founder-row", { timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    const shot = await page.screenshot({ fullPage: true });
    writeFileSync(`${DIR}/${MODE}-${vp.width}.png`, shot);
    if (MODE === "after") {
      const before = `${DIR}/before-${vp.width}.png`;
      expect(existsSync(before), "a before capture exists").toBe(true);
      expect(Buffer.compare(readFileSync(before), shot), `/plans @${vp.width} differs from its pre-pack capture`).toBe(0);
    }
  });
}
