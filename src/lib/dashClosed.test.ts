/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Closed tile (dashboard stage 3, 17 Sep) — four buckets, mutually exclusive, summing to the total.
 *
 * ⚠️ HOW FAR A QUERY GOT IS READ FROM ITS HISTORY, so the fixtures carry a log. A query passed on after
 * a full request is a FULL whether or not its status ever said so today, which is the point of the tile.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryStatus, type Activity, type Query } from "../types";
import { CLOSED_BUCKETS, CLOSED_STATUSES, closedTile, type ClosedBucketKey } from "./dashClosed";
import { buildRows } from "./analytics";

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const ago = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
let seq = 0;
const q = (status: QueryStatus, over: Record<string, unknown> = {}): Query =>
  ({ id: `c${++seq}`, userId: "u", agentId: "a1", manuscriptId: "m1", status, dateSent: ago(90), ...over } as unknown as Query);
const act = (queryId: string, resultingStatus: QueryStatus, n: number): Activity =>
  ({ id: `e${++seq}`, queryId, resultingStatus, date: ago(n), type: "Status Change", description: "" } as unknown as Activity);

const count = (t: ReturnType<typeof closedTile>, key: ClosedBucketKey) => t.buckets.find((b) => b.key === key)!.count;

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => { warn = vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => { warn.mockRestore(); });

describe("what is closed", () => {
  it("is a pass or silence, and only a sent one — a withdrawal is left out, an offer is live", () => {
    expect([...CLOSED_STATUSES].sort()).toEqual([QueryStatus.NO_RESPONSE, QueryStatus.REJECTED].sort());
    const t = closedTile([
      q(QueryStatus.REJECTED), q(QueryStatus.NO_RESPONSE),
      q(QueryStatus.WITHDRAWN), q(QueryStatus.OFFER), q(QueryStatus.QUERIED),
      q(QueryStatus.REJECTED, { dateSent: undefined }),
    ], []);
    expect(t.total).toBe(2);
  });
});

describe("⚠️ the four buckets", () => {
  /* one query of every shape the bucketing has to decide, each one decided by its own history */
  const letter = q(QueryStatus.REJECTED);
  const afterPartial = q(QueryStatus.REJECTED);
  const afterFull = q(QueryStatus.REJECTED);
  const quietAtLetter = q(QueryStatus.NO_RESPONSE);
  const quietAfterPartial = q(QueryStatus.NO_RESPONSE);
  const quietAfterFull = q(QueryStatus.NO_RESPONSE);
  const statusOnlyFull = q(QueryStatus.REJECTED, { fullRequestedDate: ago(40) });
  const log = [
    act(letter.id, QueryStatus.REJECTED, 30),
    act(afterPartial.id, QueryStatus.PARTIAL_REQUESTED, 60), act(afterPartial.id, QueryStatus.PARTIAL_SENT, 58),
    act(afterPartial.id, QueryStatus.REJECTED, 20),
    act(afterFull.id, QueryStatus.PARTIAL_REQUESTED, 70), act(afterFull.id, QueryStatus.FULL_REQUESTED, 50),
    act(afterFull.id, QueryStatus.REJECTED, 10),
    act(quietAfterPartial.id, QueryStatus.PARTIAL_REQUESTED, 80),
    act(quietAfterFull.id, QueryStatus.FULL_REQUESTED, 80),
  ];
  const all = [letter, afterPartial, afterFull, quietAtLetter, quietAfterPartial, quietAfterFull, statusOnlyFull];
  const t = closedTile(all, log);

  it("sum to the total, and the data layer does not warn", () => {
    expect(t.total).toBe(all.length);
    expect(t.buckets.reduce((a, b) => a + b.count, 0)).toBe(t.total);
    expect(warn).not.toHaveBeenCalled();
  });

  it("⚠️ silence counts only as No reply, however far the query got first", () => {
    expect(count(t, "quiet")).toBe(3);
  });

  it("a pass lands at the furthest rung it reached — the letter, a partial, or a full", () => {
    expect(count(t, "letter")).toBe(1);
    expect(count(t, "partial")).toBe(1);
    expect(count(t, "full")).toBe(2);
  });

  /* ⚠️ TWO DERIVATIONS AGAINST EACH OTHER: the tile's rung IS Analytics' rung, query by query, for a mix
     that includes a pass after a revise-and-resubmit. (Analytics reads an R&R as reaching the full only
     while the status IS R&R, so that query lands at the letter on both pages today — reported, and
     deliberately not patched here, because the tile's whole claim is that it cannot disagree.) */
  it("⚠️ agrees with Analytics about every closed query's furthest rung", () => {
    const rr = q(QueryStatus.REJECTED);
    const mix = [...all, rr];
    const mixLog = [...log, act(rr.id, QueryStatus.REVISE_RESUBMIT, 45), act(rr.id, QueryStatus.REJECTED, 5)];
    const expected: Record<ClosedBucketKey, number> = { letter: 0, partial: 0, full: 0, quiet: 0 };
    for (const r of buildRows(mix, mixLog, [], 0)) {
      const key: ClosedBucketKey = r.status === QueryStatus.NO_RESPONSE ? "quiet"
        : r.reachedFull ? "full" : r.reachedRequest ? "partial" : "letter";
      expected[key] += 1;
    }
    const tile = closedTile(mix, mixLog);
    for (const b of tile.buckets) expect(b.count, b.key).toBe(expected[b.key]);
  });

  it("the headline's two figures are the buckets', and the foot splits the total", () => {
    expect(t.pastLetter).toBe(count(t, "partial") + count(t, "full"));
    expect(t.replied + t.quiet).toBe(t.total);
    expect(t.quiet).toBe(count(t, "quiet"));
  });

  it("each bar is its bucket's share of the total, and nothing is drawn when nothing is closed", () => {
    for (const b of t.buckets) expect(b.share).toBeCloseTo(b.count / t.total, 10);
    const none = closedTile([q(QueryStatus.QUERIED)], []);
    expect(none.total).toBe(0);
    expect(none.buckets.every((b) => b.count === 0 && b.share === 0)).toBe(true);
  });
});

describe("the words", () => {
  it("say how far a query got, never what was decided about it", () => {
    expect(CLOSED_BUCKETS.map((b) => b.label)).toEqual(["Queried", "Partial", "Full", "No reply"]);
    for (const b of CLOSED_BUCKETS) expect(b.label.toLowerCase()).not.toMatch(/reject|ghost|pass|declin/);
  });

  it("each bucket wears the state tint of the stage it names, and the glyph of that stage", () => {
    expect(CLOSED_BUCKETS.map((b) => [b.key, b.tone, b.glyph])).toEqual([
      ["letter", "queried", QueryStatus.QUERIED],
      ["partial", "you", QueryStatus.PARTIAL_REQUESTED],
      ["full", "agent", QueryStatus.FULL_REQUESTED],
      ["quiet", "closed", QueryStatus.NO_RESPONSE],
    ]);
  });
});
