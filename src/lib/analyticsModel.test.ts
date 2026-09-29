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
import { analyticsModel, stateBucket, figure, THIN_SAMPLE, DASH, ModelInput } from "./analyticsModel";
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
