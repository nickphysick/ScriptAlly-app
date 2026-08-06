/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the active-queries trend's pure geometry (dashboard redesign, Phase 4).
 *
 * ⚠️ THE SNAP AND THE CLAMP ARE THE POINT. A crosshair floating between two weeks points at a
 * number that does not exist; one that runs off the end reads a bin that is not there. Both are
 * maths, so both are tested here rather than eyeballed — there is no jsdom to render into.
 */
import { describe, it, expect } from "vitest";
import { nearestBin, trendX, trendY, weekDelta } from "./DeskStats";

describe("the trend's x scale", () => {
  it("puts the first and last bins inside the padding, never on the edge", () => {
    expect(trendX(0, 8)).toBe(6);
    expect(trendX(7, 8)).toBe(254);
  });

  it("survives a single-bin series without dividing by zero", () => {
    expect(Number.isFinite(trendX(0, 1))).toBe(true);
  });
});

describe("the trend's y scale", () => {
  it("maps the range top to bottom", () => {
    expect(trendY(10, 0, 10)).toBeLessThan(trendY(0, 0, 10));
  });

  /* A flat line has min === max; without the guard this divides by zero and the path is NaN,
     which renders as nothing at all — a chart that silently disappears on a quiet fortnight. */
  it("a FLAT series does not produce NaN", () => {
    expect(Number.isFinite(trendY(5, 5, 5))).toBe(true);
  });
});

describe("⚠️ nearestBin snaps and clamps", () => {
  it("snaps to the closest bin", () => {
    expect(nearestBin(6, 8)).toBe(0);
    expect(nearestBin(254, 8)).toBe(7);
    expect(nearestBin(130, 8)).toBe(4); // mid-chart lands on a real week
  });

  it("clamps rather than reading a bin that is not there", () => {
    expect(nearestBin(-500, 8)).toBe(0);
    expect(nearestBin(9999, 8)).toBe(7);
  });
});

describe("the week-on-week delta", () => {
  it("names the direction, and says 'steady' rather than '+0'", () => {
    expect(weekDelta([10, 12], 1)).toBe("+2 on the week before");
    expect(weekDelta([12, 10], 1)).toBe("-2 on the week before");
    expect(weekDelta([10, 10], 1)).toBe("Steady on the week before");
  });

  /* The oldest bin has no prior week — stating one would be inventing it. */
  it("is absent on the oldest bin", () => {
    expect(weekDelta([10, 12], 0)).toBeNull();
  });
});
