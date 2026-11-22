/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sidebar: short labels, Dashboard on its own, Tasks always visible (25 Oct) — the report's screenshots: the
 * expanded sidebar at 1512 × 982 and 1280 × 720, and collapsed at 1512. Not a lock: it asserts nothing.
 * `SB_SHOTS=before|after` names the folder (run "before" against the deployed build, "after" against this branch).
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const WHICH = process.env.SB_SHOTS ?? "";
const OUT = `reports/sidebar-short-labels/shots/${WHICH}`; // "card-fits" = the 25 Oct follow-up (full card at 1512×982)

const clipOf = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const s = document.getElementById("ws-sidebar") ?? document.querySelector(".ws-panel");
  const b = s!.getBoundingClientRect();
  return { x: Math.max(0, b.left), y: 0, width: Math.ceil(b.width), height: Math.floor(window.innerHeight) };
});

for (const size of [{ width: 1512, height: 982 }, { width: 1280, height: 720 }]) {
  test(`sidebar expanded ${size.width}x${size.height}`, async ({ page }) => {
    test.skip(!WHICH, "SB_SHOTS=before|after");
    test.setTimeout(180_000);
    mkdirSync(OUT, { recursive: true });
    await openRoute(page, "/queries/packages", size);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/expanded-${size.width}x${size.height}.png`, clip: await clipOf(page) });
  });
}

test("sidebar collapsed 1512x982", async ({ page }) => {
  test.skip(!WHICH, "SB_SHOTS=before|after");
  test.setTimeout(180_000);
  mkdirSync(OUT, { recursive: true });
  await openRoute(page, "/queries/packages", { width: 1512, height: 982 });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Collapse sidebar" }).first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/collapsed-1512x982.png`, clip: await clipOf(page) });
  await page.keyboard.press("["); // the collapsed toggle shows only on hover; `[` is the shell's own key
  await page.waitForTimeout(500);
});
