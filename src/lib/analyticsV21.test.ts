/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * analyticsV21 — the v21 page's derivations, run through the real `analyticsModel` over queries and log rungs
 * built the way the app builds them. The main fixture is the mock's sample: 27 sent, 10 replies, 13 still
 * waiting, 4 being read, 1 offer and 9 ended. Every branch has a fixture that enters it.
 */
import { describe, it, expect } from "vitest";
import { Activity, ActivityType, Agent, Query, QueryStatus } from "../types";
import { analyticsModel } from "./analyticsModel";
import {
  buildV21, desk, endings, insideShare, latestActivity, records, replyWhat, spanWords, standing, stepGaps,
  windowLede, windowReplies, wksShort, yourMove, STANDING_FILL,
} from "./analyticsV21";

const NOW = new Date(2026, 8, 29, 12, 0, 0).getTime();
const DAY = 86400000;
const ago = (n: number) => new Date(NOW - n * DAY).toISOString();
let seq = 0;
const nid = () => `v${++seq}`;
const agent = (over: Partial<Agent> = {}): Agent =>
  ({ id: nid(), userId: "u", name: "Alex Fenn", agency: `Agency ${seq}`, email: "", website: "", responseTimeWeeks: 6, ...over }) as Agent;
const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({ id: nid(), userId: "u", queryId, manuscriptId: "ms", activityType: ActivityType.STATUS_CHANGED, description: "", date, details: "", resultingStatus: status }) as unknown as Activity;
type Part = { q: Query; acts: Activity[] };
function walk(a: Agent, sentAgo: number, steps: [QueryStatus, number][] = []): Part {
  const last = steps.length ? steps[steps.length - 1][0] : QueryStatus.QUERIED;
  const q = { id: nid(), userId: "u", manuscriptId: "ms", agentId: a.id, packageId: "", status: last, personalisationNotes: "", sendMethod: "Email", dateSent: ago(sentAgo) } as unknown as Query;
  const acts = [rung(q.id, QueryStatus.QUERIED, ago(sentAgo)), ...steps.map(([s, d]) => rung(q.id, s, ago(d)))];
  return { q, acts };
}
const run = (parts: Part[], agents: Agent[]) =>
  analyticsModel({ queries: parts.map((p) => p.q), activities: parts.flatMap((p) => p.acts), agents, range: "all", nowMs: NOW });

/* ── the mock's sample ── */
const W4 = agent({ responseTimeWeeks: 4, agency: "Dunhill Literary", city: "London" });
const W6 = agent({ responseTimeWeeks: 6, agency: "Ayres & Colt" });
const W8 = agent({ responseTimeWeeks: 8, agency: "Bell Literary" });
const W10 = agent({ responseTimeWeeks: 10, agency: "The Hollis Agency", city: "London" });
const agents = [W4, W6, W8, W10];
const R = QueryStatus;
const sample: Part[] = [
  /* 13 still waiting */
  ...Array.from({ length: 13 }, (_, i) => walk(W6, 30 + i * 10)),
  /* 4 being read: two partials asked, two sent */
  walk(W4, 200, [[R.PARTIAL_REQUESTED, 186]]),                                   // inside, 14 days
  walk(W4, 210, [[R.FULL_REQUESTED, 189], [R.FULL_SENT, 187]]),                  // inside, 21 days
  walk(W6, 220, [[R.PARTIAL_REQUESTED, 192], [R.PARTIAL_SENT, 190]]),            // inside, 28 days
  walk(W8, 230, [[R.PARTIAL_REQUESTED, 195], [R.PARTIAL_SENT, 191]]),            // inside, 35 days
  /* 1 offer: partial → full → offer */
  walk(W10, 280, [[R.FULL_REQUESTED, 231], [R.FULL_SENT, 230], [R.OFFER, 196]]),  // inside, 49 days
  /* 5 passes after a reply, all after their window */
  walk(W6, 300, [[R.REJECTED, 256]]),                                            // 44 days, 2 over
  walk(W8, 310, [[R.PARTIAL_REQUESTED, 240], [R.PARTIAL_SENT, 236], [R.REJECTED, 200]]), // 70 days, 14 over
  walk(W6, 320, [[R.REJECTED, 264]]),                                            // 56 days, 14 over
  walk(W6, 330, [[R.REJECTED, 267]]),                                            // 63 days, 21 over
  walk(W6, 340, [[R.PARTIAL_REQUESTED, 249], [R.REJECTED, 220]]),                // 91 days, 49 over
  /* 3 closed for silence, 1 withdrawn */
  walk(W6, 400, [[R.NO_RESPONSE, 280]]),
  walk(W6, 410, [[R.NO_RESPONSE, 300]]),
  walk(W6, 420, [[R.NO_RESPONSE, 260]]),
  walk(W6, 260, [[R.WITHDRAWN, 250]]),
];
const m = run(sample, agents);

