/**
 * v60 Phase 3 — the trail. ⚠️ RETIRED BY v63 §D, AND THE CLAIM SURVIVES AS ITS INVERSE.
 *
 * It asserted the elapsed-time gauge along a card's foot — its fill clamped to the track, its track
 * stopping short of the card's end — and it was right about the surface it was written for. The
 * selected design is `data-trail="off"`: the ref states `.ctrack, .ctrail { display: none }`, so
 * the gauge is a REJECTED alternative rather than a suppressed feature. The card's own LENGTH
 * already says how long the wait has run, and the band above it now says whose move it is; the
 * trail was stating the same thing a third way.
 *
 * ⚠️ RETIRED AS ITS INVERSE RATHER THAN DELETED, because a probe that finds no element reports no
 * offence — and the arithmetic went with the render, so there is nothing left to resurrect by
 * accident except the class names.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("⚠️ the trail stays retired (v60 → v63 §D)", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0);
    return {
      board: !!g,
      cards: g ? g.querySelectorAll(".tl-p").length : 0,
      track: document.querySelectorAll(".tl-ctrack").length,
      trail: document.querySelectorAll(".tl-ctrail").length,
    };
  });
  expect(r.board, "the calendar did not render").toBe(true);
  expect(r.cards, "no cards — the absence below would prove nothing").toBeGreaterThan(4);
  expect(r.track, "the trail's track came back").toBe(0);
  expect(r.trail, "the trail's fill came back").toBe(0);
});
