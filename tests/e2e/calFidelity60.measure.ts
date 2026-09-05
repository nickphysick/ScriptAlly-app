/**
 * v60b fidelity — RETIRED WHOLESALE, successors named:
 *  · the numbers column          → deleted by v64 §A (no gutter); calFid63 (3)'s seam holds the
 *                                  rail lane and every row lane to ONE box instead
 *  · the badge and its ring      → calBar63 d1/d10 (the band's 14px dot, wholly inside the card)
 *  · Urgent rows state a move    → calBar63 d3 (band words are Query Centre's own, per status)
 *  · the today line's extent     → v64 §C: the line lives in the ROWS ONLY (calendarTokens lock
 *                                  pins the dashed ink rule; calGround54 measures front-of-cards)
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("v60's chrome is gone, and the line lives in the rows alone", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const line = g.querySelector<HTMLElement>(".tl-todayline");
    const rows = g.querySelector<HTMLElement>(".tl-rows")!.getBoundingClientRect();
    const rail = g.querySelector<HTMLElement>(".tl-rail")?.getBoundingClientRect();
    return {
      nums: g.querySelectorAll(".tl-num, .tl-gut").length,
      badges: g.querySelectorAll(".tl-cbadge, .tl-badge").length,
      line: line ? line.getBoundingClientRect() : null,
      rowsTop: rows.top, railBottom: rail?.bottom ?? null,
    };
  });
  expect(r.nums, "the numbers gutter is back").toBe(0);
  expect(r.badges, "the badge is back").toBe(0);
  expect(r.line, "no today line").not.toBeNull();
  /* v64 §C: the line begins in the rows — never up through the rail */
  expect(r.line!.top, `the line starts at ${r.line!.top} against the rows' ${r.rowsTop}`)
    .toBeGreaterThanOrEqual(r.rowsTop - 1);
});
