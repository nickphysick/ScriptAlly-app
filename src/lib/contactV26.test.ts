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

import { emptyContactFilters } from "./contactList";
import { GROUP26_OPTIONS, PICKS26, applyPick, pickOn, replyBucket, sections, sectionKind } from "./contactV26";

describe("v26 E — the quick picks, one at a time", () => {
  it("are Your move, Ready to query, Waiting to hear back, Missing details", () => {
    expect(PICKS26.map((p) => p.title)).toEqual(["Your move", "Ready to query", "Waiting to hear back", "Missing details"]);
  });
  it("a pick clears the others; a second click clears it", () => {
    let f = applyPick(emptyContactFilters(), "you");
    expect(pickOn(f)).toBe("you");
    f = applyPick(f, "missing");
    expect(pickOn(f)).toBe("missing");
    expect(f.action).toBe(false);
    expect(f.missing).toBe(true);
    f = applyPick(f, "missing");
    expect(pickOn(f)).toBe(null);
    expect(f).toEqual(emptyContactFilters());
  });
  it("the Group menu is Letter, Status, No grouping", () => {
    expect(GROUP26_OPTIONS.map((g) => g.label)).toEqual(["Letter", "Status", "No grouping"]);
  });
});

describe("v26 C/D — the sections", () => {
  const fx = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
    agent: { id, name, agency: "", ...extra }, stand: "none", status14: "none", ...extra,
  }) as never;
  it("which kind follows the grouping and the sort", () => {
    expect(sectionKind("none", "surname")).toBe("all");
    expect(sectionKind("status", "reply")).toBe("set");
    expect(sectionKind("letter", "surname")).toBe("letter");
    expect(sectionKind("letter", "reply")).toBe("reply");
    expect(sectionKind("letter", "added")).toBe("month");
    expect(sectionKind("letter", "status")).toBe("stage");
  });
  it("reply time goes week by week to 12, then 12+, then not known", () => {
    expect([1, 6, 12, 13, null].map((w) => replyBucket(w).label)).toEqual(["1 wk", "6 wks", "12 wks", "12+ wks", "? not known"]);
  });
  it("Letter by Surname holds all 26 letters, the empty ones marked, in the sort's direction", () => {
    const s = sections([fx("a", "Ann Abara"), fx("b", "Bo Blake"), fx("c", "Cy Blaine")], "letter", "surname");
    expect(s.map((x) => x.label).join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    expect(s.filter((x) => !x.empty).map((x) => [x.label, x.ids.length])).toEqual([["A", 1], ["B", 2]]);
    expect(sections([fx("a", "Ann Abara")], "letter", "surname", true)[0].label).toBe("Z");
  });
});
