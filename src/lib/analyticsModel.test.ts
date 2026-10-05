/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * analyticsModel — the figures the Analytics page states, derived and never stored.
 *
 * ⚠️ INPUTS ARE BUILT THE WAY THE APP BUILDS THEM: queries with statuses from the enum and the
 * activity log's rungs, run through the real `buildRows`. No row is written by hand.
 */
import { describe, it, expect } from "vitest";
import { Activity, ActivityType, Agent, ManuscriptVersion, Query, QueryStatus, SubmissionPackage } from "../types";
import { analyticsModel, stateBucket, figure, THIN_SAMPLE, DASH, ModelInput, dayMonth } from "./analyticsModel";
import { AnalyticsRange } from "./analytics";

const NOW = new Date(2026, 8, 29, 12, 0, 0).getTime();
const DAY = 86400000;
const ago = (n: number) => new Date(NOW - n * DAY).toISOString();

let seq = 0;
const nid = () => `m${++seq}`;

const agent = (over: Partial<Agent> = {}): Agent =>
  ({ id: nid(), userId: "u", name: "Alex Fenn", agency: "Fenn Literary", email: "", website: "", responseTimeWeeks: 8, ...over }) as Agent;

const query = (agentId: string, over: Partial<Query> = {}): Query =>
  ({ id: nid(), userId: "u", manuscriptId: "ms", agentId, packageId: "", status: QueryStatus.QUERIED,
     personalisationNotes: "", sendMethod: "Email", ...over }) as unknown as Query;

const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({ id: nid(), userId: "u", queryId, manuscriptId: "ms", activityType: ActivityType.STATUS_CHANGED,
     description: "", date, details: "", resultingStatus: status }) as unknown as Activity;

type Part = { q: Query; acts: Activity[] };

/** A query that walked the given rungs, each `[status, daysAgo]`; its status is the last rung's. */
function walk(a: Agent, sentAgo: number | null, steps: [QueryStatus, number][] = [], over: Partial<Query> = {}): Part {
  const last = steps.length ? steps[steps.length - 1][0] : QueryStatus.QUERIED;
  const q = query(a.id, { status: last, ...(sentAgo === null ? {} : { dateSent: ago(sentAgo) }), ...over });
  const acts = sentAgo === null ? [] : [rung(q.id, QueryStatus.QUERIED, ago(sentAgo))];
  for (const [s, d] of steps) acts.push(rung(q.id, s, ago(d)));
  return { q, acts };
}

const model = (parts: Part[], agents: Agent[], range: AnalyticsRange = "all", extra: Partial<ModelInput> = {}) =>
  analyticsModel({
    queries: parts.map((p) => p.q),
    activities: parts.flatMap((p) => p.acts),
    agents,
    range,
    nowMs: NOW,
    ...extra,
  });

describe("the state buckets", () => {
  it("files every status, and the five fills are the only state colours", () => {
    const seen = new Set(Object.values(QueryStatus).map(stateBucket));
    expect([...seen].sort()).toEqual(["closed", "offer", "queried", "requested", "sent"]);
    expect(stateBucket(QueryStatus.REVISE_RESUBMIT)).toBe("requested");
    expect(stateBucket(QueryStatus.RESUBMITTED)).toBe("sent");
    expect(stateBucket(QueryStatus.SIGNED)).toBe("offer");
    expect(stateBucket(QueryStatus.NO_RESPONSE)).toBe("closed");
  });
});

