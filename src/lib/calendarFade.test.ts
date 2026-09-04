/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { fadesFor } from "./calendarFade";

/**
 * ⚠️ THE HELPER PASSES A NAMED END NOW, AND `live` IS NO LONGER THE QUESTION (v55).
 *
 * The right-hand fade asked `live` — "does this piece reach today" — which is true of every
 * non-terminal relationship whatever date it is running to. Measured on the board: 22 of 22 cards
 * faded at their right edge, five with named ends 1.5 to 13.5 days INSIDE the window. The ref's own
 * predicate is `(to === null) || (to > hi)`: no date to stop at, or a date beyond the window.
 *
 * `live` survives on the type because the segment still publishes it and other readers use it; it
 * is simply not what a fade is about.
 */
/* by default the piece IS the whole stretch, clipped to the window — the common case. `namedEnd`
   defaults to the stretch's own end, which is the ordinary case of a wait running to a date. */
const F = (trueFrom: number, trueTo: number, noEnd = false) =>
  fadesFor({ trueFrom, trueTo, days: 90, live: noEnd,
             namedEnd: noEnd ? null : trueTo,
             from: Math.max(0, trueFrom), to: Math.min(90, trueTo) });

describe("a card fades only where it is cut", () => {
  it("the five shapes", () => {
    /* starts before */            expect(F(-12, 40)).toEqual({ left: true, right: false, clipped: false });
    /* ends after */               expect(F(10, 120)).toEqual({ left: false, right: true, clipped: true });
    /* both */                     expect(F(-12, 120)).toEqual({ left: true, right: true, clipped: true });
    /* neither */                  expect(F(10, 40)).toEqual({ left: false, right: false, clipped: false });
    /* no date to stop at */       /* ⚠️ ONGOING, NOT CLIPPED — the distinction §D introduced. No date to stop at means nothing
       to continue TO, so the card ends open and does not dissolve. */
    expect(F(10, 40, true)).toEqual({ left: false, right: true, clipped: false });
  });

  it("⚠️ ongoing and window-clipped are DIFFERENT, and `clipped` implies `right`", () => {
    /* ⚠️ THE LAW THE THIRD MEMBER EXISTS FOR (v63, §D). `right` was one boolean folding together
       "nobody named an end" and "the end is named and lies past the window" — so the board drew a
       partial due on 3 November exactly as it drew a wait with no end at all. */
    const clipped = F(10, 120);            // a named end, past the window
    const ongoing = F(10, 40, true);       // no named end at all
    expect(clipped.right && clipped.clipped, "a clipped card is not marked clipped").toBe(true);
    expect(ongoing.right, "an ongoing card does not run past the window").toBe(true);
    expect(ongoing.clipped, "an ongoing card is marked clipped — it has no end to be clipped").toBe(false);
    /* the implication holds for every shape, which is what stops the two drifting apart again */
    for (const f of [F(-12, 40), F(10, 120), F(-12, 120), F(10, 40), F(10, 40, true), F(0, 90)]) {
      if (f.clipped) expect(f.right, "clipped without right — the two came apart").toBe(true);
    }
  });

  it("a card wholly inside the window keeps both edges, whatever its dates", () => {
    for (const [a, b] of [[0, 90], [1, 89], [45, 46], [0.05, 89.95]]) {
      expect(F(a, b), `${a}..${b} faded`).toEqual({ left: false, right: false, clipped: false });
    }
  });

  it("the edges themselves do not count as cuts", () => {
    /* ⚠️ A STRETCH OPENING EXACTLY AT THE WINDOW'S EDGE HAS NOT BEGUN BEFORE IT, and a date
       subtraction in fractional days makes -0.0000001 a real value rather than a hypothetical. */
    expect(F(0, 90)).toEqual({ left: false, right: false, clipped: false });
    expect(F(-0.05, 90.05)).toEqual({ left: false, right: false, clipped: false });
    expect(F(-0.2, 90.2)).toEqual({ left: true, right: true, clipped: true });
  });

  it("a piece that starts at a break does not fade, however early its RUN began", () => {
    /* ⚠️ THE FAULT THE LEFT-HAND PREDICATE SHIPPED WITH. Every piece of a run carries the run's
       true bounds, so an interior piece inherited a left fade from a stretch that opened 47 days
       before the board. That half is unchanged and still asserted. */
    expect(fadesFor({ trueFrom: -47.5, trueTo: 22.5, days: 90, from: 12.84, to: 22.5, namedEnd: 22.5 }))
      .toEqual({ left: false, right: false, clipped: false });
    /* while the piece that IS on the edge still fades */
    expect(fadesFor({ trueFrom: -47.5, trueTo: 22.5, days: 90, from: 0, to: 12.16, namedEnd: 22.5 }))
      .toEqual({ left: true, right: false, clipped: false });
  });

  it("⚠️ A WAIT WITH NO DATE TO STOP AT FADES; ONE WITH A DATE INSIDE THE WINDOW DOES NOT", () => {
    /* the reversal, stated as the pair. Both reach today; only one has somewhere to stop. */
    expect(fadesFor({ trueFrom: 10, trueTo: 40, days: 90, from: 10, to: 40, live: true, namedEnd: null }).right).toBe(true);
    expect(fadesFor({ trueFrom: 10, trueTo: 40, days: 90, from: 10, to: 40, live: true, namedEnd: 40 }).right).toBe(false);
  });

  it("⚠️ AND IT COMPARES THE UNCLIPPED DATE, not the card's drawn end", () => {
    /* `to` is clipped to the window, so it can never exceed `days` and a predicate reading it could
       never fire the second term. Measured: six cards with ends 1.5 to 52.5 days past the window
       carried no right fade at all — the opposite fault to the one above, and it would have
       shipped beside it. */
    expect(fadesFor({ trueFrom: 10, trueTo: 90, days: 90, from: 10, to: 90, namedEnd: 120 }).right).toBe(true);
    expect(fadesFor({ trueFrom: 10, trueTo: 90, days: 90, from: 10, to: 90, namedEnd: 89 }).right).toBe(false);
  });
});
