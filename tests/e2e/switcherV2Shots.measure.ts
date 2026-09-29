/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * switcherV2Shots — the report's pictures: the tile at rest, the menu open (with the shelved group,
 * seeded for the run and restored), and the shortcuts sheet open, at 1280 and 1440. Pictures, not
 * locks; the locks are switcherV2.measure.ts. Written to reports/switcher-v2/shots/.
 */
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "fs";
import { openApp } from "./pageHeaderV2Lib";

const OUT = "reports/switcher-v2/shots";
test.describe.configure({ timeout: 900_000 });

for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }] as const) {
  test(`switcher shots at ${vp.width}`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    execFileSync("node", ["tests/e2e/seedSwitcherShelved.mjs"], { stdio: "inherit" });
    try {
      await openApp(page, "/queries", vp);
      const bar = { x: 0, y: 0, width: vp.width, height: 130 };
      await page.screenshot({ path: `${OUT}/tile-${vp.width}.png`, clip: bar });
      await page.locator('[data-shell="switcher"] > button').first().click();
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${OUT}/menu-${vp.width}.png`, clip: { x: vp.width - 620, y: 0, width: 620, height: Math.min(vp.height, 720) } });
      await page.keyboard.press("Escape");
      await page.keyboard.press("Shift+Slash");
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${OUT}/sheet-${vp.width}.png` });
      await page.keyboard.press("Escape");
    } finally {
      execFileSync("node", ["tests/e2e/seedSwitcherShelved.mjs", "--restore"], { stdio: "inherit" });
    }
    expect(true).toBe(true);
  });
}
