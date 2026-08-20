/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Analytics derivations.
 *
 * ⚠️ THESE ASSERT MECHANISMS, NOT PROXIES. Where a figure has two derivations in the codebase they
 * are asserted AGAINST EACH OTHER rather than against a literal on both sides — a pair of
 * hand-written numbers goes green the day someone changes both in the same wrong direction.
 *
 * ⚠️ AND EVERY INPUT IS ONE THE APP CAN ACTUALLY PRODUCE. Statuses come from the `QueryStatus`
 * enum itself and stage dates from `resultingStatus`-bearing activities, because that is what the
 * writers of this data really emit. A hand-typed argument its callers never construct tests a
 * function nobody runs.
 */
import { describe, expect, it } from "vitest";
import { Activity, ActivityType, Agent, Query, QueryStatus } from "../types";
import { medianReplyDays } from "./dashboardStats";
import { AGENT_RESPONSE_STATUSES } from "./queryDerivation";
import {
  agingSet,
  buildRows,
  eventMarks,
  fullsUnderConsideration,
  funnelStages,
  funnelTransitions,
  guarded,
  horizonSet,
  isEarlyState,
  latestResponses,
  median,
  MIN_SAMPLE,
  monthKey,
  monthlySeries,
  outcomeFor,
  previousWindow,
  previousWindowLabel,
  rangeWindow,
  replyBuckets,
  rowsInWindow,
  safePct,
  statSet,
  statusBreakdown,
  MAX_TIMELINE_MONTHS,
  DAY_MS,
} from "./analytics";

/* Wednesday 19 August 2026, midday — a fixed "now" so nothing here depends on the real clock. */
const NOW = new Date(2026, 7, 19, 12, 0, 0).getTime();
const daysAgo = (n: number) => new Date(NOW - n * DAY_MS).toISOString();

let seq = 0;
const nextId = () => `id${++seq}`;

const agent = (over: Partial<Agent> = {}): Agent =>
  ({ id: nextId(), userId: "u", name: "Alex Fenn", agency: "Fenn Literary", email: "", website: "", ...over }) as Agent;

const query = (over: Partial<Query> = {}): Query =>
  ({
    id: nextId(),
    userId: "u",
    manuscriptId: "m1",
    agentId: "a1",
    packageId: "",
    status: QueryStatus.QUERIED,
    personalisationNotes: "",
    sendMethod: "Email",
    ...over,
  }) as unknown as Query;

/** A status-bearing activity — the shape every status write in the app really appends. */
const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({
    id: nextId(),
    userId: "u",
    queryId,
    manuscriptId: "m1",
    activityType: ActivityType.STATUS_CHANGED,
    description: "",
    date,
    details: "",
    resultingStatus: status,
  }) as unknown as Activity;

/**
 * A query that went out and drew a response, built the way the app builds one: a send, then an
 * incoming rung whose `resultingStatus` is the outcome.
 */
function answered(a: Agent, sentDaysAgo: number, replyAfterDays: number, outcome: QueryStatus) {
  const q = query({ agentId: a.id, status: outcome, dateSent: daysAgo(sentDaysAgo) });
  return {
    q,
    acts: [
      rung(q.id, QueryStatus.QUERIED, daysAgo(sentDaysAgo)),
      rung(q.id, outcome, daysAgo(sentDaysAgo - replyAfterDays)),
    ],
  };
}

function openQuery(a: Agent, sentDaysAgo: number) {
  const q = query({ agentId: a.id, status: QueryStatus.QUERIED, dateSent: daysAgo(sentDaysAgo) });
  return { q, acts: [rung(q.id, QueryStatus.QUERIED, daysAgo(sentDaysAgo))] };
}

const assemble = (parts: { q: Query; acts: Activity[] }[], agents: Agent[]) =>
  buildRows(parts.map((p) => p.q), parts.flatMap((p) => p.acts), agents, NOW);

/* ────────────────────────────── the sample-size guard ────────────────────────────── */

