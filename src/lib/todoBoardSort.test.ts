/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the board's sort and its FILTERS facet (board+dock pack, Phases 1–2).
 */
import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import {
  TODO_SORTS, DEFAULT_TODO_SORT, sortBoardCards,
  TODO_FACETS, facetOf, applyFacet, facetCounts,
} from "./todoBoardSort";

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

describe("the sort — four orders, Most pressing leading", () => {
  it("offers the brief's four, with Most pressing the default", () => {
    expect(TODO_SORTS.map((s) => s.label)).toEqual(["Most pressing", "Newest", "Oldest", "A–Z"]);
    expect(DEFAULT_TODO_SORT).toBe("pressing");
  });

  it("⚠️ 'Most pressing' is a REAL order, not the array as it arrived", () => {
    const cards = [
      card({ key: "hk", taskType: "data_quality_poor", hk: true }),
      card({ key: "stale", taskType: "no_response_close" }),
      card({ key: "offer", taskType: "offer_received" }),
      card({ key: "full", taskType: "full_requested" }),
    ];
    // an offer first (someone else set its clock), then what you are holding up, then the quiet,
    // then housekeeping — which is real work that keeps until Thursday
    expect(sortBoardCards(cards, "pressing").map((c) => c.key)).toEqual(["offer", "full", "stale", "hk"]);
  });

  it("A–Z sorts by title, en-GB", () => {
    const cards = [card({ key: "b", title: "Zoe Aldridge" }), card({ key: "a", title: "Ada Brown" })];
    expect(sortBoardCards(cards, "az").map((c) => c.key)).toEqual(["a", "b"]);
  });

  it("Newest and Oldest are opposites over the same anchor", () => {
    const cards = [
      card({ key: "old", dueYmd: "2026-01-01" }),
      card({ key: "new", dueYmd: "2026-08-01" }),
    ];
    expect(sortBoardCards(cards, "newest").map((c) => c.key)).toEqual(["new", "old"]);
    expect(sortBoardCards(cards, "oldest").map((c) => c.key)).toEqual(["old", "new"]);
  });

  it("⚠️ ABSENCE SORTS LAST in BOTH directions — a dateless card never leads 'Newest'", () => {
    const cards = [
      card({ key: "none" }),
      card({ key: "dated", dueYmd: "2026-08-01" }),
    ];
    expect(sortBoardCards(cards, "newest").map((c) => c.key)).toEqual(["dated", "none"]);
    expect(sortBoardCards(cards, "oldest").map((c) => c.key)).toEqual(["dated", "none"]);
  });

  it("is PURE — it never mutates the column it was handed", () => {
    const cards = [card({ key: "b", title: "B" }), card({ key: "a", title: "A" })];
    const before = cards.map((c) => c.key);
    sortBoardCards(cards, "az");
    expect(cards.map((c) => c.key)).toEqual(before);
  });
});

describe("FILTERS — four rows, and the two that left", () => {
  it("is Everything · Urgent · Housekeeping · Your tasks, in that order", () => {
    expect(TODO_FACETS.map((f) => f.label)).toEqual(["Everything", "Urgent", "Housekeeping", "Your tasks"]);
  });

  it("⚠️ has NO Snoozed row — it is a column, and filtering to it would empty three others", () => {
    expect(TODO_FACETS.some((f) => (f.id as string) === "snoozed")).toBe(false);
  });

  it("⚠️ has NO Notes row — notes are not on this board at all, so it could only return nothing", () => {
    expect(TODO_FACETS.some((f) => (f.id as string) === "notes")).toBe(false);
  });

  it("every card belongs to exactly ONE facet, so the counts partition the board", () => {
    expect(facetOf(card({ taskType: "offer_received" }))).toBe("urgent");
    expect(facetOf(card({ hk: true, taskType: "data_quality_poor" }))).toBe("housekeeping");
    expect(facetOf(card({ userTaskId: "u1", nature: "task" }))).toBe("yours");
  });

  it("'Everything' is the IDENTITY — never a filter that happens to pass everything", () => {
    const cards = [card({ key: "a" }), card({ key: "b", hk: true })];
    expect(applyFacet(cards, "all")).toBe(cards); // the same array, not a copy that filtered to all
  });

  it("a facet narrows to its own family", () => {
    const cards = [
      card({ key: "u", taskType: "offer_received" }),
      card({ key: "h", hk: true, taskType: "data_quality_poor" }),
      card({ key: "y", userTaskId: "u1", nature: "task" }),
    ];
    expect(applyFacet(cards, "urgent").map((c) => c.key)).toEqual(["u"]);
    expect(applyFacet(cards, "housekeeping").map((c) => c.key)).toEqual(["h"]);
    expect(applyFacet(cards, "yours").map((c) => c.key)).toEqual(["y"]);
  });

  it("⚠️ the counts come from the SAME cards the columns render — 'all' is always the sum", () => {
    const cards = [
      card({ key: "u", taskType: "offer_received" }),
      card({ key: "u2", taskType: "full_requested" }),
      card({ key: "h", hk: true, taskType: "data_quality_poor" }),
      card({ key: "y", userTaskId: "u1", nature: "task" }),
    ];
    const c = facetCounts(cards);
    expect(c.all).toBe(cards.length);
    expect(c.urgent + c.housekeeping + c.yours).toBe(c.all);
    expect([c.urgent, c.housekeeping, c.yours]).toEqual([2, 1, 1]);
  });

  it("each facet's count equals what applying it actually returns — no second tally", () => {
    const cards = [
      card({ key: "u", taskType: "offer_received" }),
      card({ key: "h", hk: true, taskType: "data_quality_poor" }),
    ];
    const c = facetCounts(cards);
    for (const f of ["urgent", "housekeeping", "yours"] as const) {
      expect(applyFacet(cards, f)).toHaveLength(c[f]);
    }
  });
});
