/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { reelFit, reelPage, REEL_CARD_MIN, REEL_CARD_CAP } from "./reelFit";

describe("reelFit — the one-row fit at three widths × rail states (width IS the rail's participation)", () => {
  it("a wide track (rail unmounted, ~1150) fits 4 exact cards; the same viewport with the rail (~862) fits 3", () => {
    const wide = reelFit(1150);
    expect(wide.n).toBe(4);
    expect(wide.n * wide.cardWidth + 12 * (wide.n - 1)).toBeCloseTo(1150, 6); // exact fill, no partial card
    const withRail = reelFit(862); // 1150 − 264 − 24 — the rail's presence = a narrower track
    expect(withRail.n).toBe(3);
    expect(withRail.n * withRail.cardWidth + 12 * (withRail.n - 1)).toBeCloseTo(862, 6);
  });
  it("floors at 1 (narrow) and caps at 5 (ultrawide slivers banned)", () => {
    expect(reelFit(200).n).toBe(1);
    expect(reelFit(4000).n).toBe(REEL_CARD_CAP);
    expect(reelFit(REEL_CARD_MIN).n).toBe(1);
  });
  it("one pager click pages a full fit: n cards plus their gaps", () => {
    const fit = reelFit(1150);
    expect(reelPage(fit)).toBeCloseTo(fit.n * (fit.cardWidth + 12), 6);
  });
});