describe("the journey", () => {
  const A = agent();
  /* 10 queries: 4 still out, 3 rejected cold, 1 partial then rejected, 1 straight-to-full being read,
     1 partial → full → offer */
  const parts: Part[] = [
    walk(A, 60), walk(A, 50), walk(A, 40), walk(A, 30),
    walk(A, 90, [[QueryStatus.REJECTED, 80]]),
    walk(A, 88, [[QueryStatus.REJECTED, 70]]),
    walk(A, 86, [[QueryStatus.REJECTED, 60]]),
    walk(A, 84, [[QueryStatus.PARTIAL_REQUESTED, 70], [QueryStatus.PARTIAL_SENT, 68], [QueryStatus.REJECTED, 40]]),
    walk(A, 82, [[QueryStatus.FULL_REQUESTED, 60], [QueryStatus.FULL_SENT, 58]]),
    walk(A, 80, [[QueryStatus.PARTIAL_REQUESTED, 70], [QueryStatus.PARTIAL_SENT, 66], [QueryStatus.FULL_REQUESTED, 50],
      [QueryStatus.FULL_SENT, 48], [QueryStatus.OFFER, 10]]),
  ];
  const m = model(parts, [A]);

  it("counts each rung from history — a closed query keeps the rungs it reached", () => {
    expect(m.journey.stages.map((s) => s.count)).toEqual([10, 3, 2, 1]);
    expect(m.sent).toBe(10);
    expect(m.requests).toBe(3);
    expect(m.fulls).toBe(2);
    expect(m.offers).toBe(1);
    expect(m.stillOut).toBe(4);
  });

  it("states the three transitions, as fractions below the guard", () => {
    expect(m.journey.links.map((l) => l.label)).toEqual(["3 of 10", "2 of 3", "1 of 2"]);
  });

  it("tells a partial apart from a straight-to-full request", () => {
    expect(m.journey.stages[1].description).toBe("Asked to read more — 2 partial, 1 straight to full");
  });

  it("splits each stage by where its queries stand today, and each split sums to its stage", () => {
    for (const s of m.journey.stages) {
      expect(s.split.reduce((n, r) => n + r.count, 0)).toBe(s.count);
      expect(s.split.every((r) => r.count > 0)).toBe(true);
    }
    expect(m.journey.stages[0].split.map((r) => [r.bucket, r.count])).toEqual([
      ["queried", 4], ["sent", 1], ["offer", 1], ["closed", 4],
    ]);
  });

  it("a stage with nothing in it says so and draws no rate", () => {
    const B = agent();
    const empty = model([walk(B, 10)], [B]);
    expect(empty.journey.stages[1].count).toBe(0);
    expect(empty.journey.stages[1].split).toEqual([]);
    expect(empty.journey.links[1].label).toBe(DASH);
    /* a zero over a real population is a count; a stage after an empty one has nothing to count */
    expect(empty.journey.stages.map((s) => s.display)).toEqual(["1", "0", DASH, DASH]);
  });

  it("the percentage appears once the denominator can carry one", () => {
    const C = agent();
    const many: Part[] = [];
    for (let i = 0; i < 20; i++) many.push(walk(C, 100 + i, i < 5 ? [[QueryStatus.PARTIAL_REQUESTED, 50]] : []));
    expect(model(many, [C]).journey.links[0].label).toBe("25%");
  });
});

describe("median wait", () => {
  const A = agent();
  const answered = (sentAgo: number, after: number) => walk(A, sentAgo, [[QueryStatus.REJECTED, sentAgo - after]]);

  it("with no replies, is a dash and says what is missing — never 0", () => {
    const m = model([walk(A, 30), walk(A, 20)], [A]);
    expect(m.facts.medianWait.value).toBe(DASH);
    expect(m.facts.medianWait.note).toBe("no dated replies yet");
    expect(m.facts.medianWait.chip).toBeNull();
  });

  it("with one reply, states it and its population", () => {
    const m = model([answered(100, 30), walk(A, 20)], [A]);
    expect(m.facts.medianWait.value).toBe("30 days");
    expect(m.facts.medianWait.note).toBe("From 1 dated reply");
    expect(m.facts.medianWait.chip).toBe("Rests on 1 query");
  });

  it("with two replies, takes the middle of the pair", () => {
    const m = model([answered(100, 20), answered(100, 40)], [A]);
    expect(m.facts.medianWait.value).toBe("30 days");
    expect(m.facts.medianWait.chip).toBe("Rests on 2 queries");
  });

  it("with twelve replies, is the median, not the mean, and carries no chip", () => {
    const waits = [5, 10, 12, 20, 25, 30, 40, 45, 50, 60, 70, 700];
    const m = model(waits.map((w) => answered(800, w)), [A]);
    expect(m.facts.medianWait.value).toBe("35 days");
    expect(m.facts.medianWait.chip).toBeNull();
    expect(m.replies).toBe(12);
  });
});