describe("the sample-size guard", () => {
  it("states a fraction below MIN_SAMPLE and a percentage at or above it", () => {
    /* ⚠️ THE BOUNDARY IS ASSERTED FROM BOTH SIDES OF THE SAME CONSTANT, so moving MIN_SAMPLE
       moves the test with it rather than leaving a literal behind that used to be the edge. */
    expect(guarded(MIN_SAMPLE - 1)).toBe(true);
    expect(guarded(MIN_SAMPLE)).toBe(false);
    expect(safePct(2, MIN_SAMPLE - 1)).toBe(`2 of ${MIN_SAMPLE - 1}`);
    expect(safePct(4, MIN_SAMPLE)).toBe(`${Math.round((4 / MIN_SAMPLE) * 100)}%`);
  });

  it("guards a zero denominator rather than reporting 0%", () => {
    /* `0%` would claim a measurement had been taken over nothing. */
    expect(safePct(0, 0)).toBe("0 of 0");
  });

  it("guards every funnel transition, not only the request rate", () => {
    const a = agent();
    const rows = assemble([answered(a, 40, 10, QueryStatus.FULL_REQUESTED), openQuery(a, 5)], [a]);
    const labels = funnelTransitions(funnelStages(rows)).map((t) => t.label);
    expect(labels).toHaveLength(3);
    for (const l of labels) expect(l).toMatch(/ of /);
  });

  it("reports the early state off the same constant the guard uses", () => {
    const a = agent();
    expect(isEarlyState(assemble([openQuery(a, 1)], [a]))).toBe(true);
    const many = Array.from({ length: MIN_SAMPLE }, (_, i) => openQuery(a, i + 1));
    expect(isEarlyState(assemble(many, [a]))).toBe(false);
  });
});

/* ────────────────────────────── median, never mean ────────────────────────────── */

describe("wait figures use the median", () => {
  it("is the median and not the mean, on a set where the two differ", () => {
    /* mean 105, median 8 — one full that sat for a year is exactly the shape a mean misreports. */
    expect(median([4, 8, 12, 396])).toBe(10); // even count: midpoint of 8 and 12
    expect(median([4, 8, 396])).toBe(8);
    const mean = (4 + 8 + 396) / 3;
    expect(median([4, 8, 396])).not.toBe(Math.round(mean));
  });

  it("returns null for an empty set rather than zero", () => {
    /* Zero days would assert an instant reply; null is what "no derivable wait" actually is. */
    expect(median([])).toBeNull();
  });

  it("agrees with the dashboard's own median — two derivations, not two literals", () => {
    /* ⚠️ THE RECONCILIATION THAT MATTERS. `medianReplyDays` is the app's existing answer to this
       question; if this page's own maths ever drifts from it, the two surfaces state different
       reply times for the same queries and nothing says which is right. */
    const a = agent();
    const parts = [
      answered(a, 90, 3, QueryStatus.REJECTED),
      answered(a, 80, 21, QueryStatus.PARTIAL_REQUESTED),
      answered(a, 70, 45, QueryStatus.FULL_REQUESTED),
      answered(a, 60, 120, QueryStatus.OFFER),
      openQuery(a, 10),
    ];
    const rows = assemble(parts, [a]);
    const theirs = medianReplyDays(parts.map((p) => p.q), parts.flatMap((p) => p.acts));
    expect(statSet(rows).medianReplyDays).toBe(theirs);
    expect(theirs).not.toBeNull();
  });
});

/* ────────────────────────────── reply-time buckets ────────────────────────────── */

