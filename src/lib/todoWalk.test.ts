import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import { choosePicks, rolledOverCards, todayProgress } from "./todoWalk";

const card = (key: string, over: Partial<BoardCard> = {}): BoardCard =>
  ({ key, stream: "do", title: "", who: "", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "", record: "", committed: false, done: false, ...over } as BoardCard);

describe("choosePicks — the Help-me-pick rule", () => {
  const doCards = [card("d1"), card("d2"), card("d3"), card("d4"), card("d5")];
  const hkCards = [card("h1", { stream: "hk" }), card("h2", { stream: "hk" }), card("h3", { stream: "hk" })];

  it("takes ≤4 Do-next then tops up with ≤2 Housekeeping, capped at 5", () => {
    expect(choosePicks({ doCards, hkCards, committedCount: 0 })).toEqual(["d1", "d2", "d3", "d4", "h1"]);
  });
  it("respects remaining room (cap 5)", () => {
    expect(choosePicks({ doCards, hkCards, committedCount: 3 })).toEqual(["d1", "d2"]);
    expect(choosePicks({ doCards, hkCards, committedCount: 5 })).toEqual([]);
  });
  it("uses ≤3 Housekeeping when nothing urgent", () => {
    expect(choosePicks({ doCards: [], hkCards, committedCount: 0 })).toEqual(["h1", "h2", "h3"]);
  });
  it("never picks already-committed cards", () => {
    const someCommitted = [card("d1", { committed: true }), card("d2"), card("d3")];
    expect(choosePicks({ doCards: someCommitted, hkCards: [], committedCount: 1 })).toEqual(["d2", "d3"]);
  });
});

describe("todayProgress — empty list never claims done", () => {
  it("empty list → 0/0, no done, not filled", () => {
    expect(todayProgress(0, 0)).toEqual({ total: 0, done: 0, pct: 0, empty: true });
  });
  it("a globally-cleared item that wasn't committed to Today does not enter the ratio", () => {
    // 0 committed on the list, 0 completed FROM the list → still empty even though something cleared globally.
    expect(todayProgress(0, 0).empty).toBe(true);
  });
  it("N committed, M done → M/N", () => {
    expect(todayProgress(2, 1)).toEqual({ total: 3, done: 1, pct: 33, empty: false });
    expect(todayProgress(0, 2)).toEqual({ total: 2, done: 2, pct: 100, empty: false });
  });
});

describe("rolledOverCards", () => {
  it("finds committed items from a previous day only", () => {
    const cards = [
      card("today", { committedDate: "2026-07-09" }),
      card("yesterday", { committedDate: "2026-07-08" }),
      card("uncommitted", {}),
    ];
    expect(rolledOverCards(cards, "2026-07-09").map((c) => c.key)).toEqual(["yesterday"]);
  });
});