describe("a reply with no rung in the log", () => {
  it("⚠️ falls back to the document's dated incoming rung, so the fact line and the story agree", () => {
    const A = agent();
    const q = query(A.id, { status: QueryStatus.FULL_REQUESTED, dateSent: ago(100), fullRequestedDate: ago(60) });
    const m = model([{ q, acts: [rung(q.id, QueryStatus.QUERIED, ago(100))] }], [A]);
    expect(m.facts.medianWait.value).toBe("40 days");
    expect(m.reply.rows[0].bucket).toBe("requested");
    expect(m.story.events.find((e) => e.kind === "request")!.gap).toBe("40 days after the first query");
  });
  it("never reads a legacy stamped responseReceivedAt as a reply", () => {
    const A = agent();
    const q = query(A.id, { status: QueryStatus.QUERIED, dateSent: ago(100), responseReceivedAt: ago(100) } as Partial<Query>);
    const m = model([{ q, acts: [rung(q.id, QueryStatus.QUERIED, ago(100))] }], [A]);
    expect(m.facts.medianWait.value).toBe(DASH);
  });
});

describe("stage to stage", () => {
  const A = agent();

  it("measures each gap only where both ends are dated", () => {
    const parts = [
      walk(A, 100, [[QueryStatus.PARTIAL_REQUESTED, 90], [QueryStatus.PARTIAL_SENT, 88], [QueryStatus.FULL_REQUESTED, 60],
        [QueryStatus.FULL_SENT, 58], [QueryStatus.OFFER, 18]]),
    ];
    const m = model(parts, [A]);
    const by = Object.fromEntries(m.stages.rows.map((r) => [r.key, r.medianDays]));
    expect(by).toEqual({ "q-r": 10, "r-s": 2, "s-f": 28, "f-o": 40 });
  });

  it("⚠️ a missing intermediate date drops that query from the gap it spans, and from nothing else", () => {
    /* requested with no dated send of the partial: q→r measured, r→s and s→f not */
    const parts = [walk(A, 100, [[QueryStatus.PARTIAL_REQUESTED, 80], [QueryStatus.FULL_REQUESTED, 50]])];
    const m = model(parts, [A]);
    const by = Object.fromEntries(m.stages.rows.map((r) => [r.key, r]));
    expect(by["q-r"].days).toEqual([20]);
    expect(by["r-s"].days).toEqual([]);
    expect(by["s-f"].days).toEqual([]);
    expect(by["s-f"].medianDays).toBeNull();
    expect(by["s-f"].missing).toBe("no dated partial-then-full yet");
  });

  it("⚠️ an undated stage is never guessed — a query with no send date measures nothing from its send", () => {
    const q = query(A.id, { status: QueryStatus.PARTIAL_REQUESTED });
    const m = model([{ q, acts: [rung(q.id, QueryStatus.PARTIAL_REQUESTED, ago(5))] }], [A]);
    expect(m.stages.rows.find((r) => r.key === "q-r")!.days).toEqual([]);
    expect(m.undated).toBe(1);
  });

  it("sorts fastest to slowest, with the empty rows last, and chips a row under five", () => {
    const parts = [
      walk(A, 100, [[QueryStatus.PARTIAL_REQUESTED, 90], [QueryStatus.PARTIAL_SENT, 88]]),
    ];
    const m = model(parts, [A]);
    expect(m.stages.rows.map((r) => r.key)).toEqual(["r-s", "q-r", "s-f", "f-o"]);
    expect(m.stages.rows[0].chip).toBe("Rests on 1 query");
  });
});

