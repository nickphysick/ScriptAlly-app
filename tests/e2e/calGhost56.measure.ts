import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { setRangeTo, RANGE_LABELS } from "./calControls";

/**
 * ⚠️ RETIRED BY v58 — ALL FOUR CASES, AND NOT ONE OF THEM SILENTLY.
 *
 * This file guarded the GHOST RING: a dotted circle standing past the card's end, carrying a glyph
 * for the writer's next move, going solid with a badge once that move was due. v58 replaces it
 * with two objects that say the same thing in the two places it belongs — a terminal MARK on the
 * card's end edge (diamond for a date the writer owes, ring for an agency's estimate) and an
 * action CAP centred on the date itself, naming the deed.
 *
 * Every claim here is carried, in the form v58 states it, by `calCaps58.measure.ts`:
 *
 *   · "past the card's end, glyphed, 24px round"  →  the cap/mark PAIRING (exactly one each, or
 *     neither) plus the cap staying inside the lane. Clearance is no longer a measurement at all:
 *     the mark is a CHILD of the card, so it cannot come apart from it.
 *   · "due is solid with a badge, ahead is dotted"  →  the mark's SHAPE and the cap's TONE, keyed
 *     on whose date it is.
 *   · "clear of its card even when opened"  →  structural, per above; the ring needed it because
 *     it was a sibling carrying its own copy of the card's geometry.
 *   · "no ghost with no named date, none for an agency's move"  →  "a card that runs to today
 *     carries neither cap nor mark", over a proved-non-empty population of such cards.
 *
 * The file is emptied rather than deleted so this mapping survives where someone looking for the
 * ghost will actually find it. `ghostKindFor` and its glyph table went with the ring; the two moves
 * the ref draws no glyph for are no longer a gap, because a cap carries a WORD rather than a mark.
 */
test("the ghost ring is retired — v58 draws a cap and a terminal mark instead", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(900);
  let rings = 0, caps = 0, marks = 0;
  for (let i = 0; i < RANGE_LABELS.length; i++) {
    await setRangeTo(page, i);
    await page.waitForTimeout(400);
    const c = await page.evaluate(`(() => {
      const vis = (e) => e.getBoundingClientRect().width > 0;
      return {
        rings: [...document.querySelectorAll(".tl-ghost")].filter(vis).length,
        caps: [...document.querySelectorAll(".tl-cap")].filter(vis).length,
        marks: [...document.querySelectorAll(".tl-tmark")].filter(vis).length,
      };
    })()`) as unknown as { rings: number; caps: number; marks: number };
    rings += c.rings; caps += c.caps; marks += c.marks;
  }
  console.log(`across the sweep — ghost rings ${rings} · caps ${caps} · marks ${marks}`);
  /* ⚠️ THE REPLACEMENT MUST HAVE ARRIVED, or "the ring is gone" is satisfied by a board that draws
     nothing at all — which is exactly what a botched swap looks like. */
  expect(caps, "no cap renders, so the ring was removed without its replacement").toBeGreaterThan(3);
  expect(marks, "no terminal mark renders, so the ring was removed without its replacement")
    .toBeGreaterThan(3);
  expect(rings, "a ghost ring still renders — the replacement was ADDED, not swapped in").toBe(0);
});
