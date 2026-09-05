/**
 * v61 — RETIRED WHOLESALE BY v63/v64, each claim's successor named (the retire-as-inverse rule:
 * the old anatomy is asserted GONE from the rendered page, and the replacement PRESENT).
 *
 *  (a) one container            → calFid63 (1)/(2): the boardpane is the page card
 *  (c) sidebar counts sum       → calTool63 c5: the facet census sums to the board
 *  (e,f) badge discs            → calBar63 d1/d10: the band carries the 14px dot
 *  (g) the chevron tail         → calFid63 (3): the frame's INK meets the today line, square
 *  (h) the trail                → calFid63 (4): chip + trail count asserted 0
 *  (i,j,k) line-two grammar     → calBar63 d11: fact + tail, both present, neither lower-case
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("v61's anatomy is gone from the rendered board, and its successors are mounted", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    return {
      cards: g.querySelectorAll(".tl-p").length,
      badges: g.querySelectorAll(".tl-cbadge, .tl-badge").length,
      tails: g.querySelectorAll(".tl-tailsvg").length,
      trails: g.querySelectorAll(".tl-ctrail, .tl-trail").length,
      pills: g.querySelectorAll(".tl-cpill").length,
      gpills: g.querySelectorAll(".gpill").length,
      /* the successors */
      bands: g.querySelectorAll(".tl-sband").length,
      panel: !!g.querySelector(".tl-np"),
      pane: !!g.querySelector(".tl-boardpane"),
    };
  });
  expect(r.cards, "no cards — nothing was checked").toBeGreaterThan(5);
  expect(r.badges, "the v61 badge disc is back").toBe(0);
  expect(r.tails, "the chevron tail is back").toBe(0);
  expect(r.trails, "the trail is back").toBe(0);
  expect(r.pills, "the v61 pill is back").toBe(0);
  expect(r.gpills, "the group list is back").toBe(0);
  expect(r.bands, "no bands — the successor is missing").toBeGreaterThan(5);
  expect(r.panel, "no Notion panel — the successor is missing").toBe(true);
  expect(r.pane, "no board pane — the successor is missing").toBe(true);
});
