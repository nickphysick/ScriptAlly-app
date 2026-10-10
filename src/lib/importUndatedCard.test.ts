/**
 * IF1 · U2 (unit half) — the active-queries card does not say there are none when there are some.
 * Red on the baseline: a live query with no sent date was not counted at all, so two live, undated
 * queries read "No active queries".
 */
import { describe, expect, it } from "vitest";
import { activeTitle } from "../components/dashboard/OneScreenChart";
import { liveCount, undatedLiveCount } from "./dashBreakdown";
import { Query, QueryStatus } from "../types";

const q = (status: QueryStatus, dateSent?: string): Query => ({ id: Math.random().toString(36), status, ...(dateSent ? { dateSent } : {}) } as Query);

describe("U2 · live queries with no sent date are counted and named", () => {
  const undatedPair = [q(QueryStatus.PARTIAL_REQUESTED), q(QueryStatus.FULL_REQUESTED), q(QueryStatus.REJECTED)];
  it("two live, undated queries", () => {
    expect(liveCount(undatedPair), "the chart can place none of them").toBe(0);
    expect(undatedLiveCount(undatedPair), "a closed query is not live").toBe(2);
    expect(activeTitle(liveCount(undatedPair), undatedLiveCount(undatedPair))).toBe("2 active queries have no sent date yet.");
  });
  it("one", () => { expect(activeTitle(0, 1)).toBe("1 active query has no sent date yet."); });
  it("none at all keeps today's words; a dated one keeps its count", () => {
    expect(activeTitle(0, 0)).toBe("No active queries");
    expect(activeTitle(3, 2)).toBe("3 active queries");
    expect(undatedLiveCount([q(QueryStatus.QUERIED, "2026-03-14T00:00:00.000Z")])).toBe(0);
  });
});
