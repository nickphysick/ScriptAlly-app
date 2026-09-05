/**
 * v56 — RETIRED: the Soonest/Newest toggle is gone (this file HUNG driving it — a suite that
 * waits on a retired control blocks everything behind it, which is its own lesson). The order
 * claims' successor is calTool63 c3: Sort changes the ORDER and returning to the default
 * restores it, by row identity — the stability half of what "leaving and coming back" proved.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("the Soonest toggle is gone from the rendered page", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => ({
    toggles: document.querySelectorAll(".tl-sortseg, .tl-soonest").length,
    sortRow: [...document.querySelectorAll<HTMLElement>(".tl-axis .tl-pr")]
      .some((x) => /sort/i.test(x.textContent ?? "")),
  }));
  expect(r.toggles, "the v56 sort toggle is back").toBe(0);
  expect(r.sortRow, "no Sort row — the successor is missing").toBe(true);
});
