/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { fadesFor } from "./calendarFade";

/* by default the piece IS the whole stretch, clipped to the window — the common case */
const F = (trueFrom: number, trueTo: number, live = false) =>
  fadesFor({ trueFrom, trueTo, days: 90, live,
             from: Math.max(0, trueFrom), to: Math.min(90, trueTo) });

describe("a card fades only where it is cut", () => {
  it("the five shapes", () => {
    /* starts before */            expect(F(-12, 40)).toEqual({ left: true, right: false });
    /* ends after */               expect(F(10, 120)).toEqual({ left: false, right: true });
    /* both */                     expect(F(-12, 120)).toEqual({ left: true, right: true });
    /* neither — the case that was wrong */
    expect(F(10, 40)).toEqual({ left: false, right: false });
    /* still running at today */   expect(F(10, 40, true)).toEqual({ left: false, right: true });
  });

  it("a card wholly inside the window keeps both edges, whatever its dates", () => {
    for (const [a, b] of [[0, 90], [1, 89], [45, 46], [0.05, 89.95]]) {
      expect(F(a, b), `${a}..${b} faded`).toEqual({ left: false, right: false });
    }
  });

  it("the edges themselves do not count as cuts", () => {
    /* ⚠️ A STRETCH OPENING EXACTLY AT THE WINDOW'S EDGE HAS NOT BEGUN BEFORE IT, and a date
       subtraction in fractional days makes -0.0000001 a real value rather than a hypothetical. */
    expect(F(0, 90)).toEqual({ left: false, right: false });
    expect(F(-0.05, 90.05)).toEqual({ left: false, right: false });
    expect(F(-0.2, 90.2)).toEqual({ left: true, right: true });
  });

  it("a piece that starts at a break does not fade, however early its RUN began", () => {
    /* ⚠️ THE FAULT THIS PREDICATE SHIPPED WITH. Every piece of a run carries the run's true bounds,
       so an interior piece — one starting at a nudge three weeks inside the window — inherited a
       left fade from a stretch that opened 47 days before the board. Measured on the real board. */
    expect(fadesFor({ trueFrom: -47.5, trueTo: 22.5, days: 90, from: 12.84, to: 22.5 }))
      .toEqual({ left: false, right: false });
    /* while the piece that IS on the edge still fades */
    expect(fadesFor({ trueFrom: -47.5, trueTo: 22.5, days: 90, from: 0, to: 12.16 }))
      .toEqual({ left: true, right: false });
  });

  it("a live piece fades right wherever today falls, because today is where it is cut", () => {
    /* ⚠️ THE WINDOW IS ROLLING AND CARRIES PAST, so today sits INSIDE it rather than at its edge.
       Requiring a live piece to reach the right-hand edge took the fade off every running card. */
    expect(fadesFor({ trueFrom: 10, trueTo: 40, days: 90, from: 10, to: 40, live: true }).right).toBe(true);
    expect(fadesFor({ trueFrom: 10, trueTo: 40, days: 90, from: 10, to: 40, live: false }).right).toBe(false);
  });

  it("live outranks the end — a running stretch fades right wherever it nominally stops", () => {
    expect(fadesFor({ trueFrom: 10, trueTo: 11, days: 90, from: 10, to: 11, live: true }).right).toBe(true);
    expect(fadesFor({ trueFrom: 10, trueTo: 11, days: 90, from: 10, to: 11, live: false }).right).toBe(false);
  });
});
