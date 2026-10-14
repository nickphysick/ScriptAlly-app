/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v17.1 — the report's screenshots, beside each `design-refs/contact-list-v17-amend/screens/*` file.
 * Not a lock: it asserts nothing and runs only with `CL171_SHOTS=1`.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openContacts16, setScroll16 } from "./cl16Lib";

const OUT = "reports/contact-list-v17-1/shots";
const ON = process.env.CL171_SHOTS === "1";

test.describe("Contact list v17.1 · shots", () => {
  test.skip(!ON, "set CL171_SHOTS=1 to write the report's screenshots");
  test.beforeAll(() => mkdirSync(OUT, { recursive: true }));
  for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
    test(`top · ${vp.width}`, async ({ page }) => {
      await openContacts16(page, vp);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/01-top-${vp.width}.png` });
      if (vp.width !== 1512) return;
      const card = page.locator('.aglist [data-cl17="card"]').filter({ visible: true }).first();
      await card.screenshot({ path: `${OUT}/02-card-and-health-1512.png` });
      await page.screenshot({ path: `${OUT}/03-tab-1512.png`, clip: { x: vp.width - 520, y: vp.height - 220, width: 520, height: 220 } });
      const x = page.locator('[data-ftab-x="housekeeping"]');
      if (await x.count()) {
        await x.click(); await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}/04-tab-dismissed-1512.png`, clip: { x: vp.width - 520, y: vp.height - 220, width: 520, height: 220 } });
        await page.locator('[data-hkv="tab-undo"]').click(); await page.waitForTimeout(500);
      }
      await setScroll16(page, 1500); await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/06-pinned-1512.png` });
    });
  }
});