describe("standing — the one partition of the page", () => {
  const s = standing(m.items);
  it("is the mock's 13 / 4 / 1 / 9, and sums to the queries sent", () => {
    expect(m.sent).toBe(27);
    expect(m.replies).toBe(10);
    expect(s.map((r) => [r.key, r.count])).toEqual([["waiting", 13], ["reading", 4], ["offer", 1], ["ended", 9]]);
    expect(s.reduce((n, r) => n + r.count, 0)).toBe(m.sent);
    /* every query in exactly one bucket */
    const ids = s.flatMap((r) => r.ids);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(m.sent);
  });
  it("draws in the locked status fills", () => {
    expect(STANDING_FILL).toEqual({ waiting: "var(--state-queried)", reading: "var(--state-agent)", offer: "var(--state-offer)", ended: "var(--state-closed)" });
  });
  it("keeps zero rows, so a caller can hide them", () => {
    const one = run([walk(W6, 10)], agents);
    expect(standing(one.items).map((r) => r.count)).toEqual([1, 0, 0, 0]);
  });
});

describe("replies against the stated window", () => {
  const w = windowReplies(m.items);
  it("splits placed replies inside and after, and the two sum to the dated replies", () => {
    expect(w.inside.length).toBe(5);
    expect(w.after.length).toBe(5);
    expect(w.dated).toBe(10);
    expect(w.unplaced).toBe(0);
  });
  it("orders inside quickest first and after least over first", () => {
    expect(w.inside.map((r) => r.tookDays)).toEqual([14, 21, 28, 35, 49]);
    expect(w.after.map((r) => r.overDays)).toEqual([2, 14, 14, 21, 49]);
    expect(w.inside.every((r) => r.overDays === 0 && r.tookDays <= r.saidWeeks * 7)).toBe(true);
    expect(w.after.every((r) => r.overDays === r.tookDays - r.saidWeeks * 7)).toBe(true);
  });
  it("names what the reply was, and how a request ended", () => {
    expect(w.inside[0].what).toBe("Asked for a partial");
    expect(w.inside[1].what).toBe("Asked for the full");
    expect(w.inside[4].what).toBe("Asked for the full");
    expect(w.after[0].what).toBe("Passed");
    expect(w.after.find((r) => r.overDays === 49)?.what).toBe("Partial, then passed");
    expect(replyWhat(R.FULL_REQUESTED, R.NO_RESPONSE)).toBe("Full, then closed");
    expect(replyWhat(null, R.QUERIED)).toBe("Queried");
  });
  it("never places a reply from an agency that states no window, and counts it", () => {
    const N = agent({ responseTimeWeeks: undefined });
    const z = run([walk(N, 100, [[R.REJECTED, 60]]), walk(W6, 100, [[R.REJECTED, 80]])], [N, W6]);
    const zw = windowReplies(z.items);
    expect(zw.unplaced).toBe(1);
    expect(zw.dated).toBe(1);
    expect(insideShare(zw)).toMatchObject({ inside: 1, dated: 1, pct: 100 });
  });
  it("writes the lede from its own figures", () => {
    const l = windowLede(w);
    expect(`${l.lead}${l.bold}${l.rest}`).toBe("Agents say in their guidelines how long they take to reply. 5 of the 10 who have replied did it inside that time. The other 5 took longer, by between two days and seven weeks.");
    const allIn = windowLede({ ...w, after: [], dated: 5 });
    expect(allIn.rest).toBe(" who have replied did it inside that time.");
    const none = windowLede({ inside: [], after: [], unplaced: 0, dated: 0 });
    expect(none.bold).toBeNull();
  });
  it("states weeks rounded and under a week in days", () => {
    expect(wksShort(2)).toBe("2 days");
    expect(wksShort(44)).toBe("6 wks");
    expect(wksShort(7)).toBe("1 wk");
    expect(spanWords(49)).toBe("seven weeks");
    expect(spanWords(1)).toBe("one day");
  });
  it("the ring is inside over placed; nothing placed is null", () => {
    expect(insideShare(w)).toMatchObject({ inside: 5, dated: 10, pct: 50 });
    expect(insideShare({ inside: [], after: [], unplaced: 3, dated: 0 }).pct).toBeNull();
  });
});

