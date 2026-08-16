/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ITEM 2 — the stat pair has become a trio. Which cards render three tiles, and what is the third?
 * `bandFacts` returns at most two, so a third has another source; this finds it rather than
 * assuming one.
 */
import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

test.setTimeout(300_000);

test("item 2 — every card's stat tiles", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  await liftMotionSuppression(page);

  const keys = await page.evaluate(() =>
    [...document.querySelectorAll(".tdg-row")].map((r) => (r.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 46)));

  for (let i = 0; i < keys.length; i++) {
    const row = page.locator(".tdg-row").nth(i);
    await row.click();
    await page.waitForTimeout(280);
    const tiles = await page.evaluate(() => {
      const vis = (e: Element) => e.getBoundingClientRect().height > 0;
      const cells = [...document.querySelectorAll(".tdk-tstat")].filter(vis) as HTMLElement[];
      return cells.map((c) => ({
        text: (c.textContent ?? "").replace(/\s+/g, " ").trim(),
        cls: c.className,
        w: Math.round(c.getBoundingClientRect().width),
      }));
    });
    console.log(`[${tiles.length}] ${keys[i]}  →  ${tiles.map((t) => t.text).join("  ·  ")}`);
  }
});
