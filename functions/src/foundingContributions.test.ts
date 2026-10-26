/**
 * DB93 B — every rule for a founding writer's contributions (foundingContributions.ts).
 */
import { describe, it, expect } from "vitest";
import {
  TIERS, computeAll, eligible, isoWeekLondon, tierState, topPct, waiting, wordCount, writerTotals, type FeedbackFacts,
} from "./foundingContributions";

const D = (iso: string) => Date.parse(iso);
const FIVE = "this note has five words";
const doc = (o: Partial<FeedbackFacts> = {}): FeedbackFacts => ({ uid: "u1", status: "read", message: FIVE, createdAt: D("2026-10-20T10:00:00Z"), ...o });

describe("the 5-word floor", () => {
  it("counts words, not symbols", () => {
    expect(wordCount("one two three four five")).toBe(5);
    expect(wordCount("  one   two — three four  ")).toBe(4);
    expect(wordCount("")).toBe(0);
    expect(wordCount(null)).toBe(0);
  });
  it("four words never count; five do", () => {
    expect(eligible(doc({ message: "only four words here" }))).toBe(false);
    expect(eligible(doc({ message: FIVE }))).toBe(true);
    expect(writerTotals([doc({ message: "too short to count" })]).contributions).toBe(0);
  });
});

describe("what makes a doc count", () => {
  it("needs a uid and one of the four statuses", () => {
    expect(eligible(doc({ uid: undefined }))).toBe(false);
    expect(eligible(doc({ status: undefined }))).toBe(false);
    expect(eligible(doc({ status: "maybe" }))).toBe(false);
    for (const s of ["read", "planned", "built", "fixed"]) expect(eligible(doc({ status: s }))).toBe(true);
  });
  it("counted:false excludes it; counted:true or absent does not", () => {
    expect(eligible(doc({ counted: false }))).toBe(false);
    expect(eligible(doc({ counted: true }))).toBe(true);
    expect(writerTotals([doc({ counted: false, status: "built" })]).contributions).toBe(0);
  });
});

describe("the weekly cap (Europe/London ISO weeks)", () => {
  it("five counting docs in one week → three", () => {
    const docs = [0, 1, 2, 3, 4].map((i) => doc({ createdAt: D(`2026-10-2${i}T09:00:00Z`) }));
    expect(writerTotals(docs).contributions).toBe(3);
  });
  it("the earliest three count, whatever order they arrive in", () => {
    const docs = [doc({ createdAt: D("2026-10-24T09:00:00Z"), status: "built" }), doc({ createdAt: D("2026-10-19T09:00:00Z") }), doc({ createdAt: D("2026-10-20T09:00:00Z") }), doc({ createdAt: D("2026-10-21T09:00:00Z") })];
    /* the built one is the fourth of its week, so its base point is capped — its +3 bonus is not */
    expect(writerTotals(docs).contributions).toBe(3 + 3);
  });
  it("two weeks hold three each", () => {
    const w1 = [19, 20, 21, 22].map((d) => doc({ createdAt: D(`2026-10-${d}T09:00:00Z`) }));
    const w2 = [26, 27].map((d) => doc({ createdAt: D(`2026-10-${d}T09:00:00Z`) }));
    expect(writerTotals([...w1, ...w2]).contributions).toBe(5);
  });
  it("the week turns at London's midnight on Sunday night, not UTC's", () => {
    /* 23:30 on Sunday 25 Oct (GMT after the clocks went back) is still week 43; 00:30 London on Monday is week 44 */
    expect(isoWeekLondon(D("2026-10-25T23:30:00Z"))).toBe("2026-W43");
    expect(isoWeekLondon(D("2026-10-26T00:30:00Z"))).toBe("2026-W44");
    /* summer time: 23:30 UTC on Sunday 19 Jul is already 00:30 Monday in London */
    expect(isoWeekLondon(D("2026-07-19T22:30:00Z"))).toBe("2026-W29");
    expect(isoWeekLondon(D("2026-07-19T23:30:00Z"))).toBe("2026-W30");
    expect(isoWeekLondon(D("2027-01-01T12:00:00Z"))).toBe("2026-W53");
  });
});

