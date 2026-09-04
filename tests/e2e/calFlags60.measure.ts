/**
 * v60b Phase 2 — the flags. ⚠️ RETIRED BY v63 §E, AND THE CLAIM SURVIVES AS ITS INVERSE.
 *
 * It asserted the side-strip flag's two treatments — a dotted outline for a future state, a raised
 * card with a pink strip and a `!` for an urgent one — over five cases, and it was right about the
 * surface it was written for. §E DELETED that surface: the flag was a tile as wide as a card
 * standing in the lane beside every live row, so a busy board carried a dozen paragraphs down its
 * right-hand side, each clamped inward when it neared the edge.
 *
 * ⚠️ A LOCK WHOSE SUBJECT HAS BEEN DELETED IS NOT "PASSING" AND IS NOT "OBSOLETE" — IT IS UNPROVED.
 * Deleting the file would leave nothing to notice the flag coming back; keeping the five cases would
 * leave five probes that find no element and report no offence, which is this repo's most-recorded
 * vacuous green. The honest form is one case asserting the RETIREMENT, on the rendered page.
 *
 * What replaced it is measured in `calAct63.measure.ts`: one action mark at two volumes, standing
 * on its own date.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("⚠️ the side-strip flag stays retired (v60b → v63 §E)", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0);
    return {
      board: !!g,
      rows: g ? g.querySelectorAll(".tl-rrow").length : 0,
      caps: document.querySelectorAll(".tl-cap").length,
      nlab: document.querySelectorAll(".tl-nlab").length,
      acts: g ? g.querySelectorAll(".tl-act").length : 0,
    };
  });
  /* ⚠️ THE POPULATION FIRST. "No flags" is trivially true of a page that drew nothing, which is
     exactly how a retirement lock goes vacuously green. */
  expect(r.board, "the calendar did not render").toBe(true);
  expect(r.rows, "no rows — the absence below would prove nothing").toBeGreaterThan(4);
  expect(r.caps, "the side-strip flag came back").toBe(0);
  expect(r.nlab, "a `tl-nlab` flag is in the DOM").toBe(0);
  /* and the thing that replaced it is there, so this is a swap rather than a deletion */
  expect(r.acts, "no action marks — the flag went and nothing took its place").toBeGreaterThan(3);
});
