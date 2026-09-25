/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v11 — locks for the pure derivations (phase 1: the rail's height law).
 */
import { describe, expect, it } from "vitest";
import { RAIL_MAX, RAIL_MIN, RAIL_TOP_GAP, railHeight } from "./contactList";

describe("railHeight — the rail derives its height from its own measured top", () => {
  it("at rest the rail runs from its top to 16px above the fold", () => {
    /* the mock at 1440×900, unscrolled: top 92 → 900 − 92 − 16 = 792 */
    expect(railHeight(92, 900)).toBe(792);
  });

  it("pinned, the cap binds — the mock's own render, not the brief's bracket", () => {
    /* scrolled: sticky pins at 16 → 900 − 16 − 16 = 868, capped at 860 (measured on the mock;
       the brief's "16 → 884" disagrees with its own clamp and the render wins) */
    expect(railHeight(16, 900)).toBe(RAIL_MAX);
  });

  it("a short window floors at 360 rather than collapsing", () => {
    expect(railHeight(92, 300)).toBe(RAIL_MIN);
  });

  it("a top above the gap is clamped to the gap before the subtraction", () => {
    /* top 4 reads as the pinned 16 — the rail can never claim room above its own gap */
    expect(railHeight(4, 900)).toBe(railHeight(RAIL_TOP_GAP, 900));
  });

  it("a reading that cannot be a layout is refused, never written", () => {
    /* the page before layout, or a container under a loading cover — the dashboard's −115
       clamp is the standing precedent for why a sentinel must not become a height */
    expect(railHeight(NaN, 900)).toBeNull();
    expect(railHeight(92, 0)).toBeNull();
    expect(railHeight(92, -1)).toBeNull();
  });
});