describe("how long each step takes", () => {
  const g = stepGaps(m.items);
  it("measures the four steps in order, with whose turn each is", () => {
    expect(g.map((s) => s.key)).toEqual(["q-a", "a-s", "s-f", "f-o"]);
    expect(g.map((s) => s.turn)).toEqual(["agent", "you", "agent", "agent"]);
  });
  it("query → asked for more across every dated request", () => {
    const qa = g[0];
    expect(qa.n).toBe(7);
    expect(qa.min).toBe(14);
    expect(qa.max).toBe(91);
  });
  it("asked → you sent, only where something went after the ask", () => {
    expect(g[1].days.sort((a, b) => a - b)).toEqual([1, 2, 2, 4, 4]);
    expect(g[1].median).toBe(2);
  });
  it("full requested → offer is the one offer, and a step with nothing is empty", () => {
    expect(g[3].days).toEqual([35]);
    expect(g[2].n).toBe(0);
    expect(g[2].median).toBeNull();
  });
});

describe("how long until a query ended", () => {
  const e = endings(m.items);
  it("passes, silent closes and the offer, in weeks", () => {
    expect(e.pass.n).toBe(5);
    expect([e.pass.min, e.pass.max]).toEqual([6, 17]);
    expect(e.silent.n).toBe(3);
    expect(e.offer.n).toBe(1);
    expect(e.offer.median).toBe(12);
    expect(e.offer.agency).toBe("The Hollis Agency");
  });
  it("names no agency when there is more than one offer", () => {
    const two = run([walk(W10, 100, [[R.OFFER, 20]]), walk(W8, 90, [[R.OFFER, 10]])], agents);
    expect(endings(two.items).offer.agency).toBeNull();
  });
});