describe("the reply-time histogram", () => {
  it("never counts a query that has had no response", () => {
    /* ⚠️ Still waiting is not a slow answer. An open query in a bucket would make the
       distribution describe waits that have not finished. */
    const a = agent();
    const rows = assemble([openQuery(a, 200), openQuery(a, 5)], [a]);
    expect(rows.every((r) => r.replyDays === null)).toBe(true);
    expect(replyBuckets(rows).reduce((n, b) => n + b.count, 0)).toBe(0);
  });

  it("places each answered query in exactly one bucket, and the buckets total the responses", () => {
    const a = agent();
    const parts = [
      answered(a, 100, 2, QueryStatus.REJECTED),
      answered(a, 100, 10, QueryStatus.REJECTED),
      answered(a, 100, 20, QueryStatus.PARTIAL_REQUESTED),
      answered(a, 200, 45, QueryStatus.FULL_REQUESTED),
      answered(a, 300, 75, QueryStatus.REJECTED),
      answered(a, 400, 200, QueryStatus.OFFER),
      openQuery(a, 3),
    ];
    const rows = assemble(parts, [a]);
    const buckets = replyBuckets(rows);
    expect(buckets.map((b) => b.count)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(buckets.reduce((n, b) => n + b.count, 0)).toBe(statSet(rows).responded);
  });

  it("keeps full waits out of the query histogram entirely", () => {
    /* A full sent 200 days ago is not a 200-day query reply; it belongs only to the fulls panel. */
    const a = agent();
    const q = query({ agentId: a.id, status: QueryStatus.FULL_SENT, dateSent: daysAgo(300) });
    const acts = [
      rung(q.id, QueryStatus.QUERIED, daysAgo(300)),
      rung(q.id, QueryStatus.FULL_REQUESTED, daysAgo(290)),
      rung(q.id, QueryStatus.FULL_SENT, daysAgo(200)),
    ];
    const rows = buildRows([q], acts, [a], NOW);
    expect(rows[0].replyDays).toBe(10); // the QUERY was answered in ten days
    expect(fullsUnderConsideration(rows, NOW)[0].dwellDays).toBe(200);
    /* the 200-day dwell appears in no reply bucket */
    expect(replyBuckets(rows).find((b) => b.label === "3 mo +")?.count).toBe(0);
  });

  it("⚠️ ignores a legacy `responseReceivedAt` stamped equal to the send date", () => {
    /* ⚠️ THE SHAPE FOUND ON REAL DATA, not an invented one. Documents that predate the derived
       era carry a `responseReceivedAt` equal to their own `dateSent`; read as a response date each
       is a nought-day wait, and on this app's dev account nine of them pulled the median to `0`
       while `medianReplyDays` — which reads the log alone — said 24. The wait comes from the log,
       so the two agree by construction. The response itself is not lost: `hasResponded` carries
       it, which is "responded, date unknown", the honest pair. */
    const a = agent();
    const sent = daysAgo(60);
    const q = query({ agentId: a.id, status: QueryStatus.PARTIAL_REQUESTED, dateSent: sent });
    (q as unknown as { responseReceivedAt: string }).responseReceivedAt = sent;
    (q as unknown as { hasAgentResponded: boolean }).hasAgentResponded = true;
    const rows = buildRows([q], [], [a], NOW);
    expect(rows[0].respondedMs).toBeNull();
    expect(rows[0].replyDays).toBeNull();
    expect(rows[0].hasResponded).toBe(true);
    expect(replyBuckets(rows).reduce((n, b) => n + b.count, 0)).toBe(0);
    expect(statSet(rows).medianReplyDays).toBe(medianReplyDays([q], []));
  });

  it("discards a response dated before its own send rather than counting a negative wait", () => {
    const a = agent();
    const q = query({ agentId: a.id, status: QueryStatus.REJECTED, dateSent: daysAgo(10) });
    const acts = [rung(q.id, QueryStatus.REJECTED, daysAgo(40))];
    const rows = buildRows([q], acts, [a], NOW);
    expect(rows[0].respondedMs).not.toBeNull();
    expect(rows[0].replyDays).toBeNull();
  });
});

/* ────────────────────────────── previous period ────────────────────────────── */

describe("the previous period", () => {
  it("is null on All time — there is nothing before everything", () => {
    expect(previousWindow("all", NOW)).toBeNull();
    expect(previousWindowLabel("all")).toBeNull();
  });

  it("is the same length as the current window and ends where it starts", () => {
    const current = rangeWindow("3m", NOW);
    const prev = previousWindow("3m", NOW);
    expect(prev).not.toBeNull();
    expect(prev!.toMs).toBe(current.fromMs);
    expect(previousWindowLabel("3m")).toBe("previous 3 months");
  });

  it("selects a genuinely earlier set of queries", () => {
    const a = agent();
    const parts = [openQuery(a, 20), openQuery(a, 140)];
    const rows = assemble(parts, [a]);
    expect(rowsInWindow(rows, rangeWindow("3m", NOW))).toHaveLength(1);
    expect(rowsInWindow(rows, previousWindow("3m", NOW)!)).toHaveLength(1);
    expect(rowsInWindow(rows, rangeWindow("all", NOW))).toHaveLength(2);
  });

  it("keeps an undated query in All time and out of a bounded window", () => {
    /* A provisional import was still sent; it simply cannot be placed in a three-month window. */
    const a = agent();
    const q = query({ agentId: a.id });
    const rows = buildRows([q], [], [a], NOW);
    expect(rowsInWindow(rows, rangeWindow("all", NOW))).toHaveLength(1);
    expect(rowsInWindow(rows, rangeWindow("3m", NOW))).toHaveLength(0);
  });
});

/* ────────────────────────────── outcome classification ────────────────────────────── */

describe("outcome classification", () => {
  it("covers every QueryStatus the enum defines", () => {
    /* ⚠️ ENUMERATED FROM THE ENUM, not from a list typed here — a new status arrives in this test
       automatically rather than when someone remembers to add it. */
    for (const status of Object.values(QueryStatus)) {
      expect(outcomeFor(status)).toBeTruthy();
    }
  });

  it("puts every status in exactly one donut role, and the roles total the queries", () => {
    const a = agent();
    const parts = Object.values(QueryStatus).map((status, i) => ({
      q: query({ agentId: a.id, status, dateSent: daysAgo(i + 1) }),
      acts: [] as Activity[],
    }));
    const rows = assemble(parts, [a]);
    const segments = statusBreakdown(rows);
    expect(segments.reduce((n, s) => n + s.count, 0)).toBe(rows.length);
  });

  it("drops zero roles rather than drawing an empty segment", () => {
    const a = agent();
    const rows = assemble([openQuery(a, 5)], [a]);
    const segments = statusBreakdown(rows);
    expect(segments).toHaveLength(1);
    expect(segments[0].key).toBe("open");
    expect(segments.every((s) => s.count > 0)).toBe(true);
  });
});

/* ────────────────────────────── the funnel reads history ────────────────────────────── */

describe("the journey funnel", () => {
  it("still counts a request that later closed", () => {
    /* ⚠️ THE FIGURE THIS PROTECTS. Reading only the current status would delete every request the
       writer has ever had at the moment the query closed — a page that gets emptier the longer
       you query. */
    const a = agent();
    const q = query({ agentId: a.id, status: QueryStatus.REJECTED, dateSent: daysAgo(120) });
    const acts = [
      rung(q.id, QueryStatus.QUERIED, daysAgo(120)),
      rung(q.id, QueryStatus.FULL_REQUESTED, daysAgo(90)),
      rung(q.id, QueryStatus.FULL_SENT, daysAgo(88)),
      rung(q.id, QueryStatus.REJECTED, daysAgo(10)),
    ];
    const rows = buildRows([q], acts, [a], NOW);
    const stages = funnelStages(rows);
    expect(stages.map((s) => s.count)).toEqual([1, 1, 1, 0]);
  });

  it("is monotonic, so no transition can exceed 100%", () => {
    /* An offer taken off a partial still sits inside the full stage — the book was read. */
    const a = agent();
    const q = query({ agentId: a.id, status: QueryStatus.OFFER, dateSent: daysAgo(200) });
    const acts = [
      rung(q.id, QueryStatus.QUERIED, daysAgo(200)),
      rung(q.id, QueryStatus.PARTIAL_REQUESTED, daysAgo(150)),
      rung(q.id, QueryStatus.OFFER, daysAgo(20)),
    ];
    const many = Array.from({ length: MIN_SAMPLE }, (_, i) => openQuery(a, i + 1));
    const rows = buildRows(
      [q, ...many.map((m) => m.q)],
      [...acts, ...many.flatMap((m) => m.acts)],
      [a],
      NOW,
    );
    const stages = funnelStages(rows);
    for (let i = 0; i < stages.length - 1; i++) {
      expect(stages[i + 1].count).toBeLessThanOrEqual(stages[i].count);
    }
    /* ⚠️ ONLY THE UNGUARDED LABELS PARSE AS A NUMBER — a guarded one reads `1 of 1`, and
       `Number("1 of 1")` is NaN, which every numeric comparison silently passes. Filter first. */
    const percentages = funnelTransitions(stages).map((t) => t.label).filter((l) => l.endsWith("%"));
    expect(percentages.length).toBeGreaterThan(0);
    for (const l of percentages) expect(Number(l.slice(0, -1))).toBeLessThanOrEqual(100);
  });
});

/* ────────────────────────────── the timeline ────────────────────────────── */

describe("the monthly timeline", () => {
  it("counts a send in its send month and a response in its response month", () => {
    const a = agent();
    const parts = [answered(a, 70, 60, QueryStatus.REJECTED)];
    const rows = assemble(parts, [a]);
    const series = monthlySeries(rows, "all", NOW);
    const sentK = monthKey(rows[0].sentMs as number);
    const gotK = monthKey(rows[0].respondedMs as number);
    expect(sentK).not.toBe(gotK);
    expect(series.sent[series.months.indexOf(sentK)]).toBe(1);
    expect(series.received[series.months.indexOf(gotK)]).toBe(1);
  });

  it("reports a truncated all-time span instead of silently shortening it", () => {
    /* ⚠️ NO SILENT CAPS. A cap nobody states reads as "this is everything". */
    const a = agent();
    const old = openQuery(a, 365 * 4);
    const rows = assemble([old, openQuery(a, 2)], [a]);
    const series = monthlySeries(rows, "all", NOW);
    expect(series.months).toHaveLength(MAX_TIMELINE_MONTHS);
    expect(series.omittedMonths).toBeGreaterThan(0);
  });

  it("emits a mark for the full AND the offer when one query produced both", () => {
    const a = agent();
    const q = query({ agentId: a.id, status: QueryStatus.OFFER, dateSent: daysAgo(200) });
    const acts = [
      rung(q.id, QueryStatus.QUERIED, daysAgo(200)),
      rung(q.id, QueryStatus.FULL_REQUESTED, daysAgo(150)),
      rung(q.id, QueryStatus.OFFER, daysAgo(20)),
    ];
    const marks = eventMarks(buildRows([q], acts, [a], NOW));
    expect(marks.map((m) => m.kind)).toEqual(["full", "offer"]);
    expect(marks[0].monthKey).not.toBe(marks[1].monthKey);
    expect(marks[0].agentName).toBe("Alex Fenn");
  });
});

/* ────────────────────────────── the stated window ────────────────────────────── */

describe("the agency's stated window", () => {
  it("normalises days out against the agent's own responseTimeWeeks", () => {
    const fast = agent({ name: "Quick Reader", responseTimeWeeks: 4 });
    const slow = agent({ name: "Slow Reader", responseTimeWeeks: 12 });
    const rows = assemble([openQuery(fast, 28), openQuery(slow, 28)], [fast, slow]);
    const set = agingSet(rows);
    expect(set.points).toHaveLength(2);
    /* the same 28 days is one whole window for one agency and a quarter of the other's */
    expect(set.points[0].fraction).toBeCloseTo(28 / 84);
    expect(set.points[1].fraction).toBeCloseTo(1);
    expect(set.pastWindow).toBe(1);
  });

  it("counts the open queries it cannot place rather than dropping them", () => {
    const stated = agent({ responseTimeWeeks: 8 });
    const silent = agent({ name: "No Window" });
    const set = agingSet(assemble([openQuery(stated, 10), openQuery(silent, 10)], [stated, silent]));
    expect(set.points).toHaveLength(1);
    expect(set.withoutStatedWindow).toBe(1);
  });

  it("treats a stated zero as no window at all", () => {
    /* Dividing by zero would put the query at infinity — the far end of the chart, permanently. */
    const zero = agent({ responseTimeWeeks: 0 });
    const rows = assemble([openQuery(zero, 10)], [zero]);
    expect(rows[0].windowWeeks).toBeNull();
    expect(agingSet(rows).withoutStatedWindow).toBe(1);
  });

  it("lists windows closing inside four weeks, soonest first, and counts the past ones apart", () => {
    const a = agent({ responseTimeWeeks: 8 }); // 56-day window
    const closingIn7 = openQuery(a, 49);
    const closingIn21 = openQuery(a, 35);
    const alreadyPast = openQuery(a, 70);
    const farOff = openQuery(a, 1);
    const set = horizonSet(assemble([closingIn7, closingIn21, alreadyPast, farOff], [a]), NOW);
    expect(set.soon.map((h) => h.daysLeft)).toEqual([7, 21]);
    expect(set.past).toBe(1);
  });
});

/* ────────────────────────────── fulls and responses ────────────────────────────── */

describe("fulls under consideration", () => {
  it("counts only a full that is actually out", () => {
    /* Requested is not yet sent; a Revise & Resubmit has come back. Neither is on a desk. */
    const a = agent();
    const sentOut = query({ agentId: a.id, status: QueryStatus.FULL_SENT, dateSent: daysAgo(120) });
    const justAsked = query({ agentId: a.id, status: QueryStatus.FULL_REQUESTED, dateSent: daysAgo(60) });
    const returned = query({ agentId: a.id, status: QueryStatus.REVISE_RESUBMIT, dateSent: daysAgo(300) });
    const acts = [
      rung(sentOut.id, QueryStatus.FULL_SENT, daysAgo(100)),
      rung(justAsked.id, QueryStatus.FULL_REQUESTED, daysAgo(40)),
      rung(returned.id, QueryStatus.FULL_SENT, daysAgo(280)),
      rung(returned.id, QueryStatus.REVISE_RESUBMIT, daysAgo(30)),
    ];
    const out = fullsUnderConsideration(buildRows([sentOut, justAsked, returned], acts, [a], NOW), NOW);
    expect(out).toHaveLength(1);
    expect(out[0].queryId).toBe(sentOut.id);
    expect(out[0].dwellDays).toBe(100);
  });
});

describe("latest responses", () => {
  it("is newest first and carries a StatusDot status for every row", () => {
    const a = agent();
    const parts = [
      answered(a, 100, 90, QueryStatus.REJECTED), // responded 10 days ago
      answered(a, 100, 40, QueryStatus.PARTIAL_REQUESTED), // responded 60 days ago
      answered(a, 30, 2, QueryStatus.OFFER), // responded 28 days ago
      openQuery(a, 5),
    ];
    const rows = latestResponses(assemble(parts, [a]));
    expect(rows).toHaveLength(3);
    const times = rows.map((r) => r.respondedMs);
    expect([...times].sort((x, y) => y - x)).toEqual(times);
    for (const r of rows) expect(Object.values(QueryStatus)).toContain(r.dotStatus);
  });

  it("honours the limit", () => {
    const a = agent();
    const parts = Array.from({ length: 12 }, (_, i) => answered(a, 200 - i, 5, QueryStatus.REJECTED));
    expect(latestResponses(assemble(parts, [a]))).toHaveLength(7);
    expect(latestResponses(assemble(parts, [a]), 3)).toHaveLength(3);
  });

  it("reads the response set from the canonical incoming rungs", () => {
    /* ⚠️ Asserted against `AGENT_RESPONSE_STATUSES` itself, so this page's idea of "the agent
       acted" cannot drift from `recomputeQuery`'s. */
    const a = agent();
    const parts = [...AGENT_RESPONSE_STATUSES].map((status, i) => answered(a, 100 + i, 5, status));
    const rows = assemble(parts, [a]);
    expect(rows.every((r) => r.respondedMs !== null)).toBe(true);
    expect(latestResponses(rows, 99)).toHaveLength(AGENT_RESPONSE_STATUSES.size);
  });
});

/* ────────────────────────────── empty input ────────────────────────────── */

describe("empty input", () => {
  it("returns empty structures from every selector without throwing", () => {
    const rows = buildRows([], [], [], NOW);
    expect(rows).toEqual([]);
    expect(() => {
      const s = statSet(rows);
      expect(s.sent).toBe(0);
      expect(s.ratePercent).toBeNull();
      expect(s.medianReplyDays).toBeNull();
      expect(funnelStages(rows).map((f) => f.count)).toEqual([0, 0, 0, 0]);
      expect(funnelTransitions(funnelStages(rows)).map((t) => t.label)).toEqual(["0 of 0", "0 of 0", "0 of 0"]);
      expect(statusBreakdown(rows)).toEqual([]);
      expect(eventMarks(rows)).toEqual([]);
      expect(replyBuckets(rows).every((b) => b.count === 0)).toBe(true);
      expect(agingSet(rows)).toEqual({ points: [], pastWindow: 0, withoutStatedWindow: 0 });
      expect(horizonSet(rows, NOW)).toEqual({ soon: [], past: 0 });
      expect(fullsUnderConsideration(rows, NOW)).toEqual([]);
      expect(latestResponses(rows)).toEqual([]);
      const series = monthlySeries(rows, "all", NOW);
      expect(series.months).toHaveLength(1);
      expect(series.sent).toEqual([0]);
      expect(series.omittedMonths).toBe(0);
    }).not.toThrow();
  });

  it("survives a query whose agent is not on file", () => {
    /* Imports can leave a dangling agentId; the page must render rather than crash on it. */
    const q = query({ agentId: "missing", dateSent: daysAgo(3) });
    const rows = buildRows([q], [], [], NOW);
    expect(rows[0].agentName).toBe("Agent not on file");
    expect(rows[0].windowWeeks).toBeNull();
    expect(() => statSet(rows)).not.toThrow();
  });
});