describe("weeks to an ending", () => {
  const A = agent();
  it("puts each closed query in its outcome's lane with the close rung's own date", () => {
    const parts = [
      walk(A, 100, [[QueryStatus.REJECTED, 86]]),
      walk(A, 100, [[QueryStatus.REJECTED, 72]]),
      walk(A, 100, [[QueryStatus.NO_RESPONSE, 44]]),
      walk(A, 100, [[QueryStatus.WITHDRAWN, 30]]),
      walk(A, 100, [[QueryStatus.FULL_REQUESTED, 60], [QueryStatus.OFFER, 16]]),
    ];
    const m = model(parts, [A]);
    const by = Object.fromEntries(m.endings.lanes.map((l) => [l.key, l]));
    expect(by.rejected.weeks).toEqual([2, 4]);
    expect(by.rejected.medianWeeks).toBe(3);
    expect(by.noresponse.weeks).toEqual([8]);
    expect(by.withdrawn.weeks).toEqual([10]);
    expect(by.offer.weeks).toEqual([12]);
    expect(by.offer.bucket).toBe("offer");
    expect(m.endings.closed).toBe(5);
  });
  it("⚠️ a close dated only by a lastStatusChange equal to the send date is undated, not a 0-week ending", () => {
    const q = query(A.id, { status: QueryStatus.NO_RESPONSE, dateSent: ago(50), lastStatusChange: ago(50) });
    const m = model([{ q, acts: [rung(q.id, QueryStatus.QUERIED, ago(50))] }], [A]);
    expect(m.endings.lanes.find((l) => l.key === "noresponse")!.weeks).toEqual([]);
    expect(m.endings.undatedClosed).toBe(1);
  });
  it("with nothing closed, is a dash", () => {
    const m = model([walk(A, 10)], [A]);
    expect(m.endings.figure.value).toBe(DASH);
    expect(m.endings.figure.note).toBe("no query has reached an ending yet");
  });
});

describe("the time range", () => {
  const A = agent();
  const parts = [walk(A, 300), walk(A, 150), walk(A, 60), walk(A, 20), walk(A, null)];

  it("all time counts every query, the undated one included", () => {
    const m = model(parts, [A], "all");
    expect(m.sent).toBe(5);
    expect(m.undated).toBe(1);
  });
  it("last six months keeps the three sent inside it", () => {
    expect(model(parts, [A], "6m").sent).toBe(3);
  });
  it("last three months keeps the two sent inside it", () => {
    const m = model(parts, [A], "3m");
    expect(m.sent).toBe(2);
    /* the whole page follows it — volume starts at the window, the story at its first letter */
    expect(m.volume.months[0].key).toBeLessThanOrEqual(m.volume.months[m.volume.months.length - 1].key);
    expect(m.volume.months.length).toBeLessThanOrEqual(4);
    expect(m.story.events[0].what).toBe("First query in this period");
  });
  it("⚠️ a manuscript with queries but none in range is not a manuscript with no queries", () => {
    const m = model([walk(A, 300)], [A], "3m");
    expect(m.sent).toBe(0);
    expect(m.total).toBe(1);
  });
});

describe("the thin-sample rule", () => {
  it("at population 0, an em dash and what is missing", () => {
    expect(figure(0, () => "x", "n", "none yet")).toEqual({ value: DASH, note: "none yet", population: 0, chip: null });
  });
  it("at population 1, the value and a chip stating it", () => {
    expect(figure(1, () => "x", "n", "none")).toEqual({ value: "x", note: "n", population: 1, chip: "Rests on 1 query" });
  });
  it(`at population ${THIN_SAMPLE}, the value and no chip`, () => {
    expect(figure(5, () => "x", "n", "none").chip).toBeNull();
  });
  it("the request rate on nothing sent is a dash, never 0%", () => {
    const m = model([], []);
    expect(m.facts.requestRate.value).toBe(DASH);
    expect(m.facts.stillOut.value).toBe(DASH);
    expect(m.facts.busiestMonth.value).toBe(DASH);
  });
});