describe("the desk", () => {
  const d = desk(m, windowReplies(m.items), NOW);
  it("three cards, each scrolling to its section", () => {
    expect(d.map((c) => [c.key, c.sec])).toEqual([["sent", 1], ["rate", 2], ["wait", 3]]);
  });
  it("states the model's own figures", () => {
    expect(d[0].figure).toBe("27");
    expect(d[0].rows[1]).toMatchObject({ n: 13, text: "still waiting" });
    expect(d[1].figure).toBe(`${Math.round((m.requests / 27) * 100)}%`);
    expect(d[1].unit).toBe(`${m.requests} of 27`);
    expect(d[1].rows.map((r) => r.n)).toEqual([m.fulls, m.offers]);
    expect(d[2].figure).toBe(String(m.medianWaitDays));
    expect(d[2].rows.map((r) => r.n)).toEqual([5, 5]);
    expect(d[0].chart).toMatchObject({ kind: "bars" });
    expect((d[0].chart as { values: number[] }).values.length).toBe(13);
  });
  it("omits a stamp with nothing to compare", () => {
    /* nothing sent this month and no replies in either window */
    expect(d[0].stamp).toBe(null);
    expect(d[1].stamp).toBe(null);
    expect(d[2].stamp).toBe(null);
  });
  it("states a stamp when there is one", () => {
    const thisMonth = new Date(NOW).getDate() - 1;
    const s = run([
      walk(W6, thisMonth >= 1 ? 1 : 0), walk(W6, 0),
      walk(W6, 40, [[R.REJECTED, 20]]),          // reply in the last 90: 20 days
      walk(W6, 140, [[R.REJECTED, 110]]),        // reply in the 90 before: 30 days
    ], agents);
    const sd = desk(s, windowReplies(s.items), NOW);
    expect(sd[0].stamp).toBe("+2 this month");
    expect(sd[2].stamp).toBe("10 days quicker");
  });
  it("below twenty queries, the rate is a fraction", () => {
    const s = run([walk(W6, 40, [[R.PARTIAL_REQUESTED, 20]]), walk(W6, 30)], agents);
    const sd = desk(s, windowReplies(s.items), NOW);
    expect(sd[1].figure).toBe("1 of 2");
    expect(sd[1].unit).toBe("asked for more");
    expect(sd[1].population).toBe(2);
  });
});

describe("firsts and records", () => {
  const r = records(m, agents, NOW);
  it("features the first offer", () => {
    expect(r.featured?.label).toBe("First offer");
    expect(r.featured?.name).toBe("The Hollis Agency");
    expect(r.featured?.meta).toBe("LONDON · REPLIES IN ~10 WKS");
    expect(r.featured?.stages.map((s) => s.label)).toEqual(["Queried", "Full requested", "Full sent", "Offer"]);
    expect(r.featured?.open).toBe(true);
    expect(r.featured?.initials).toBe("HA");
  });
  it("falls back to the first full request, then the first request, then nothing", () => {
    const full = run([walk(W8, 100, [[R.PARTIAL_REQUESTED, 90]]), walk(W10, 100, [[R.FULL_REQUESTED, 60]])], agents);
    expect(records(full, agents, NOW).featured?.label).toBe("First full request");
    const req = run([walk(W8, 100, [[R.PARTIAL_REQUESTED, 90]])], agents);
    expect(records(req, agents, NOW).featured?.label).toBe("First request");
    const none = run([walk(W8, 100)], agents);
    expect(records(none, agents, NOW).featured).toBeNull();
  });
  it("has no longest full read, and omits rows the data cannot support", () => {
    expect(r.rows.map((x) => x.key)).toEqual(["quickest", "first-request", "busiest", "run", "quickest-pass"]);
    expect(JSON.stringify(r)).not.toMatch(/full read/i);
    const none = run([walk(W8, 100)], agents);
    expect(records(none, agents, NOW).rows.map((x) => x.key)).toEqual(["busiest", "run"]);
  });
  it("the quickest pass is the shortest send-to-pass", () => {
    expect(r.rows.find((x) => x.key === "quickest-pass")?.value).toBe("6 weeks");
  });
  it("the lede names the first offer and the days since the first query", () => {
    expect(r.lede.bold).toEqual(["The Hollis Agency", "224 days"]);
    expect(records(run([walk(W8, 100)], agents), agents, NOW).lede.bold).toEqual([]);
  });
});

describe("how things stand", () => {
  it("your move is a request owed or an offer to answer", () => {
    expect(yourMove(m.items)).toBe(1 + 1);
  });
  it("latest activity is the last dated stage", () => {
    const one = run([walk(W8, 100, [[R.PARTIAL_REQUESTED, 90], [R.PARTIAL_SENT, 80]])], agents);
    const act = latestActivity(one.items);
    expect(Object.values(act)[0]).toBe(NOW - 80 * DAY);
  });
  it("buildV21 carries every part", () => {
    const v = buildV21(m, agents, NOW);
    expect(Object.keys(v).sort()).toEqual(["activity", "desk", "endings", "inside", "records", "standing", "steps", "window", "yourMove"]);
  });
});
