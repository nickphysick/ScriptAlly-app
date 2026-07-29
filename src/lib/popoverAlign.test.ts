/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the popover flip rule. jsdom cannot measure a rect, so the geometry is passed in and
 * the DECISION is what's tested — the measurement itself is on the browser-check list.
 */
import { describe, it, expect } from "vitest";
import { popoverAlign, PopoverGeometry } from "./popoverAlign";

/** A container 1000 wide, a 60-wide button, a 212-wide popover — the Sort control's real shape. */
const at = (anchorLeft: number, over: Partial<PopoverGeometry> = {}): PopoverGeometry => ({
  anchorLeft,
  anchorRight: anchorLeft + 60,
  popWidth: 212,
  containerLeft: 0,
  containerRight: 1000,
  ...over,
});

describe("popoverAlign", () => {
  it("stays LEFT while the box fits — left-anchored reads as belonging to its control", () => {
    expect(popoverAlign(at(0))).toBe("left");
    expect(popoverAlign(at(500))).toBe("left");
    // exactly flush is still a fit
    expect(popoverAlign(at(788))).toBe("left");
  });

  it("FLIPS to right-anchored the moment the left-anchored box would overflow", () => {
    expect(
      popoverAlign(at(789)),
      "the popover stopped flipping — one pixel past the container edge is still off-screen, and the rightmost control's panel spends most viewports there",
    ).toBe("right");
    // the real case: the rightmost control on a narrow container
    expect(popoverAlign(at(880, { containerRight: 940 }))).toBe("right");
  });

  it("keeps LEFT when flipping would only move the overflow to the other side", () => {
    // a popover wider than the container overflows whichever edge it hangs from; the default is
    // the better of two bad options because the left is where the row and the reader's eye are
    expect(
      popoverAlign(at(100, { containerRight: 200, containerLeft: 0, popWidth: 400 })),
      "the popover flipped into the LEFT edge — trading a right-hand overflow for a left-hand one is not a fix",
    ).toBe("left");
  });

  it("is generic — the same rule decides for a narrow popover and a wide one", () => {
    // nothing here knows which control it is; only the numbers differ
    expect(popoverAlign(at(820, { popWidth: 288 }))).toBe("right"); // Filters
    expect(popoverAlign(at(820, { popWidth: 120 }))).toBe("left"); // a hypothetical narrow one
  });

  it("respects a container that doesn't start at zero (the centred content column)", () => {
    const g = at(900, { containerLeft: 300, containerRight: 1000, anchorRight: 960 });
    expect(popoverAlign(g)).toBe("right"); // 960 − 212 = 748 ≥ 300, so it fits
    expect(popoverAlign({ ...g, containerLeft: 800 })).toBe("left"); // 748 < 800, so it doesn't
  });
});
