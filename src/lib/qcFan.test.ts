/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The fan's geometry (v21 §5) — at n = 1, 4 and 12, as the brief asks, plus the two edges it does
 * not mention and the page will meet: a hand of none, and a hand too big to draw.
 */
import { describe, it, expect } from "vitest";
import { FAN_CARD_W, FAN_MAX_GAP, FAN_MAX_HAND, FAN_MIN_STRIP, fanCentreY, fanLayout } from "./qcFan";

describe("a hand of cards", () => {
  it("one card sits alone in the centre — no spacing, no rotation, no drop", () => {
    const f = fanLayout(1, 1280, 800);
    expect(f.cards).toHaveLength(1);
    expect(f.cards[0].centre).toBe(640);
    expect(f.cards[0].left).toBe(640 - FAN_CARD_W / 2);
    expect([f.gap, f.overlapping, f.cards[0].rotate, f.cards[0].drop]).toEqual([0, false, 0, 0]);
  });

  /**
   * ⚠️ FOUR CARDS OVERLAP AT 1280 AND DO NOT AT 1920, WHICH IS THE POINT OF TESTING FOUR. The rule
   * is about the SPACING, not the count — "rotate when there are more than N cards" would be a rule
   * about the wrong variable, and this is the pair that proves it.
   */
  it("four cards: the same hand tilts at 1280 and lies flat at 1920", () => {
    const tight = fanLayout(4, 1280, 800);
    expect(tight.gap).toBeCloseTo((980 - 260) / 3, 6);
    expect(tight.overlapping, "240 apart is closer than the card is wide").toBe(true);
    expect(tight.cards.some((c) => c.rotate !== 0)).toBe(true);

    const roomy = fanLayout(4, 1920, 800);
    /* ⚠️ THE AVAILABLE WIDTH CAPS AT 1100 BEFORE THE GAP REACHES ITS OWN CAP — measured, not
       assumed: (1100 - 260) / 3 is 280, two pixels under FAN_MAX_GAP. So at four cards the deck is
       limited by the room it allows itself rather than by the spacing rule, and asserting the cap
       here would be asserting a ceiling this hand never touches. */
    expect(roomy.gap).toBeCloseTo(280, 6);
    expect(roomy.gap).toBeLessThan(FAN_MAX_GAP);
    expect(roomy.overlapping, "280 apart is wider than the card").toBe(false);
    expect(roomy.cards.every((c) => c.rotate === 0 && c.drop === 0), "a hand with room must not tilt").toBe(true);
  });

  /**
   * ⚠️ THE BRIEF'S "12 CARDS AT 1280 SPAN 80 → 1200" IS THE ROTATED EXTENT, NOT THIS ONE. Measured
   * in the mockup itself, `getBoundingClientRect` reads 80.2 → 1199.8 while the cards are LAID OUT
   * from 150 to 1130 — the 120px of difference is the swing of cards rotated about a point below
   * themselves. Asserting the brief's figure against a layout function would be asserting a
   * rotated bounding box against an unrotated placement, and it would be wrong by construction.
   */
  it("twelve cards at 1280: centres 65.45 apart, laid out 150 → 1130", () => {
    const f = fanLayout(12, 1280, 800);
    expect(f.available).toBe(980);
    expect(f.gap).toBeCloseTo(720 / 11, 6);
    expect(f.cards).toHaveLength(12);
    expect(f.span.left).toBeCloseTo(150, 6);
    expect(f.span.right).toBeCloseTo(1130, 6);
    /* the whole hand is symmetrical about the viewport's middle */
    expect(f.cards[0].centre + f.cards[11].centre).toBeCloseTo(1280, 6);
    /* it hangs rather than tilting: the middle sits highest, the ends lowest */
    const drops = f.cards.map((c) => c.drop);
    expect(Math.min(...drops)).toBeLessThan(drops[0]);
    expect(drops[0]).toBeCloseTo(drops[11], 6);
    /* and it stacks left to right, so a later card draws over its neighbour */
    expect(f.cards.map((c) => c.z)).toEqual([...f.cards.map((c) => c.z)].sort((a, b) => a - b));
  });

  it("the rotation gentles as the hand grows, so a big hand never becomes a wheel", () => {
    const step = (n: number) => {
      const f = fanLayout(n, 1280, 800);
      return Math.abs(f.cards[0].rotate) / ((n - 1) / 2);
    };
    expect(step(4)).toBeCloseTo(3, 6);          /* 28/4 = 7, capped at 3 */
    expect(step(12)).toBeCloseTo(28 / 12, 6);
    expect(step(30)).toBeCloseTo(28 / 30, 6);
    expect(step(50)).toBeCloseTo(28 / 50, 6);
    /* the outermost card's turn stays inside a quarter-turn even at fifty */
    for (const n of [12, 30, 50]) {
      expect(Math.abs(fanLayout(n, 1280, 800).cards[0].rotate), `${n} cards`).toBeLessThan(15);
    }
  });

  /**
   * ⚠️ A HAND OF NONE IS A REAL CASE — a stat card at zero still opens, and §3.1 says so in as many
   * words ("its fan is empty, so it does nothing"). It must deal nothing rather than divide by zero.
   */
  it("a hand of none deals nothing and computes no spacing", () => {
    const f = fanLayout(0, 1280, 800);
    expect(f.cards).toEqual([]);
    expect(f.gap).toBe(0);
    expect(Number.isFinite(f.span.left) && Number.isFinite(f.span.right)).toBe(true);
  });

  it("the deck hangs from 44% of the viewport", () => {
    expect(fanCentreY(800)).toBeCloseTo(352, 6);
    expect(fanCentreY(860)).toBeCloseTo(378.4, 6);
  });

  /**
   * ⚠️ THE CAP'S ARITHMETIC, WHICH IS THE WHOLE REASON FOR IT (Nick's ruling, 21 Sep). A card is
   * identifiable only while its visible strip still shows the initials disc — about 50px — and at
   * 1280 the strip is `720 / (n - 1)`. Fifteen cards give 51.4px; SIXTEEN give exactly 48; fifty
   * would give 14.7. So the hand caps at sixteen (fifteen dealt plus the stack), and the number
   * this module exports is the one the deal obeys rather than a second opinion about it.
   *
   * ⚠️ THE GEOMETRY AT THIRTY AND FIFTY WAS NEVER UNSOUND, WHICH IS WORTH KEEPING STRAIGHT — those
   * hands stayed inside the deck and kept their symmetry. What they could not do was stay READABLE.
   * The case below still computes them, so the record shows a design limit rather than a bug.
   */
  it("⚠️ the cap is a readability figure: 51.4px of strip at fifteen, 48 at sixteen, 14.7 at fifty", () => {
    const strip = (n: number) => fanLayout(n, 1280, 800).gap;
    expect(strip(15)).toBeCloseTo(720 / 14, 6);
    expect(strip(FAN_MAX_HAND)).toBeCloseTo(48, 6);
    expect(strip(50)).toBeCloseTo(720 / 49, 6);
    /* the hand the fan actually lays out never goes below the strip its own constant names */
    expect(strip(FAN_MAX_HAND)).toBeGreaterThanOrEqual(FAN_MIN_STRIP);
    expect(strip(FAN_MAX_HAND + 1), "a seventeenth card would break the strip").toBeLessThan(FAN_MIN_STRIP);
  });

  it("fifteen, sixteen and fifty: the first two are the real hands, and all three stay in the deck", () => {
    for (const n of [15, FAN_MAX_HAND, 50]) {
      const f = fanLayout(n, 1280, 800);
      expect(f.span.left, `${n}: the hand escapes to the left`).toBeGreaterThanOrEqual(150 - 0.001);
      expect(f.span.right, `${n}: the hand escapes to the right`).toBeLessThanOrEqual(1130 + 0.001);
      expect(f.cards).toHaveLength(n);
      expect(f.overlapping).toBe(true);
      expect(f.gap, `${n}: cards are stacked exactly`).toBeGreaterThan(0);
      /* symmetrical about the viewport's middle at every size */
      expect(f.cards[0].centre + f.cards[n - 1].centre, `${n}`).toBeCloseTo(1280, 6);
    }
  });
});
