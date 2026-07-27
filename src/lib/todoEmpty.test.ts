/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { deskState, liveQueryCount, liveQueriesLine, clearedListCap } from "./todoEmpty";
import { QueryStatus } from "../types";

const base = { queryCount: 5, agentCount: 8, urgent: 2, hkItems: 3, notes: 1, clearedToday: 0 };

describe("deskState — A beats everything; E is earned, never default", () => {
  it("new-desk = zero queries AND zero agents (beats everything, even a cleared log)", () => {
    expect(deskState({ ...base, queryCount: 0, agentCount: 0 })).toBe("new-desk");
    expect(deskState({ queryCount: 0, agentCount: 0, urgent: 0, hkItems: 0, notes: 0, clearedToday: 3 })).toBe("new-desk");
  });
  it("one agent or one query is no longer a new desk", () => {
    expect(deskState({ ...base, queryCount: 0, agentCount: 1, urgent: 0, hkItems: 0, notes: 0 })).toBe(null);
    expect(deskState({ ...base, queryCount: 1, agentCount: 0, urgent: 0, hkItems: 0, notes: 0 })).toBe(null);
  });
  it("desk-cleared = all three sets empty AND clearedToday non-empty", () => {
    expect(deskState({ ...base, urgent: 0, hkItems: 0, notes: 0, clearedToday: 2 })).toBe("desk-cleared");
  });
  it("all empty but NOTHING cleared today → per-lane states (null), not E", () => {
    expect(deskState({ ...base, urgent: 0, hkItems: 0, notes: 0, clearedToday: 0 })).toBe(null);
  });
  it("any live set blocks E even with a cleared log", () => {
    expect(deskState({ ...base, urgent: 0, hkItems: 1, notes: 0, clearedToday: 4 })).toBe(null);
    expect(deskState({ ...base, urgent: 0, hkItems: 0, notes: 1, clearedToday: 4 })).toBe(null);
  });
});

describe("liveQueryCount + liveQueriesLine — real data doing reassurance work", () => {
  const q = (status: QueryStatus) => ({ status });
  it("counts non-terminal queries only", () => {
    expect(liveQueryCount([q(QueryStatus.QUERIED), q(QueryStatus.FULL_SENT), q(QueryStatus.REJECTED), q(QueryStatus.WITHDRAWN), q(QueryStatus.NO_RESPONSE)])).toBe(2);
  });
  it("plural and singular lines", () => {
    expect(liveQueriesLine(7)).toBe("All 7 live queries are with their agents — the ball’s in their court.");
    expect(liveQueriesLine(1)).toBe("Your 1 live query is with its agent — the ball’s in their court.");
  });
});

describe("clearedListCap — E shows at most 5, then 'and N more'", () => {
  it("caps at 5 and reports the remainder", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g"];
    expect(clearedListCap(items)).toEqual({ visible: ["a", "b", "c", "d", "e"], more: 2 });
  });
  it("under the cap shows everything, no remainder", () => {
    expect(clearedListCap(["a", "b"])).toEqual({ visible: ["a", "b"], more: 0 });
  });
});