describe("volume", () => {
  const A = agent();
  it("stacks each month by where its queries stand today, and the stacks sum to the sends", () => {
    const parts = [walk(A, 40), walk(A, 38, [[QueryStatus.REJECTED, 10]]), walk(A, 5), walk(A, null)];
    const m = model(parts, [A]);
    const total = m.volume.months.reduce((n, mo) => n + mo.total, 0);
    expect(total).toBe(3);
    expect(m.volume.undated).toBe(1);
    for (const mo of m.volume.months) {
      expect(Object.values(mo.counts).reduce((a, b) => a + b, 0)).toBe(mo.total);
    }
  });
});

describe("volume over a long history", () => {
  it("draws at most 24 months and counts the earlier ones", () => {
    const A = agent();
    const parts = [walk(A, 1000), walk(A, 900), walk(A, 20)];
    const m = model(parts, [A]);
    expect(m.volume.months.length).toBe(24);
    expect(m.volume.omittedQueries).toBe(2);
    expect(m.volume.omittedMonths).toBeGreaterThan(0);
  });
});

describe("the story so far", () => {
  const A = agent({ name: "Ada Ayres", agency: "Ayres & Colt" });
  const B = agent({ name: "Bo Hollis", agency: "The Hollis Agency" });

  it("derives the dated events in order and ends on today", () => {
    const parts = [
      walk(A, 200),
      walk(B, 190, [[QueryStatus.PARTIAL_REQUESTED, 150], [QueryStatus.PARTIAL_SENT, 148], [QueryStatus.FULL_REQUESTED, 100],
        [QueryStatus.FULL_SENT, 98], [QueryStatus.OFFER, 40]]),
      walk(A, 60), walk(A, 58),
    ];
    const m = model(parts, [A, B]);
    const kinds = m.story.events.map((e) => e.kind);
    expect(kinds[0]).toBe("first");
    expect(kinds[kinds.length - 1]).toBe("today");
    expect(kinds).toContain("request");
    expect(kinds).toContain("full");
    expect(kinds).toContain("offer");
    const dated = m.story.events.filter((e) => e.kind !== "today").map((e) => e.atMs);
    expect([...dated].sort((a, b) => a - b)).toEqual(dated);
    const req = m.story.events.find((e) => e.kind === "request")!;
    expect(req.gap).toBe("50 days after the first query");
    expect(req.who).toBe("Bo Hollis · The Hollis Agency — partial");
    expect(m.story.events.find((e) => e.kind === "offer")!.who).toContain("still open");
    expect(m.story.foot).toBe("200 days of querying this book, from the first letter to today.");
  });

  it("names a query-letter change, and only a change", () => {
    const pk1 = { id: "p1", queryLetterVersionId: "v1" } as SubmissionPackage;
    const pk2 = { id: "p2", queryLetterVersionId: "v2" } as SubmissionPackage;
    const vs = [{ id: "v1", versionName: "QL v1" }, { id: "v2", versionName: "QL v3" }] as ManuscriptVersion[];
    const parts = [
      walk(A, 100, [], { packageId: "p1" }),
      walk(A, 90, [], { packageId: "p1" }),
      walk(A, 50, [], { packageId: "p2" }),
      walk(A, 40, [], { sentPackageId: "p2", packageId: "p1" }),
    ];
    const m = model(parts, [A], "all", { packages: [pk1, pk2], versions: vs });
    const letters = m.story.events.filter((e) => e.kind === "letter");
    expect(letters).toHaveLength(1);
    expect(letters[0].what).toBe("A new query letter: QL v3");
    expect(letters[0].who).toBe("Used for every query since");
  });

  it("has no events and no foot for a manuscript with no queries", () => {
    const m = model([], []);
    expect(m.story.events).toEqual([]);
    expect(m.story.foot).toBeNull();
  });
});

