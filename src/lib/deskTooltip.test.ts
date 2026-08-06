/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the settled desk's tooltip geometry (dashboard redesign, Phase 2).
 *
 * ⚠️ THIS IS THE ONLY PLACE PLACEMENT CAN BE PROVEN. `vitest.config.ts` is `environment: 'node'` —
 * no jsdom, no layout engine — so a rendered tooltip reports a zero rect and asserting its position
 * would test nothing. The maths lives in a pure function for exactly this reason; the browser check
 * that remains is "does it look right", which is Nick's.
 */
import { describe, it, expect } from "vitest";
import { placeTooltip, TIP_EDGE, TIP_GAP } from "./deskTooltip";

const VIEW = { width: 1440, height: 900 };
const anchor = (over: Partial<{ left: number; top: number; width: number; height: number }> = {}) => ({
  left: 700, top: 400, width: 20, height: 16, ...over,
});
const TIP = { width: 280, height: 200 };

describe("the tooltip centres on its anchor and sits above it", () => {
  it("centres horizontally and clears the anchor by the gap", () => {
    const p = placeTooltip(anchor(), TIP, VIEW);
    expect(p.left).toBe(700 + 10 - 140);
    expect(p.top).toBe(400 - 200 - TIP_GAP);
    expect(p.flipped).toBe(false);
  });
});

describe("⚠️ viewport safety — the point of the function", () => {
  it("clamps at the left edge rather than running off screen", () => {
    const p = placeTooltip(anchor({ left: 12 }), TIP, VIEW);
    expect(p.left).toBe(TIP_EDGE);
  });

  it("clamps at the right edge too", () => {
    const p = placeTooltip(anchor({ left: 1430 }), TIP, VIEW);
    expect(p.left).toBe(VIEW.width - TIP.width - TIP_EDGE);
  });

  /* A dropdown right-aligned to an anchor near the left edge was the original failure: naive
     placement put the tooltip's first words off screen, which is worse than any overflow. */
  it("a tooltip WIDER than the viewport keeps its left edge on screen", () => {
    const narrow = { width: 300, height: 900 };
    const p = placeTooltip(anchor({ left: 150 }), TIP, narrow);
    expect(p.left).toBe(TIP_EDGE);
    expect(p.left).toBeGreaterThanOrEqual(0);
  });
});

describe("⚠️ it FLIPS below the anchor rather than sliding up over it", () => {
  it("flips when there is no room above", () => {
    const p = placeTooltip(anchor({ top: 40 }), TIP, VIEW);
    expect(p.flipped).toBe(true);
    expect(p.top).toBe(40 + 16 + TIP_GAP);
  });

  it("does not flip when it just fits", () => {
    // exactly enough room: anchor.top - height - gap === TIP_TOP_MIN
    const p = placeTooltip(anchor({ top: 200 + TIP_GAP + 8 }), TIP, VIEW);
    expect(p.flipped).toBe(false);
  });

  /* Vertically we flip and horizontally we clamp, deliberately: sliding sideways still points at
     roughly the right thing, sliding vertically would cover the anchor being described. */
  it("a flipped tooltip is never placed over its own anchor", () => {
    const a = anchor({ top: 10 });
    const p = placeTooltip(a, TIP, VIEW);
    expect(p.top).toBeGreaterThanOrEqual(a.top + a.height);
  });
});
