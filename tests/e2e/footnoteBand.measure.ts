/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE EXPLAINER TRIO BELONGS WHERE THE FIGURES IT EXPLAINS LIVE.
 *
 * ⚠️ IT WAS RENDERED OUTSIDE ALL THREE PANELS, so it appeared on every tab — the same three cards
 * on Packages and on Builder, explaining how Replies and Requests are counted beside a ledger and a
 * card library that state neither as a concept. Nothing errored and nothing looked broken; it just
 * said the same thing three times.
 *
 * ⚠️ AND IT ASSERTS THE MOUNT COUNT SEPARATELY FROM THE VISIBLE COUNT. Every workspace page stays
 * mounted and panels hide with `hidden`, so "three cells are showing" and "three cells exist in the
 * document" are different claims — a second mount would satisfy the first while doubling the second.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("the explainer trio is on Tracking only", async ({ page }) => {
  await openRoute(page, "/manuscripts/packages?tab=packages", { width: 1920, height: 1200 });
  await page.locator(".pkgt-tab").first().waitFor({ state: "visible", timeout: 25000 });
  const base = page.url().split("?")[0];
  const seen: Record<string, unknown>[] = [];
  for (const tab of ["packages", "builder", "tracking"]) {
    await page.goto(`${base}?tab=${tab}`);
    await page.waitForTimeout(700);
    seen.push(await page.evaluate((t) => {
      const cells = [...document.querySelectorAll(".pkgb-hncell")];
      const showing = cells.filter((c) => (c as HTMLElement).getBoundingClientRect().height > 0);
      return { tab: t, mounted: cells.length, showing: showing.length,
               panel: showing[0]?.closest("[role=tabpanel]")?.id ?? null };
    }, tab));
  }
  console.log("FOOT " + JSON.stringify(seen));
  for (const s of seen) expect(s.mounted, `${s.tab}: the trio is mounted more than once`).toBe(3);
  expect(seen.map((s) => [s.tab, s.showing])).toEqual([["packages", 0], ["builder", 0], ["tracking", 3]]);
  expect(seen[2].panel).toBe("pkgt-panel-tracking");
});