describe("the built bonus", () => {
  it("+3 per built doc, on top of its point", () => {
    expect(writerTotals([doc({ status: "built" })]).contributions).toBe(4);
    expect(writerTotals([doc({ status: "fixed" })]).contributions).toBe(1);
  });
  it("is not capped by the week", () => {
    const docs = [0, 1, 2, 3, 4].map((i) => doc({ status: "built", createdAt: D(`2026-10-2${i}T09:00:00Z`) }));
    expect(writerTotals(docs).contributions).toBe(3 + 5 * 3);
  });
});

describe("waiting", () => {
  it("is the docs with no status and five words", () => {
    expect(waiting(doc({ status: undefined }))).toBe(true);
    expect(waiting(doc({ status: "" }))).toBe(true);
    expect(waiting(doc({ status: undefined, message: "four words only here" }))).toBe(false);
    expect(waiting(doc({ status: "read" }))).toBe(false);
    expect(writerTotals([doc({ status: undefined }), doc({ status: undefined }), doc()]).waiting).toBe(2);
  });
});

describe("tiers", () => {
  it("each boundary", () => {
    const at = (n: number) => tierState(n, null).tier;
    expect([at(0), at(1), at(2), at(3), at(7), at(8), at(14), at(15), at(24), at(25), at(99)]).toEqual([null, "fledgling", "fledgling", "archivist", "archivist", "scout", "scout", "mentor", "mentor", "queryhawk", "queryhawk"]);
    expect(TIERS.map((t) => t.min)).toEqual([1, 3, 8, 15, 25]);
  });
  it("the next tier and the distance to it", () => {
    expect(tierState(0, null)).toMatchObject({ nextTier: "fledgling", toNext: 1 });
    expect(tierState(6, null)).toMatchObject({ tier: "archivist", nextTier: "scout", toNext: 2 });
    expect(tierState(30, null)).toMatchObject({ tier: "queryhawk", nextTier: null, toNext: null });
  });
  it("a level never goes down: the peak holds when the total falls", () => {
    expect(tierState(2, "scout")).toMatchObject({ tier: "scout", peakTier: "scout", nextTier: "mentor", toNext: 13 });
    expect(tierState(9, "archivist")).toMatchObject({ tier: "scout", peakTier: "scout" });
  });
});

describe("standing: topPct", () => {
  const ten = [30, 20, 15, 12, 10, 8, 6, 4, 2, 1];
  it("rank ÷ N × 100, rounded up to 5", () => {
    expect(topPct(30, ten)).toBe(10); // 1/10
    expect(topPct(15, ten)).toBe(30); // 3/10
    expect(topPct(10, ten)).toBe(50); // 5/10
    const eleven = [...ten, 1];
    expect(topPct(20, eleven)).toBe(20); // 2/11 = 18.2 → 20
    expect(topPct(15, eleven)).toBe(30); // 3/11 = 27.3 → UP to 30, never down to 25
  });
  it("null when fewer than ten writers have contributed", () => {
    expect(topPct(30, [30, 20, 15, 12, 10, 8, 6, 4, 2])).toBeNull();
    expect(topPct(30, [30, 20, 15, 12, 10, 8, 6, 4, 2, 0, 0])).toBeNull();
  });
  it("null above 50%", () => {
    expect(topPct(8, ten)).toBeNull(); // 6/10 = 60
    expect(topPct(1, ten)).toBeNull();
  });
  it("ties share the best rank", () => {
    expect(topPct(10, [30, 10, 10, 10, 10, 1, 1, 1, 1, 1])).toBe(20); // rank 2 of 10
  });
  it("a writer with nothing has no standing", () => {
    expect(topPct(0, ten)).toBeNull();
  });
});

describe("computeAll", () => {
  it("groups by uid, keeps peaks, and ranks across everyone", () => {
    const docs = [doc({ uid: "a", status: "built" }), doc({ uid: "b" }), doc({ uid: "b", status: undefined })];
    const out = computeAll(docs, new Map([["c", "archivist" as const]]));
    expect(out.get("a")).toMatchObject({ contributions: 4, tier: "archivist", waiting: 0, topPct: null });
    expect(out.get("b")).toMatchObject({ contributions: 1, waiting: 1 });
    /* a writer with a stored peak and no docs left keeps their level */
    expect(out.get("c")).toMatchObject({ contributions: 0, tier: "archivist", peakTier: "archivist" });
  });
});
