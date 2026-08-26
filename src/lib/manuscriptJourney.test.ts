/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE JOURNEY — two tracks, and each counts every query EXACTLY ONCE ════════════════════════
 *
 * These are the two invariants the whole pane rests on, and they are stated as SUMS rather than as
 * row-by-row expectations, because a row-by-row fixture is satisfied by a derivation that is wrong
 * about a case nobody wrote down.
 *
 *   1. Current standing counts each query at its CURRENT point. Seven stations plus closed must
 *      equal the number of queries sent. Not cumulative — a full that is out has not also "reached"
 *      the queried station in this reading.
 *   2. Furthest reached counts each query at its FURTHEST-EVER point, open or closed. Six rows,
 *      and they must also equal the number of queries sent.
 *
 * ⚠️ THE TWO ARE DIFFERENT QUESTIONS AND MUST GIVE DIFFERENT ANSWERS ON THE SAME DATA. A query
 * that drew a full request and was then declined stands at CLOSED and reached FULL REQUESTED. A
 * derivation that made the two agree would have quietly deleted every request the writer has ever
 * had the moment it closed — which is the exact fault `analytics.ts` records against reading the
 * current status for its funnel.
 */
import { describe, it, expect } from "vitest";
import { standingTrack, furthestTrack, STANDING_STATIONS, FURTHEST_RUNGS } from "./manuscriptJourney";
import { Query, QueryStatus, Activity } from "../types";

const q = (id: string, status: QueryStatus, agentId = "a1"): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId, packageId: "", status,
     dateSent: "2026-02-01", materialsWanted: [] } as unknown as Query);

const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({ id: `${queryId}-${status}`, userId: "u", queryId, manuscriptId: "m1", date,
     description: status, resultingStatus: status } as unknown as Activity);

/** Every status, so no bucket is exercised only by the ones somebody remembered. */
const ALL = Object.values(QueryStatus);

