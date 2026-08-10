/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE GOAL CARD AT AND PAST ITS TARGET (polish P7). It read "2/1" — a fraction whose numerator
 * has passed its denominator, which looks like a bug even when the maths is right and turns
 * beating your own target into an apparent miscount.
 */
import { describe, it, expect } from "vitest";
import { goalFigure, goalMeter } from "./oneScreen";

describe("goalFigure", () => {
  it("counts up to the target as a fraction", () => {
    expect(goalFigure(0, 25)).toBe("0/25");
    expect(goalFigure(21, 25)).toBe("21/25");
  });

  it("⚠️ states completion AT the target, not one past it", () => {
    expect(goalFigure(25, 25)).toBe("25 — done");
  });

  it("⚠️ never renders an over-achievement as a fraction — the reported 2/1 case", () => {
    expect(goalFigure(2, 1)).toBe("2 — done");
    expect(goalFigure(40, 25)).toBe("40 — done");
    // the real number survives — completion is stated, never rounded away
    expect(goalFigure(40, 25)).toContain("40");
  });
});

describe("the meter agrees with the figure", () => {
  it("⚠️ the meter was ALREADY correct — it caps, and only the display lagged", () => {
    const m = goalMeter(2, 1);
    expect(m.filled).toBeLessThanOrEqual(m.blocks); // never overflows
    expect(m.filled).toBe(m.blocks);                // and reads as full at completion
  });

  it("a proportional meter caps too, so a 40/25 does not overrun its track", () => {
    const m = goalMeter(40, 25);
    expect(m.filled).toBeLessThanOrEqual(m.blocks);
  });
});
