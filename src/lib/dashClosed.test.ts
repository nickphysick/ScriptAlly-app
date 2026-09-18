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
import {
  CLOSED_BUCKETS, CLOSED_STATUSES, DONUT, DONUT_C, closedDonut, closedTile, type ClosedBucketKey,
} from "./dashClosed";
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
    expect(CLOSED_BUCKETS.map((b) => b.label)).toEqual(["No reply", "Passed on query", "Passed on partial", "Passed on full"]);
    /* ⚠️ "PASSED ON" IS THE APP'S OWN VERB AND IS NOT FORBIDDEN (v16, 18 Sep) — the feed has always
       written "<agent> passed on <book>", and the ref names the three rungs that way. What stays
       forbidden is the VERDICT vocabulary: a rejection is never called one, and silence is "No reply"
       rather than ghosted. The earlier form of this case forbade "pass" too, which was the stage-3
       labels' rule ("Queried · Partial · Full") rather than a law about the words. */
    for (const b of CLOSED_BUCKETS) expect(b.label.toLowerCase()).not.toMatch(/reject|ghost|declin|dead|fail/);
  });

  /* ⚠️ THE ORDER IS THE RING'S, FROM 12 O'CLOCK, AND THE KEY READS THE SAME ARRAY (v16, 18 Sep) — so
     the slice and the row beneath it cannot come to disagree about which bucket is which. The tint and
     the glyph left this table with the pills: the ring and its swatches are coloured in the stylesheet,
     one home for a colour. */
  it("runs quiet, letter, partial, full — the ring's own order", () => {
    expect(CLOSED_BUCKETS.map((b) => b.key)).toEqual(["quiet", "letter", "partial", "full"]);
  });
});

/**
 * ⚠️ THE RING IS A MEASUREMENT, SO IT IS ASSERTED AS ONE. The arcs are laid end to end from 12
 * o'clock as SVG dash lengths, and the claim the tile rests on is that they close on the
 * circumference exactly and in the key's own order. A slice that is a rounding error short leaves a
 * hairline of track showing between two buckets, which reads as a fifth bucket with nothing in it.
 */
describe("the donut's arcs", () => {
  const tile = (counts: Record<string, number>) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return {
      total,
      buckets: CLOSED_BUCKETS.map((b) => ({
        key: b.key, label: b.label, count: counts[b.key] ?? 0,
        share: total ? (counts[b.key] ?? 0) / total : 0,
      })),
    };
  };

  it("⚠️ the arcs sum to the circumference, exactly", () => {
    const arcs = closedDonut(tile({ quiet: 7, letter: 3, partial: 2, full: 1 }));
    expect(arcs).toHaveLength(4);
    expect(arcs.reduce((a, x) => a + x.len, 0)).toBeCloseTo(DONUT_C, 9);
  });

  /* ⚠️ COMPUTED FROM THE COUNTS, NOT FROM `share`. Three thirds rounded and multiplied give three
     arcs that do not quite meet; a running total of `count / total` cannot drift. */
  it("⚠️ closes exactly on a total that does not divide", () => {
    const arcs = closedDonut(tile({ quiet: 1, letter: 1, partial: 1, full: 0 }));
    expect(arcs.reduce((a, x) => a + x.len, 0)).toBeCloseTo(DONUT_C, 9);
  });

  it("each arc starts where the one before it ended, in the key's order", () => {
    const arcs = closedDonut(tile({ quiet: 5, letter: 3, partial: 2, full: 2 }));
    expect(arcs.map((a) => a.key)).toEqual(["quiet", "letter", "partial", "full"]);
    let run = 0;
    for (const a of arcs) {
      expect(a.offset, a.key).toBeCloseTo(-run, 9);
      run += a.len;
    }
  });

  /**
   * ⚠️ A ZERO BUCKET DRAWS NOTHING AND STILL TAKES ITS TURN. It is dropped rather than drawn at
   * length 0 — a zero-length dash with a round cap paints a DOT, which puts a slice on the ring for a
   * bucket that has nothing in it — but the running offset passes through it, so the arcs that follow
   * start exactly where they would have.
   */
  it("⚠️ a zero bucket is absent from the ring and does not move the ones after it", () => {
    const full = closedDonut(tile({ quiet: 4, letter: 0, partial: 3, full: 1 }));
    expect(full.map((a) => a.key)).toEqual(["quiet", "partial", "full"]);
    const partial = full.find((a) => a.key === "partial")!;
    expect(partial.offset).toBeCloseTo(-(4 / 8) * DONUT_C, 9);
  });

  it("nothing closed draws no ring at all", () => {
    expect(closedDonut(tile({}))).toEqual([]);
  });

  /* the geometry the component draws with — the box, the radius and the stroke are one statement */
  it("the circumference is the radius the arcs are stroked on", () => {
    expect(DONUT_C).toBeCloseTo(2 * Math.PI * DONUT.r, 10);
    expect(DONUT.r * 2 + DONUT.stroke).toBeLessThanOrEqual(DONUT.box);
  });
});