const MIXTURES: { name: string; queries: Query[]; acts: Activity[] }[] = [
  { name: "empty", queries: [], acts: [] },
  { name: "one queried", queries: [q("q1", QueryStatus.QUERIED)], acts: [] },
  {
    name: "every status once",
    queries: ALL.map((s, i) => q(`q${i}`, s)),
    acts: [],
  },
  {
    name: "every status twice",
    queries: [...ALL, ...ALL].map((s, i) => q(`q${i}`, s)),
    acts: [],
  },
  {
    name: "closed queries carrying real history",
    queries: [
      q("a", QueryStatus.REJECTED), q("b", QueryStatus.REJECTED),
      q("c", QueryStatus.NO_RESPONSE), q("d", QueryStatus.WITHDRAWN),
      q("e", QueryStatus.FULL_SENT), q("f", QueryStatus.QUERIED),
    ],
    acts: [
      rung("a", QueryStatus.QUERIED, "2026-01-01"),
      rung("a", QueryStatus.FULL_REQUESTED, "2026-02-01"),
      rung("a", QueryStatus.REJECTED, "2026-03-01"),
      rung("b", QueryStatus.QUERIED, "2026-01-05"),
      rung("b", QueryStatus.PARTIAL_REQUESTED, "2026-02-05"),
      rung("b", QueryStatus.REJECTED, "2026-03-05"),
      rung("d", QueryStatus.QUERIED, "2026-01-09"),
      rung("d", QueryStatus.REVISE_RESUBMIT, "2026-04-09"),
      rung("e", QueryStatus.QUERIED, "2026-01-11"),
      rung("e", QueryStatus.FULL_REQUESTED, "2026-02-11"),
      rung("e", QueryStatus.FULL_SENT, "2026-02-20"),
    ],
  },
  {
    name: "an undated import with no log at all",
    queries: [{ ...q("z", QueryStatus.FULL_SENT), dateSent: undefined } as unknown as Query],
    acts: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
describe("SEMANTIC 1 — current standing counts each query exactly once", () => {
  it("seven stations plus closed equals the number of queries sent, for every mixture", () => {
    for (const m of MIXTURES) {
      const t = standingTrack(m.queries);
      const stations = t.stations.reduce((n, s) => n + s.count, 0);
      expect(stations + t.closed + t.unrecognised, `mixture: ${m.name}`).toBe(m.queries.length);
    }
  });

  /**
   * ⚠️ NOT CUMULATIVE, AND THIS IS THE ASSERTION THAT SAYS SO. The natural mistake is a funnel —
   * a full that is out ALSO counting at Queried and at Full requested — which reads perfectly and
   * makes the stations sum to several times the query count.
   */
  it("a query that is out with a full stands at Full sent and nowhere else", () => {
    const t = standingTrack([q("q1", QueryStatus.FULL_SENT)]);
    expect(t.stations.filter((s) => s.count > 0).map((s) => s.status)).toEqual([QueryStatus.FULL_SENT]);
    expect(t.closed).toBe(0);
  });

  it("the seven stations are the pipeline, and closed is not among them", () => {
    expect(STANDING_STATIONS).toEqual([
      QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT,
      QueryStatus.OFFER,
    ]);
    for (const closed of [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(STANDING_STATIONS).not.toContain(closed);
    }
  });

  /**
   * ⚠️ AN UNRECOGNISED STATUS GETS ITS OWN COUNT RATHER THAN BEING FOLDED INTO CLOSED. "I do not
   * know where this stands" is not "this is over", and folding the two would make the sum hold
   * while the page stated something untrue. It is the same law the versions panel already applies
   * to a sample with no recorded version.
   */
  it("counts an unrecognised status on its own rather than calling it closed", () => {
    const rogue = { ...q("x", QueryStatus.QUERIED), status: "Ghosted" } as unknown as Query;
    const t = standingTrack([rogue, q("y", QueryStatus.QUERIED)]);
    expect(t.unrecognised).toBe(1);
    expect(t.closed).toBe(0);
    expect(t.stations.reduce((n, s) => n + s.count, 0)).toBe(1);
  });

  /** The rail fills to the furthest OCCUPIED station — a fact about where things are, not a bar. */
  it("fills the rail to the furthest occupied station, and not at all when nothing is out", () => {
    expect(standingTrack([]).furthestIndex).toBeNull();
    expect(standingTrack([q("a", QueryStatus.QUERIED)]).furthestIndex).toBe(0);
    expect(standingTrack([q("a", QueryStatus.QUERIED), q("b", QueryStatus.REVISE_RESUBMIT)]).furthestIndex).toBe(5);
    // Closed queries are off the rail, so they cannot fill it.
    expect(standingTrack([q("a", QueryStatus.REJECTED)]).furthestIndex).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("SEMANTIC 2 — furthest reached counts each query exactly once", () => {
  it("the six rungs equal the number of queries sent, for every mixture", () => {
    for (const m of MIXTURES) {
      const rows = furthestTrack(m.queries, m.acts);
      const total = rows.reduce((n, r) => n + r.count, 0);
      expect(total, `mixture: ${m.name}`).toBe(m.queries.length);
    }
  });

  /**
   * ⚠️ HISTORY, NOT CURRENT STATUS — and this fixture is the difference between a true figure and a
   * flattering one. A query that drew a full request and was then declined still REACHED the full
   * rung; counting only live queries would delete every request the writer has ever had the moment
   * it closed.
   */
  it("a rejected query still counts at the furthest rung it reached", () => {
    const rows = furthestTrack(
      [q("a", QueryStatus.REJECTED)],
      [rung("a", QueryStatus.QUERIED, "2026-01-01"), rung("a", QueryStatus.FULL_REQUESTED, "2026-02-01"),
       rung("a", QueryStatus.REJECTED, "2026-03-01")],
    );
    expect(rows.find((r) => r.key === "full")!.count).toBe(1);
    expect(rows.find((r) => r.key === "queried")!.count).toBe(0);
  });

  it("the two tracks disagree about the same query, which is the point", () => {
    const queries = [q("a", QueryStatus.REJECTED)];
    const acts = [rung("a", QueryStatus.FULL_REQUESTED, "2026-02-01"), rung("a", QueryStatus.REJECTED, "2026-03-01")];
    expect(standingTrack(queries).closed).toBe(1);
    expect(furthestTrack(queries, acts).find((r) => r.key === "full")!.count).toBe(1);
  });

  it("every rung is listed even at nought — an absent row states nothing", () => {
    const rows = furthestTrack([q("a", QueryStatus.QUERIED)], []);
    expect(rows.map((r) => r.key)).toEqual(FURTHEST_RUNGS.map((r) => r.key));
    expect(rows.filter((r) => r.count === 0)).toHaveLength(FURTHEST_RUNGS.length - 1);
  });

  /**
   * ⚠️ THE ORDER IS THE LADDER AND IS NEVER SORTED BY COUNT. Ordering rows by how many queries
   * reached each rung is a ranking, and the app reports rather than appraises.
   */
  it("keeps the ladder's order whatever the counts are", () => {
    const rows = furthestTrack(ALL.map((s, i) => q(`q${i}`, s)), []);
    expect(rows.map((r) => r.key)).toEqual(["queried", "responded", "partial", "full", "rr", "offer"]);
  });

  it("uses no verdict language in any label", () => {
    const words = /\b(best|worst|strong|weak|good|bad|poor|great|top|leading|winning|success|fail|only|just)/i;
    for (const r of FURTHEST_RUNGS) expect(r.label).not.toMatch(words);
  });
});
