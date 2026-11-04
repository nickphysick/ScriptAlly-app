import { describe, expect, it } from "vitest";
import { headerFigures, ringArc, RING26_C, ring26Colours, RING26_TRACK } from "./contactV26";
import { healthTone, RING_TONES } from "./contactV256";

describe("v26 A — the header's figures", () => {
  it("counts every agent, the queried and the waiting-on-you", () => {
    const f = headerFigures([{ stand: "you" }, { stand: "agent" }, { stand: "none" }, { stand: "closed" }, { stand: "you" }]);
    expect(f).toEqual({ n: 5, q: 4, y: 2 });
  });
});

describe("v26 A — the List health ring", () => {
  it("the arc is the score's share of the circle, clamped", () => {
    expect(ringArc(0)).toBe(0);
    expect(ringArc(100)).toBeCloseTo(RING26_C);
    expect(ringArc(50)).toBeCloseTo(RING26_C / 2);
    expect(ringArc(140)).toBeCloseTo(RING26_C);
  });
  it("arc colour is healthTone's on-navy colour; the track is cream at .16", () => {
    for (const pct of [93, 80, 79, 72, 60, 59, 44]) {
      expect(ring26Colours(pct).arc).toBe(RING_TONES[healthTone(pct)].navy.arc);
      expect(ring26Colours(pct).track).toBe(RING26_TRACK);
    }
    expect(ring26Colours(80).arc).toBe("#9fd0ad");
    expect(ring26Colours(79).arc).toBe("#e0a188");
    expect(ring26Colours(60).arc).toBe("#e0a188");
    expect(ring26Colours(59).arc).toBe("#f0603f");
  });
});