describe("no appraisal", () => {
  it("nothing the model writes names a verdict", () => {
    const A = agent();
    const parts = [walk(A, 100, [[QueryStatus.REJECTED, 20]]), walk(A, 300), walk(A, 90, [[QueryStatus.OFFER, 10]])];
    const text = JSON.stringify(model(parts, [A])).toLowerCase();
    for (const w of ["overdue", "late", "great", "good", "bad", "poor", "strong", "weak", "average rate", "score:", "benchmark"]) {
      expect(text).not.toMatch(new RegExp(`\\b${w}\\b`));
    }
  });
});

describe("v17 — the figures the page states", () => {
  const A = agent({ name: "Ada Ayres", agency: "Ayres & Colt", responseTimeWeeks: 6 });
  const B = agent({ name: "Bo Feld", agency: "Feld Agency", responseTimeWeeks: 6 });
  /* 10 queries: 3 still out, 2 passed on the letter, 1 closed for silence, 1 withdrawn,
     1 requested-not-sent, 1 being read (full), 1 partial → full → offer */
  const parts: Part[] = [
    walk(A, 40), walk(A, 35), walk(A, 30),
    walk(B, 200, [[QueryStatus.REJECTED, 180]]),
    walk(B, 190, [[QueryStatus.REJECTED, 100]]),
    walk(A, 180, [[QueryStatus.NO_RESPONSE, 60]]),
    walk(A, 170, [[QueryStatus.WITHDRAWN, 90]]),
    walk(B, 150, [[QueryStatus.PARTIAL_REQUESTED, 120]]),
    walk(A, 140, [[QueryStatus.FULL_REQUESTED, 110], [QueryStatus.FULL_SENT, 108]]),
    walk(B, 130, [[QueryStatus.PARTIAL_REQUESTED, 120], [QueryStatus.PARTIAL_SENT, 118], [QueryStatus.FULL_REQUESTED, 90],
      [QueryStatus.FULL_SENT, 88], [QueryStatus.OFFER, 20]]),
  ];
  const m = model(parts, [A, B], "all", { title: "Murphy's Day Out" });
  const v = m.v17;

  it("the funnel's counts and its three \"went on\" rates", () => {
    expect(v.funnel.rows.map((r) => r.count)).toEqual([10, 3, 2, 1]);
    expect(v.funnel.rows.map((r) => r.display)).toEqual(["10", "3", "2", "1"]);
    expect(v.funnel.rows.map((r) => r.went)).toEqual([null, "3 of 10 went on", "2 of 3 went on", "1 of 2 went on"]);
    expect(v.funnel.rows[1].note).toBe("3 still waiting · 4 closed");
    expect(v.funnel.rows[2].note).toBe("1 did not, so far");
    expect(v.funnel.rows.map((r) => r.population)).toEqual([10, 10, 3, 2]);
    expect(v.banners[0].title).toBe("Where the 10 queries got to");
  });

  it("⚠️ both breakdowns of what became of the queries add up to their totals", () => {
    expect(v.rate.all.map((s) => [s.key, s.count])).toEqual([["asked", 3], ["waiting", 3], ["passed", 2], ["silence", 1], ["withdrawn", 1]]);
    expect(v.rate.all.reduce((n, s) => n + s.count, 0)).toBe(m.sent);
    expect(v.rate.req.map((s) => [s.key, s.count])).toEqual([["offer", 1], ["reading", 1], ["owed", 1]]);
    expect(v.rate.req.reduce((n, s) => n + s.count, 0)).toBe(m.requests);
    expect(v.rate.allTitle).toBe("What happened to the 10");
    expect(v.rate.reqTitle).toBe("What happened to the 3 requests");
  });

  it("median wait with 0, 1, 2 and 10 replies", () => {
    const C = agent();
    const at = (waits: number[]) => model(waits.map((w) => walk(C, 800, [[QueryStatus.REJECTED, 800 - w]])), [C]).v17.reply.readings[0];
    expect(at([])).toEqual({ value: "No replies yet", label: "so no median wait", population: 0 });
    expect(at([12]).value).toBe("12 days");
    expect(at([12]).label).toBe("median wait for a reply, from 1 reply");
    expect(at([10, 20]).value).toBe("15 days");
    expect(at([5, 10, 12, 20, 25, 30, 40, 45, 50, 700]).value).toBe("28 days"); /* 25 and 30, rounded */
    expect(at([5, 10, 12, 20, 25, 30, 40, 45, 50, 700]).label).toBe("median wait for a reply");
  });

  it("a stage gap skips a query whose intermediate date is missing, and a stage with no date says so", () => {
    const C = agent();
    /* a full sent with no request on record: the requested → sent gap has nothing to measure from */
    const p = model([
      walk(C, 100, [[QueryStatus.PARTIAL_REQUESTED, 80], [QueryStatus.PARTIAL_SENT, 76]]),
      (() => { const q = query(C.id, { status: QueryStatus.FULL_SENT, dateSent: ago(90), fullSentDate: ago(50) }); return { q, acts: [rung(q.id, QueryStatus.QUERIED, ago(90))] }; })(),
    ], [C]).v17;
    const rs = p.waits.gaps.find((g) => g.key === "r-s")!;
    expect(rs.days).toEqual([4]);
    const fo = p.waits.gaps.find((g) => g.key === "f-o")!;
    expect(fo.days).toEqual([]);
    expect(fo.medianDays).toBeNull();
    expect(p.waits.readings[2]).toEqual({ value: "Not yet", label: "no dated pass yet", population: 0 });
  });

  it("weeks to an ending, by outcome", () => {
    const pts = v.waits.points;
    expect(pts.rejected.map((p) => p.weeks).sort((a, b) => a - b)).toEqual([2.9, 12.9]);
    expect(pts.noresponse.map((p) => p.weeks)).toEqual([17.1]);
    expect(pts.withdrawn.map((p) => p.weeks)).toEqual([11.4]);
    expect(pts.offer.map((p) => p.weeks)).toEqual([15.7]);
    expect(v.waits.readings[2].value).toBe("8 weeks"); /* the median of 2.9 and 12.9 */
  });

  it("the records, with ties going to the earliest", () => {
    const rec = Object.fromEntries(v.records.map((r) => [r.key, r]));
    expect(v.records.map((r) => r.key)).toEqual(["quickest", "first-request", "first-offer", "busiest", "run", "full-read"]);
    expect(rec.quickest.value).toBe("10 days"); /* 130 → 120, and 150 → 120 is 30 */
    expect(rec["first-request"].value).toBe(dayMonth(NOW - 120 * DAY)); /* two rungs that day; either is the first */
    expect(rec["first-request"].who).toBe("80 days after your first query"); /* 200 → 120 */
    expect(rec["first-offer"].aside).toBe("still open");
    /* the full out 108 days and still being read outlasts the one read for 68 days to an offer */
    expect(rec["full-read"].value).toBe("108 days");
    expect(rec["full-read"].who).toBe("Ayres & Colt, still reading");
    /* two replies on the same day after the same wait: the one SENT first wins */
    const C = agent({ name: "Cy Cole", agency: "Cole & Co" }), D = agent({ name: "Di Dunn", agency: "Dunn Lit" });
    const tie = model([walk(D, 50, [[QueryStatus.REJECTED, 40]]), walk(C, 60, [[QueryStatus.REJECTED, 50]])], [C, D]).v17;
    expect(tie.records[0].who).toBe("Cy Cole · Cole & Co");
  });

  it("an empty campaign: every record reads Not yet, nothing reads 0", () => {
    const e = model([], []).v17;
    expect(e.records.every((r) => r.value === "Not yet" && r.empty)).toBe(true);
    for (const r of [...e.log.readings, ...e.rate.readings, ...e.reply.readings, ...e.waits.readings, ...e.lanes.readings, ...e.overTime.readings]) {
      expect(r.value, r.label).not.toMatch(/^(0|0%|—)$/);
      expect(r.label.length).toBeGreaterThan(0);
    }
    for (const g of e.glance) for (const s of [g.all, g.d90]) expect(s.value, g.key).not.toMatch(/^(0|0%|—)$/);
  });

  it("the running totals at three dates", () => {
    const o = v.overTime;
    const at = (daysAgo: number) => { const t = NOW - daysAgo * DAY; const c = (xs: number[]) => xs.filter((x) => x <= t).length; return [c(o.sent), c(o.requests), c(o.ended)]; };
    expect(at(195)).toEqual([1, 0, 0]);
    expect(at(100)).toEqual([7, 3, 2]);
    expect(at(0)).toEqual([10, 3, 4]);
  });

  it("the 90-day and previous-90-day split at its boundary", () => {
    const C = agent();
    const g = model([walk(C, 90), walk(C, 89), walk(C, 180), walk(C, 181)], [C]).v17.glance[0];
    /* the windows are (now − 90 days, now] and (now − 180 days, now − 90 days]: exactly 90 days ago belongs
       to the 90 BEFORE, and exactly 180 days ago is outside both */
    expect(g.d90.value).toBe("1");
    expect(g.compare.bold + g.compare.rest).toBe("1 in the last 90 days, 1 in the 90 before");
    expect(g.all.value).toBe("4");
  });

  it("the thin-sample rule at populations of 0, 1 and 5", () => {
    const C = agent();
    const zero = model([], [C]).v17;
    expect(zero.glance.find((x) => x.key === "rate")!.all).toEqual({ value: "No queries", unit: null, population: 0 });
    const one = model([walk(C, 30)], [C]).v17;
    expect(one.glance.find((x) => x.key === "rate")!.all).toEqual({ value: "None of 1", unit: null, population: 1 });
    expect(one.rate.readings[0].value).toBe("None of 1");
    expect(one.funnel.rows.map((r) => r.display)).toEqual(["1", "None", "None", "None"]);
    expect(one.funnel.rows.map((r) => r.went)).toEqual([null, "none of 1 went on", null, null]);
    const five = model([0, 1, 2, 3, 4].map((i) => walk(C, 100 + i, [[QueryStatus.REJECTED, 90]])), [C]).v17;
    expect(five.reply.readings[0].label).toBe("median wait for a reply"); /* five states no population */
    const four = model([0, 1, 2, 3].map((i) => walk(C, 100 + i, [[QueryStatus.REJECTED, 90]])), [C]).v17;
    expect(four.reply.readings[0].label).toBe("median wait for a reply, from 4 replies");
  });

  it("the training log: one dot per dated query on its day, and exactly one busiest week", () => {
    const dots = v.log.weeks.flatMap((w) => w.days.flat());
    expect(dots).toHaveLength(10);
    expect(v.log.weeks.reduce((n, w) => n + w.count, 0)).toBe(10);
    expect(v.log.busiest).not.toBeNull();
    const C = agent();
    /* two weeks of two: the EARLIER is the busiest — week 0, the week of the first send, not the later tie */
    const t = model([walk(C, 70), walk(C, 70), walk(C, 21), walk(C, 21)], [C]).v17;
    expect(t.log.weeks.filter((w) => w.count === 2)).toHaveLength(2);
    expect(t.log.busiest).toBe(0);
  });
});
