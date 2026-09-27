/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query actions v1 — locks on the drawer's pure parts (brief §H 5, 6, and the undo plan behind 4).
 * Every case derives its expectation from the rule it states, never from the function under test.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../../types";
import { addDays, dayDiff, isWeekend, offWeekend, pastAnchors, reminderAnchors, rel, futureWeeks } from "./dates";
import { bookOf, bump, convert, materialsName, sampleApprox, sampleName, setUnit, type Sample } from "./sample";
import { layoutTrack, mergePoints } from "./track";
import { cardDoors, rowDoors, primaryDoor, DRAWER_LIVE } from "./entry";
import { planRestore } from "./restorePlan";

const SUN_27_SEP = new Date(2026, 8, 27);

describe("§B the weekend shift — reminders only, to the Monday", () => {
  it("Saturday → Monday, Sunday → Monday, a weekday stays", () => {
    const sat = new Date(2026, 8, 26), sun = new Date(2026, 8, 27), wed = new Date(2026, 8, 30);
    expect(offWeekend(sat).getDay()).toBe(1);
    expect(dayDiff(offWeekend(sat), sat)).toBe(2);
    expect(offWeekend(sun).getDay()).toBe(1);
    expect(dayDiff(offWeekend(sun), sun)).toBe(1);
    expect(dayDiff(offWeekend(wed), wed)).toBe(0);
  });
  it("reminder anchors never land on a weekend, and keep the unshifted day to say they moved", () => {
    for (let base = 0; base < 14; base++) {
      const b = addDays(SUN_27_SEP, base);
      for (const a of reminderAnchors(b, [["a", "A", 0], ["b", "B", 7], ["c", "C", 14]])) {
        expect(isWeekend(a.d!), `${a.d} from ${b}`).toBe(false);
        expect(dayDiff(a.d!, a.raw!)).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("a stated deadline is never shifted — futureWeeks can land on a Sunday", () => {
    const [x] = futureWeeks(SUN_27_SEP, [["w", "In a week", 7]]);
    expect(isWeekend(x.d!)).toBe(true);
  });
  it("past chips are Today and Yesterday, and never 'Last Friday'", () => {
    expect(pastAnchors(SUN_27_SEP).map((a) => a.label)).toEqual(["Today", "Yesterday"]);
  });
  it("relative labels", () => {
    expect(rel(SUN_27_SEP, SUN_27_SEP)).toBe("today");
    expect(rel(addDays(SUN_27_SEP, 14), SUN_27_SEP)).toBe("in 2 weeks");
    expect(rel(addDays(SUN_27_SEP, -1), SUN_27_SEP)).toBe("yesterday");
  });
});

describe("§B the sample control — conversions and summaries (brief §H 6)", () => {
  /* the mock's book: 50,000 words, 24 chapters, 250 words a page */
  const b = bookOf(50000, 24);
  it("10 pages → 1 chapter", () => expect(convert("pages", 10, "chapters", b)).toBe(1));
  it("3 chapters → 6,000 words", () => expect(convert("chapters", 3, "words", b)).toBe(6000));
  it("switching unit converts rather than resetting", () => {
    const s: Sample = { unit: "chapters", amt: 3, from: 1, sect: false, fu: null };
    expect(setUnit(s, "words", b).amt).toBe(convert("chapters", 3, "words", b));
  });
  it("the stepper: pages by one below five, fives above; words by 500", () => {
    const p = (amt: number): Sample => ({ unit: "pages", amt, from: 1, sect: false, fu: null });
    expect(bump(p(3), 1, b).amt).toBe(4);
    expect(bump(p(5), 1, b).amt).toBe(10);
    expect(bump(p(12), -1, b).amt).toBe(10);
    expect(bump({ unit: "words", amt: 5000, from: 1, sect: false, fu: null }, 1, b).amt).toBe(5500);
  });
  it("names a sample the way the mock does", () => {
    expect(sampleName({ unit: "chapters", amt: 3, from: 1, sect: false, fu: null })).toBe("first 3 chapters");
    expect(sampleName({ unit: "chapters", amt: 3, from: 4, sect: true, fu: "chapter" })).toBe("chapters 4–6");
    expect(sampleName({ unit: "pages", amt: 10, from: 40, sect: true, fu: "page" })).toBe("pages 40–49");
    expect(sampleName({ unit: "words", amt: 5000, from: 40, sect: true, fu: "page" })).toBe("5,000 words from page 40");
    expect(sampleName({ unit: "chapters", amt: 1, from: 1, sect: false, fu: null })).toBe("first 1 chapter");
  });
  it("the approximation line", () => {
    expect(sampleApprox({ unit: "pages", amt: 10, from: 1, sect: false, fu: null }, b)).toBe("≈ 2,500 WORDS · 5% OF THE BOOK");
  });
  it("the materials sentence", () => {
    expect(materialsName({ ql: true, syn: true, s: { unit: "chapters", amt: 3, from: 1, sect: false, fu: null } })).toBe("Query letter, synopsis and first 3 chapters");
    expect(materialsName({ ql: true, syn: false, s: { unit: "none", amt: 0, from: 1, sect: false, fu: null } })).toBe("Query letter");
    expect(materialsName({ ql: false, syn: false, s: { unit: "none", amt: 0, from: 1, sect: false, fu: null } })).toBe("nothing selected");
  });
});

describe("§B the timeline — merges within two days, three label rows", () => {
  it("points within two days merge, the later label lower-cased", () => {
    const m = mergePoints([{ l: "Window closed", d: SUN_27_SEP, c: "done" }, { l: "Nudged", d: addDays(SUN_27_SEP, 2), c: "nudge" }]);
    expect(m).toHaveLength(1);
    expect(m[0].l).toBe("Window closed · nudged");
    expect(m[0].c).toBe("nudge");
  });
  it("points three days apart do not merge", () => {
    expect(mergePoints([{ l: "A", d: SUN_27_SEP }, { l: "B", d: addDays(SUN_27_SEP, 3) }])).toHaveLength(2);
  });
  it("today's marker only between the ends", () => {
    const L = layoutTrack([{ l: "Sent", d: addDays(SUN_27_SEP, -30) }, { l: "Due", d: addDays(SUN_27_SEP, 30) }], SUN_27_SEP, 400);
    expect(L.today).toBeCloseTo(50, 0);
    const M = layoutTrack([{ l: "Sent", d: addDays(SUN_27_SEP, 1) }, { l: "Due", d: addDays(SUN_27_SEP, 30) }], SUN_27_SEP, 400);
    expect(M.today).toBeNull();
  });
});

describe("§F the doors — one table for the card and the row", () => {
  it("the card footer by status is the mock's table", () => {
    expect(cardDoors(QueryStatus.NO_RESPONSE).map((d) => d.label)).toEqual(["Record a late reply"]);
    expect(cardDoors(QueryStatus.OFFER).map((d) => d.label)).toEqual(["Offer: next steps"]);
    expect(cardDoors(QueryStatus.PARTIAL_REQUESTED).map((d) => d.label)).toEqual(["I've sent it", "Record a response", "Close"]);
    expect(cardDoors(QueryStatus.QUERIED).map((d) => d.label)).toEqual(["Record a response", "Nudge", "Close query"]);
    expect(cardDoors(QueryStatus.SIGNED)).toEqual([]);
  });
  it("the row actions by status", () => {
    expect(rowDoors(QueryStatus.FULL_REQUESTED).map((d) => d.label)).toEqual(["✓ SENT IT"]);
    expect(rowDoors(QueryStatus.REJECTED).map((d) => d.label)).toEqual(["LATE REPLY"]);
    expect(rowDoors(QueryStatus.QUERIED).map((d) => d.label)).toEqual(["✓ RESPONSE", "NUDGE"]);
  });
  it("a door opens the drawer only when its journey is live", () => {
    for (const s of Object.values(QueryStatus)) {
      const d = primaryDoor(s);
      if (d) expect(DRAWER_LIVE[d.mode]).toBe(true);
    }
  });
});

describe("the undo plan — delete what the save created, write back what it changed, nothing else", () => {
  it("a created document is removed; a changed one written back whole; an untouched one left alone", () => {
    const before = new Map<string, Record<string, unknown>>([
      ["users/u/queries/q1", { status: "Queried", nudgeDate: "2026-10-01" }],
      ["users/u/queries/q1/activity/a1", { type: "Queried" }],
    ]);
    const now = new Map<string, Record<string, unknown>>([
      ["users/u/queries/q1", { status: "Partial Requested" }],
      ["users/u/queries/q1/activity/a1", { type: "Queried" }],
      ["users/u/queries/q1/activity/a2", { type: "Partial Requested" }],
      ["users/u/activities/a2", { queryId: "q1" }],
    ]);
    const p = planRestore(before, now);
    expect(p.remove.sort()).toEqual(["users/u/activities/a2", "users/u/queries/q1/activity/a2"]);
    expect(p.write).toEqual([{ path: "users/u/queries/q1", data: { status: "Queried", nudgeDate: "2026-10-01" } }]);
  });
  it("a deleted document (a late reply's replaced ending) comes back", () => {
    const before = new Map([["users/u/queries/q1/activity/c", { type: "No Response" }]]);
    const p = planRestore(before, new Map());
    expect(p.write.map((w) => w.path)).toEqual(["users/u/queries/q1/activity/c"]);
    expect(p.remove).toEqual([]);
  });
  it("key order never makes two equal documents differ — no spurious writes", () => {
    const p = planRestore(new Map([["x", { a: 1, b: { c: 2, d: 3 } }]]), new Map([["x", { b: { d: 3, c: 2 }, a: 1 }]]));
    expect(p.write).toEqual([]);
  });
});
