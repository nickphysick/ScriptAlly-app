/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { laneFit, lanePageDistance, LANE_GAP, LANE_CARD_MIN, LANE_CARD_CAP } from "./laneFit";

describe("laneFit — exact-fit maths (N = clamp(floor((w + gap) / (min + gap)), 1, 5))", () => {
  it("constants: min 300, cap 5, gap = the lane token value 14", () => {
    expect(LANE_CARD_MIN).toBe(300);
    expect(LANE_CARD_CAP).toBe(5);
    expect(LANE_GAP).toBe(14);
  });

  it("cards always fill the track exactly: N×width + (N−1)×gap = trackWidth", () => {
    for (const w of [240, 640, 927, 928, 1256, 1496, 2400]) {
      const f = laneFit(w);
      expect(f.n * f.cardWidth + (f.n - 1) * LANE_GAP).toBeCloseTo(w, 6);
    }
  });

  it("N steps at the exact boundaries (3 cards need 928 = 3×300 + 2×14)", () => {
    expect(laneFit(927).n).toBe(2);
    expect(laneFit(928).n).toBe(3);
    expect(laneFit(928).cardWidth).toBeCloseTo(300, 6);
    expect(laneFit(1241).n).toBe(3);
    expect(laneFit(1242).n).toBe(4); // 4×300 + 3×14 = 1242
  });

  it("the floor of 1 keeps narrow (mobile) tracks safe — one full-width card", () => {
    expect(laneFit(200)).toEqual({ n: 1, cardWidth: 200 });
    expect(laneFit(0).n).toBe(1);
  });

  it("the cap of 5 stops ultrawide shredding; width grows instead", () => {
    const f = laneFit(3000);
    expect(f.n).toBe(5);
    expect(f.cardWidth).toBeCloseTo((3000 - 4 * LANE_GAP) / 5, 6);
  });

  it("one page = N cards + their gaps", () => {
    const f = laneFit(928); // n 3, cardWidth 300
    expect(lanePageDistance(f)).toBeCloseTo(3 * 314, 6);
  });
});
