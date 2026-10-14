/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { RING_C, dismissedAtGaps, gapLine, healthLabel, listHealth, nextDismissed, ringArc, tabShown } from "./contactHealth";

const items = (n: number) => Array.from({ length: n }, () => ({})) as never[];

describe("List health", () => {
  it("reads Housekeeping's share and gap count, rounded", () => {
    expect(listHealth({ share: 31 / 41, items: items(14) })).toEqual({ pct: 76, gaps: 14 });
    expect(listHealth({ share: 1, items: items(0) })).toEqual({ pct: 100, gaps: 0 });
  });
  it("words", () => {
    expect(gapLine(14)).toBe("14 gaps to fill");
    expect(gapLine(1)).toBe("1 gap to fill");
    expect(gapLine(0)).toBe("All filled in");
    expect(healthLabel({ pct: 76, gaps: 14 })).toBe("List health 76%. 14 gaps to fill. Open Housekeeping");
    expect(healthLabel({ pct: 100, gaps: 0 })).toBe("List health 100%. All filled in. Open Housekeeping");
  });
  it("the ink arc is pct of the circle; joins only strictly between", () => {
    expect(ringArc(76).ink).toBeCloseTo(RING_C * 0.76, 6);
    expect(ringArc(100)).toEqual({ ink: RING_C, joins: false });
    expect(ringArc(0)).toEqual({ ink: 0, joins: false });
    expect(ringArc(50).joins).toBe(true);
  });
});

describe("the tab's dismissal", () => {
  it("shows only with gaps and no standing dismissal", () => {
    expect(tabShown(0, null)).toBe(false);
    expect(tabShown(3, null)).toBe(true);
    expect(tabShown(3, 3)).toBe(false);
    expect(tabShown(2, 3)).toBe(false);
    expect(tabShown(4, 3)).toBe(true);
  });
  it("falls with the count, clears when it rises, otherwise stays", () => {
    expect(nextDismissed(2, 3)).toBe(2);
    expect(nextDismissed(0, 3)).toBe(0);
    expect(nextDismissed(4, 3)).toBe(null);
    expect(nextDismissed(3, 3)).toBe(undefined);
    expect(nextDismissed(5, null)).toBe(undefined);
  });
  it("reads only a non-negative number", () => {
    expect(dismissedAtGaps({ todoPrefs: { contacts: { tabDismissedAtGaps: 4 } } } as never)).toBe(4);
    expect(dismissedAtGaps({ todoPrefs: { contacts: { tabDismissedAtGaps: null } } } as never)).toBe(null);
    expect(dismissedAtGaps({ todoPrefs: { contacts: { tabDismissedAtGaps: "4" } } } as never)).toBe(null);
    expect(dismissedAtGaps(null)).toBe(null);
  });
});
