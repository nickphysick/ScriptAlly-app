/**
 * ⚠️ THE BRUSH'S MAPPING, AND THE GATE THE PACK STATES FOR IT.
 *
 * It was inverted on dev: the drawn handle sat at `100 - p` while the invisible range input's thumb
 * sat at `p`, so the two were at opposite ends of the track and the control moved the wrong way
 * under the cursor. The fix is not a second minus sign — it is that there is now exactly ONE
 * `1 - p` in the whole mapping, and it is the WINDOW's geometry (handle to right edge) rather than
 * a mirror applied to a value.
 */
import { describe, it, expect } from "vitest";
import { weeksFromFraction, fractionFromWeeks, BRUSH_WEEKS_MIN, BRUSH_WEEKS_MAX } from "../../lib/oneScreen";

describe("the brush maps the pointer to weeks", () => {
  /* the pack's gate, verbatim */
  it("5% / 50% / 95% of the track give 11 / 6 / 4 weeks", () => {
    expect(weeksFromFraction(0.05)).toBe(11);
    expect(weeksFromFraction(0.50)).toBe(6);
    expect(weeksFromFraction(0.95)).toBe(4);
  });

  it("dragging LEFT lengthens the range and dragging RIGHT shortens it", () => {
    const along = [0, 0.2, 0.4, 0.6, 0.8, 1].map(weeksFromFraction);
    for (let i = 1; i < along.length; i += 1) {
      expect(along[i], `week count must not rise as the pointer moves right: ${along}`)
        .toBeLessThanOrEqual(along[i - 1]);
    }
    expect(along[0]).toBeGreaterThan(along[along.length - 1]);
  });

  it("saturates at both ends rather than running off them", () => {
    expect(weeksFromFraction(-5)).toBe(BRUSH_WEEKS_MAX);
    expect(weeksFromFraction(0)).toBe(BRUSH_WEEKS_MAX);
    expect(weeksFromFraction(1)).toBe(BRUSH_WEEKS_MIN);
    expect(weeksFromFraction(9)).toBe(BRUSH_WEEKS_MIN);
  });

  /* ⚠️ THE ROUND HAPPENS BEFORE THE CLAMP, which is the ref's order and is not interchangeable.
     Clamping first would map the bottom third of the track linearly into 4 instead of saturating,
     and 95% would read 5 rather than the gate's 4. */
  it("rounds before it clamps", () => {
    expect(weeksFromFraction(0.7)).toBe(4);   // round(3.6) = 4
    expect(weeksFromFraction(0.75)).toBe(4);  // round(3.0) = 3, clamped up to 4
  });

  /* ⚠️ THE HANDLE IS DRAWN WHERE THE VALUE SAYS IT IS, so the picture and the pointer cannot
     disagree — which is exactly how the inversion survived: two expressions, never reconciled. */
  it("the inverse puts the handle back under the pointer", () => {
    for (const w of [4, 6, 8, 11, 12]) {
      expect(weeksFromFraction(fractionFromWeeks(w)), `${w} weeks must round-trip`).toBe(w);
    }
  });

  it("the handle's fraction rises as the range shortens", () => {
    expect(fractionFromWeeks(12)).toBeCloseTo(0, 5);
    expect(fractionFromWeeks(6)).toBeCloseTo(0.5, 5);
    expect(fractionFromWeeks(4)).toBeGreaterThan(fractionFromWeeks(8));
  });
});
