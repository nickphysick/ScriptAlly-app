/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v137 §D — the pinned state's hysteresis: pin at 12px or less, unpin only above 36.
 */
import { describe, expect, it } from "vitest";
import { PIN_AT, UNPIN_ABOVE, nextPinned } from "./QcCentre";

describe("nextPinned", () => {
  it("pins at the line, and holds between the two thresholds whichever way it came", () => {
    expect(nextPinned(false, PIN_AT + 1, 2000)).toBe(false);
    expect(nextPinned(false, PIN_AT, 2000)).toBe(true);
    expect(nextPinned(true, PIN_AT + 10, 2000)).toBe(true);
    expect(nextPinned(false, PIN_AT + 10, 2000)).toBe(false);
    expect(nextPinned(true, UNPIN_ABOVE, 2000)).toBe(true);
    expect(nextPinned(true, UNPIN_ABOVE + 1, 2000)).toBe(false);
  });
  it("a sweep down and back across the line changes the state exactly twice", () => {
    let pinned = false, flips = 0;
    const step = (top: number) => { const n = nextPinned(pinned, top, 2000); if (n !== pinned) { flips++; pinned = n; } };
    for (let t = 60; t >= -30; t--) step(t);
    for (let t = -30; t <= 60; t++) step(t);
    expect(flips).toBe(2);
    expect(pinned).toBe(false);
  });
  it("releases once the list has gone above the line", () => {
    expect(nextPinned(true, -5000, PIN_AT)).toBe(false);
    expect(nextPinned(true, -5000, PIN_AT + 1)).toBe(true);
  });
});
