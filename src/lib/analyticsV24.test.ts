/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * analyticsV24 — the seven sections' figures, run through the real `analyticsModel`. The main fixture is the
 * mock's sample: 27 sent; 7 asked to read more (1 offer, 4 still open, 2 said no; 2 asked for the full); 13 still
 * waiting (9 past their time, the longest Grant Hill at 42 wks); 7 ended without a request (3 by letter, 4 closed).
 * The calendar figures (months, moments) use fixtures of their own, dated by the calendar rather than by "days ago".
 */
import { describe, it, expect } from "vitest";
import { Activity, ActivityType, Agent, Query, QueryStatus } from "../types";
import { analyticsModel } from "./analyticsModel";
import {
  benchmark, buildV24, deskV24, heads, listWords, ringOf, QUESTIONS, replyTally, MAX_REPLY_DAYS, diffWords, expectedByNow, monthOf, monthlySends, moments, outcomes, perMonthWords, rateWords,
  replyKeeping, requestRate, span, spanParts, stillWaiting, verdictOf, BENCHMARKS_QUERYTRACKER,
} from "./analyticsV24";

const NOW = new Date(2026, 8, 29, 12, 0, 0).getTime();
const DAY = 86400000;
const ago = (n: number) => new Date(NOW - n * DAY).toISOString();
let seq = 0;
const nid = () => `w${++seq}`;
const agent = (over: Partial<Agent> = {}): Agent =>
  ({ id: nid(), userId: "u", name: "Alex Fenn", agency: `Agency ${seq}`, email: "", website: "", responseTimeWeeks: 6, ...over }) as Agent;
const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({ id: nid(), userId: "u", queryId, manuscriptId: "ms", activityType: ActivityType.STATUS_CHANGED, description: "", date, details: "", resultingStatus: status }) as unknown as Activity;
type Part = { q: Query; acts: Activity[] };
function walkAt(a: Agent, sentIso: string, steps: [QueryStatus, string][] = []): Part {
  const last = steps.length ? steps[steps.length - 1][0] : QueryStatus.QUERIED;
  const q = { id: nid(), userId: "u", manuscriptId: "ms", agentId: a.id, packageId: "", status: last, personalisationNotes: "", sendMethod: "Email", dateSent: sentIso } as unknown as Query;
  return { q, acts: [rung(q.id, QueryStatus.QUERIED, sentIso), ...steps.map(([s, d]) => rung(q.id, s, d))] };
}
const walk = (a: Agent, sentAgo: number, steps: [QueryStatus, number][] = []) => walkAt(a, ago(sentAgo), steps.map(([s, d]) => [s, ago(d)]));
const run = (parts: Part[], agents: Agent[], nowMs = NOW) =>
  analyticsModel({ queries: parts.map((p) => p.q), activities: parts.flatMap((p) => p.acts), agents, range: "all", nowMs });

const R = QueryStatus;
const W4 = agent({ responseTimeWeeks: 4 });
const W6 = agent({ responseTimeWeeks: 6, agency: "Ayres & Colt" });
const W8 = agent({ responseTimeWeeks: 8 });
const W10 = agent({ responseTimeWeeks: 10, agency: "The Hollis Agency" });
const GH = agent({ responseTimeWeeks: 6, agency: "Grant Hill" });
const agents = [W4, W6, W8, W10, GH];
const sample: Part[] = [
  /* 13 still waiting on a 6-week window: 4 inside, 9 past, the longest Grant Hill at 294 days (42 wks) */
  ...[10, 20, 30, 40, 60, 80, 100, 130, 160, 190, 220, 260].map((d) => walk(W6, d)),
  walk(GH, 294),
  /* 7 asked to read more */
  walk(W6, 20, [[R.PARTIAL_REQUESTED, 6]]),                                     // inside; 14 days; your move
  walk(W4, 210, [[R.FULL_REQUESTED, 189]]),                                     // 21 days; your move
  walk(W6, 220, [[R.PARTIAL_REQUESTED, 192], [R.PARTIAL_SENT, 190]]),           // 28 days
  walk(W8, 230, [[R.PARTIAL_REQUESTED, 195], [R.PARTIAL_SENT, 191]]),           // 35 days
  walk(W10, 280, [[R.FULL_REQUESTED, 231], [R.FULL_SENT, 230], [R.OFFER, 196]]), // 49 days; the offer
  walk(W8, 310, [[R.PARTIAL_REQUESTED, 240], [R.PARTIAL_SENT, 236], [R.REJECTED, 200]]), // 70 days, 14 over
  walk(W6, 340, [[R.PARTIAL_REQUESTED, 249], [R.REJECTED, 220]]),               // 91 days, 49 over
  /* 7 ended without a request: 3 by letter (2, 14 and 21 days over), 4 closed for silence */
  walk(W6, 300, [[R.REJECTED, 256]]),
  walk(W6, 320, [[R.REJECTED, 264]]),
  walk(W6, 330, [[R.REJECTED, 267]]),
  walk(W6, 360, [[R.NO_RESPONSE, 250]]),
  walk(W6, 400, [[R.NO_RESPONSE, 280]]),
  walk(W6, 410, [[R.NO_RESPONSE, 300]]),
  walk(W6, 420, [[R.NO_RESPONSE, 260]]),
];
const m = run(sample, agents);

describe("span — one formatter for every duration on the page", () => {
  it("days under a week, weeks rounded from there, singulars agreeing", () => {
    expect(span(0)).toBe("0 days");
    expect(span(1)).toBe("1 day");
    expect(span(6)).toBe("6 days");
    expect(span(7)).toBe("1 wk");
    expect(span(10)).toBe("1 wk");
    expect(span(11)).toBe("2 wks");
    expect(span(49)).toBe("7 wks");
    expect(spanParts(91)).toEqual({ n: 13, unit: "wks" });
    expect(spanParts(1)).toEqual({ n: 1, unit: "day" });
  });
  it("a difference that rounds to nothing is on time; never '0 wks'", () => {
    expect(diffWords(0)).toBe("on time");
    expect(diffWords(0.4)).toBe("on time");
    expect(diffWords(-2)).toBe("2 days");
    expect(diffWords(49)).toBe("7 wks");
  });
});

describe("outcomes — asked to read more, still waiting, ended", () => {
  const o = outcomes(m.items);
  it("is the mock's 7 · 13 · 7, and sums to the queries sent", () => {
    expect(o.sent).toBe(27);
    expect([o.asked, o.waiting, o.ended.total]).toEqual([7, 13, 7]);
    expect(o.asked + o.waiting + o.ended.total).toBe(o.sent);
    const ids = [...o.ids.asked, ...o.ids.waiting, ...o.ids.ended];
    expect(new Set(ids).size).toBe(27);
  });
  it("splits the ended 3 by letter · 4 closed · 0 withdrew", () => {
    expect(o.ended).toMatchObject({ letter: 3, closed: 4, withdrew: 0 });
  });
  it("splits the asked 1 offer · 4 open · 2 said no, with 2 asked for the full", () => {
    expect(o.of).toEqual({ offer: 1, open: 4, saidNo: 2, withdrew: 0 });
    expect(o.full).toBe(2);
  });
  it("a writer who withdrew after a request is counted apart, not as a no", () => {
    const p = walk(W6, 100, [[R.PARTIAL_REQUESTED, 80], [R.WITHDRAWN, 40]]);
    const oo = outcomes(run([p], agents).items);
    expect(oo.of).toEqual({ offer: 0, open: 0, saidNo: 0, withdrew: 1 });
    const w = outcomes(run([walk(W6, 100, [[R.WITHDRAWN, 40]])], agents).items);
    expect(w.ended).toMatchObject({ total: 1, withdrew: 1, letter: 0, closed: 0 });
  });
  it("the request rate is 26%, 7 of 27 — and a count, never a percentage, under five", () => {
    expect(requestRate(o)).toEqual({ pct: 26, n: 7, of: 27 });
    expect(rateWords(requestRate(o))).toBe("26%");
    const thin = outcomes(run(sample.slice(13, 15), agents).items);
    expect(requestRate(thin).pct).toBeNull();
    expect(rateWords(requestRate(thin))).toBe("2 of 2");
    expect(rateWords(requestRate(outcomes([])))).toBe("No queries");
    expect(rateWords(requestRate(outcomes(run(sample.slice(0, 2), agents).items)))).toBe("None of 2");
  });
});

describe("replyKeeping — did they reply when they said?", () => {
  const k = replyKeeping(m.items);
  it("kept 5, longer 5, every reply placed", () => {
    expect([k.kept.length, k.longer.length, k.placed, k.unplaced, k.replies]).toEqual([5, 5, 10, 0, 10]);
  });
  it("the overruns run 2 days to 7 wks, smallest first", () => {
    expect(k.longer.map((r) => diffWords(r.diffDays))).toEqual(["2 days", "2 wks", "2 wks", "3 wks", "7 wks"]);
  });
  it("typical 7 wks, quickest 2, longest 13", () => {
    expect([span(k.typical as number), span(k.quickest as number), span(k.longest as number)]).toEqual(["7 wks", "2 wks", "13 wks"]);
    expect(k.all).toEqual([14, 21, 28, 35, 44, 49, 56, 63, 70, 91]);
  });
  it("a reply with no stated time is counted apart, and still in the typical", () => {
    const none = agent({ responseTimeWeeks: undefined });
    const kk = replyKeeping(run([walk(none, 100, [[R.REJECTED, 90]]), walk(W6, 100, [[R.REJECTED, 50]])], [none, W6]).items);
    expect([kk.placed, kk.unplaced, kk.replies]).toEqual([1, 1, 2]);
    expect(kk.typical).toBe(30);
  });
});

describe("stillWaiting — who you are still waiting on", () => {
  const w = stillWaiting(m.items, NOW);
  it("13 waiting, 9 past, the longest Grant Hill at 42 wks", () => {
    expect([w.waiting.length, w.pastCount]).toEqual([13, 9]);
    expect(w.longest?.agency).toBe("Grant Hill");
    expect(span(w.longest?.waitedDays as number)).toBe("42 wks");
  });
  it("4 being read, 2 of them your move, dated from the request now open", () => {
    expect([w.reading.length, w.yourMove]).toEqual([4, 2]);
    const full = w.reading.find((r) => r.asked === "the full");
    expect(full?.sinceDays).toBe(189);
    expect(full?.yourMove).toBe(true);
  });
  it("an agency with no stated time is waited on without a 'past'", () => {
    const none = agent({ responseTimeWeeks: undefined });
    const ww = stillWaiting(run([walk(none, 100)], [none]).items, NOW);
    expect(ww.waiting[0]).toMatchObject({ saidWeeks: null, pastDays: null });
    expect([ww.pastCount, ww.noTime]).toEqual([0, 1]);
  });
});

describe("expectedByNow — what you could expect by now", () => {
  it("22 past = 9 replied · 4 closed · 9 overdue; 5 inside", () => {
    const e = expectedByNow(m.items, NOW);
    expect(e).toEqual({ past: 22, replied: 9, closed: 4, overdue: 9, inside: 5, noTime: 0, undated: 0 });
    expect(e.replied + e.closed + e.overdue).toBe(e.past);
    expect(e.past + e.inside + e.noTime + e.undated).toBe(27);
  });
  it("a query with no stated time is a fifth count, never folded into the others", () => {
    const none = agent({ responseTimeWeeks: undefined });
    expect(expectedByNow(run([walk(none, 300)], [none]).items, NOW)).toMatchObject({ past: 0, inside: 0, noTime: 1 });
  });
});

describe("monthlySends — how many, and when", () => {
  const at = (y: number, mo: number, d: number) => new Date(y, mo, d, 12).toISOString();
  const parts = [
    ...[3, 10, 17, 24].map((d) => walkAt(W6, at(2025, 10, d))),          // Nov 2025: 4
    walkAt(W6, at(2026, 0, 12)),
    ...[1, 2, 4, 6].map((d) => walkAt(W6, at(2026, 5, d))),              // Jun 2026: 4
    walkAt(W6, at(2026, 6, 3)), walkAt(W6, at(2026, 6, 20)),             // Jul: 2
    walkAt(W6, at(2026, 7, 9)), walkAt(W6, at(2026, 8, 1)),              // Aug, Sep: 1 each
  ];
  const mm = monthlySends(run(parts, agents).items, NOW);
  it("a column for every month from the first to now, the busiest Nov and Jun at 4", () => {
    expect(mm.months.length).toBe(11);
    expect(mm.busiest.map((x) => `${x.label} ${x.count}`)).toEqual(["Nov 4", "Jun 4"]);
    expect(mm.months.filter((x) => x.count === 0).map((x) => x.label)).toEqual(["Dec", "Feb", "Mar", "Apr", "May"]);
  });
  it("the last three months are this month and the two before it", () => {
    expect(mm.lastThree).toBe(4);
  });
  it("shows at most eighteen months, the latest", () => {
    const long = monthlySends(run([walkAt(W6, at(2024, 0, 5)), walkAt(W6, at(2026, 8, 1))], agents).items, NOW);
    expect(long.months.length).toBe(33);
    expect(long.shown.length).toBe(18);
    expect(long.shown[17].label).toBe("Sep");
  });
  it("none sent → no months", () => {
    expect(monthlySends([], NOW).months).toEqual([]);
  });
  it("words for a pace", () => {
    expect(perMonthWords(27, 11)).toBe("roughly two a month");
    expect(perMonthWords(3, 11)).toBe("less than one a month");
    expect(perMonthWords(0, 11)).toBe("none a month");
  });

  describe("moments", () => {
    const at2 = (y: number, mo: number, d: number) => new Date(y, mo, d, 12).toISOString();
    const first = walkAt(agent({ agency: "Bell Literary" }), at2(2025, 10, 4));
    const req = walkAt(agent({ agency: "Dunhill Literary" }), at2(2025, 10, 20), [[R.PARTIAL_REQUESTED, at2(2025, 10, 27)]]);
    const off = walkAt(agent({ agency: "The Hollis Agency" }), at2(2026, 0, 3), [[R.FULL_REQUESTED, at2(2026, 1, 2)], [R.FULL_SENT, at2(2026, 1, 3)], [R.OFFER, at2(2026, 2, 17)]]);
    const wk = [1, 2, 4, 6].map((d) => walkAt(W6, at2(2026, 5, d)));
    const mo = run([first, req, off, ...wk], [...agents, ...[first, req, off].map((p) => ({ id: p.q.agentId, userId: "u", name: "A", agency: "" }) as Agent)]);
    const list = moments(mo.items, monthlySends(mo.items, NOW), NOW);
    it("4 Nov 2025 · 27 Nov (23 days) · 17 Mar (133 days) · 1 to 7 Jun (4)", () => {
      expect(list.map((x) => x.key)).toEqual(["first", "request", "offer", "busiest"]);
      /* the mock's own dates; a date outside this year (2026) carries its year */
      expect(list.map((x) => x.date)).toEqual(["4 Nov 2025", "27 Nov 2025", "17 Mar", "1 to 7 Jun"]);
      expect(list.map((x) => x.days)).toEqual([0, 23, 133, 4]);
    });
    it("no request and no offer → only the first query", () => {
      expect(moments(run([first], agents).items, monthlySends([], NOW)).map((x) => x.key)).toEqual(["first"]);
    });
  });
});

describe("benchmark — you against most writers", () => {
  it("the anchors are QueryTracker's, fixed", () => {
    expect(BENCHMARKS_QUERYTRACKER).toEqual({ requestRate: 6, replyRate: 50, queriesSent: 44 });
  });
  it("ratio verdicts at their edges", () => {
    expect(verdictOf(9, 6)).toBe("Well above");
    expect(verdictOf(7.5, 6)).toBe("Above");
    expect(verdictOf(6, 6)).toBe("About the same");
    expect(verdictOf(4.8, 6)).toBe("About the same");
    expect(verdictOf(3, 6)).toBe("Below");
    expect(verdictOf(2.9, 6)).toBe("Well below");
  });
  it("the sample: 26% Well above, 41% About the same, 27 Still early", () => {
    const v = buildV24(m, NOW);
    expect(v.bench.map((b) => [b.key, b.you, b.verdict])).toEqual([["rate", 26, "Well above"], ["reply", 41, "About the same"], ["sent", 27, "Still early"]]);
  });
  it("too early under ten sent, and under five past their time", () => {
    const o = outcomes(run(sample.slice(13, 18), agents).items);
    const b = benchmark(o, { past: 4, replied: 4, closed: 0, overdue: 0, inside: 1, noTime: 0, undated: 0 });
    expect(b.map((x) => x.verdict)).toEqual(["Too early to say", "Too early to say", "Still early"]);
  });
  it("sent: about typical to 66, more than most past it", () => {
    const fake = (n: number) => ({ ...outcomes([]), sent: n });
    const e = { past: 0, replied: 0, closed: 0, overdue: 0, inside: 0, noTime: 0, undated: 0 };
    expect(benchmark(fake(44), e)[2].verdict).toBe("About typical");
    expect(benchmark(fake(66), e)[2].verdict).toBe("About typical");
    expect(benchmark(fake(67), e)[2].verdict).toBe("More than most");
  });
  it("month of querying, rounded, at least one", () => {
    expect(monthOf(NOW - 5 * DAY, NOW)).toBe(1);
    expect(monthOf(NOW - 420 * DAY, NOW)).toBe(14);
    expect(monthOf(null, NOW)).toBe(0);
  });
});

describe("deskV24 — the three desk cards", () => {
  const v = buildV24(m, NOW);
  const d = deskV24(m, v, NOW);
  it("Queries sent, Asked to read more, Your typical reply time — going to S3, S1, S4", () => {
    expect(d.map((c) => [c.title, c.sec])).toEqual([["Queries sent", 2], ["Asked to read more", 0], ["Your typical reply time", 3]]);
  });
  it("card 1 rows: the last three months and still waiting", () => {
    expect(d[0].rows.map((r) => [r.n, r.text])).toEqual([[v.monthly.lastThree, "in the last three months"], [13, "still waiting for a reply"]]);
  });
  it("card 2: 26%, 7 of 27; the whole book and the offer", () => {
    expect([d[1].figure, d[1].unit]).toEqual(["26%", "7 of 27"]);
    expect(d[1].rows.map((r) => [r.n, r.text])).toEqual([[2, "asked for the whole book"], [1, "offer so far"]]);
  });
  it("card 3: 7 weeks, 10 replies, quickest 2 wks, longest 13; a dot per reply", () => {
    expect([d[2].figure, d[2].unit, d[2].stamp]).toEqual(["7", "weeks", "10 replies"]);
    expect(d[2].rows.map((r) => [r.n, r.text, r.tone])).toEqual([[2, "wks, your quickest", "r"], [13, "wks, your longest", null]]);
    expect(d[2].chart).toMatchObject({ kind: "dots", typical: 47 });
    expect((d[2].chart as { dots: unknown[] }).dots.length).toBe(10);
    expect(d[2].axis).toEqual(["0", "Your replies, in weeks", "13 wks"]);
  });
  it("no replies: words, no rows, no axis", () => {
    const mm = run(sample.slice(0, 3), agents);
    const c = deskV24(mm, buildV24(mm, NOW), NOW)[2];
    expect([c.figure, c.unit, c.stamp, c.rows.length, c.axis.length]).toEqual(["No replies", null, null, 0, 0]);
  });
  it("the header ring: kept over placed, and nothing to say with none placed", () => {
    expect(ringOf(v.keeping)).toMatchObject({ inside: 5, dated: 10, pct: 50 });
    expect(ringOf(replyKeeping([]))).toEqual({ inside: 0, dated: 0, pct: null, share: 0 });
  });
});

describe("heads — seven questions, each answered in its first sentence", () => {
  const h = heads(buildV24(m, NOW));
  const text = (i: number) => h[i].answer.map((r) => r.t).join("");
  const bold = (i: number) => h[i].answer.filter((r) => r.b).map((r) => r.t);
  it("seven sections, the h2s the seven questions in order", () => {
    expect(h.map((x) => x.title)).toEqual([...QUESTIONS]);
    expect(h.length).toBe(7);
  });
  it("S1 on the sample", () => {
    expect(h[0].kicker).toBe("Your 27 queries");
    /* ⚠️ the mock says "Most" for 13 of 27; the prompt's own rule keeps "Most" for more than half */
    expect(text(0)).toBe("13 are still waiting for an answer. Of the agents who have replied so far, 7 asked to read more and 3 said no to the letter. One of the 7 has made an offer.");
    expect(bold(0)).toEqual(["7 asked to read more"]);
  });
  it("S1's opening is true for the data, and the offer sentence goes at zero", () => {
    const few = run(sample.slice(10, 20), agents);
    const t = heads(buildV24(few, NOW))[0].answer.map((r) => r.t).join("");
    expect(t.startsWith("3 are still waiting for an answer.")).toBe(true);
    const none = run(sample.slice(0, 3), agents);
    expect(heads(buildV24(none, NOW))[0].answer.map((r) => r.t).join("")).toBe("Most are still waiting for an answer. No agent has replied yet.");
  });
  it("S2 from the verdicts", () => {
    expect(h[1].kicker).toBe("you against other writers · month 14 of querying");
    expect(text(1)).toBe("Your request rate is well above what most writers see, and the silence is ordinary: roughly half of all queries never get a reply. First, what you could expect by now from your own agents; then how your figures compare with other writers.");
  });
  it("S4 names the overrun range, smallest to largest", () => {
    expect(h[3].kicker).toBe("10 replies so far");
    expect(text(3)).toBe("Most agents say in their guidelines how long they take to reply. Of the 10 who have replied to you, 5 kept to their time and 5 took longer, by between 2 days and 7 wks. Each row shows what the agent said next to what they actually took.");
  });
  it("S5 and S6 and S7", () => {
    expect(h[4].kicker).toBe("13 waiting · 4 being read");
    expect(bold(4)).toEqual(["13 queries", "4 agents"]);
    expect(h[5].kicker).toBe("from 27 queries");
    expect(h[6].kicker).toBe("27 queries · 10 replies");
  });
  it("lists read as English", () => {
    expect(listWords(["November"])).toBe("November");
    expect(listWords(["November", "June"])).toBe("November and June");
    expect(listWords(["May", "June", "July"])).toBe("May, June and July");
  });
});

/* ══════════ v24.1 Part B · a request is a reply ══════════ */
describe("replyTally — the Bethany Carter contradiction (27 queries, '3 replies', '10 of 27 asked')", () => {
  /** an imported query: a status and a send date, and no log at all */
  const imported = (a: Agent, sentAgo: number, status: QueryStatus): Part => {
    const q = { id: nid(), userId: "u", manuscriptId: "ms", agentId: a.id, packageId: "", status, personalisationNotes: "", sendMethod: "Email", dateSent: ago(sentAgo) } as unknown as Query;
    return { q, acts: [] };
  };
  const parts: Part[] = [
    ...Array.from({ length: 13 }, (_, i) => walk(W6, 20 + i * 5)),                                       // 13 waiting
    ...Array.from({ length: 6 }, (_, i) => imported(W6, 100 + i, R.PARTIAL_REQUESTED)),                  // 9 being read, undated
    ...Array.from({ length: 3 }, (_, i) => imported(W6, 120 + i, R.FULL_SENT)),
    imported(W6, 140, R.REJECTED),                                                                      // read, then said no — undated
    walk(W6, 900, [[R.REJECTED, 899]]),                                                                 // by letter, 1 day
    walk(W6, 1000, [[R.REJECTED, 132]]),                                                                // by letter, 868 days: a bad date
    walk(W6, 1010, [[R.REJECTED, 135]]),                                                                // by letter, 875 days: a bad date
    walk(W6, 400, [[R.NO_RESPONSE, 300]]),                                                              // closed
  ];
  const mm = run(parts, agents);
  const v = buildV24(mm, NOW);
  it("reproduces the contradiction on v24's count: dated first replies fewer than the asked", () => {
    expect(mm.sent).toBe(27);
    /* v24's header read model.replies — the DATED first replies only: 3, beside 9 asked to read more */
    expect([mm.replies, v.outcomes.asked]).toEqual([3, 9]);
    expect(mm.replies).toBeLessThan(v.outcomes.asked);
  });
  it("a request is a reply: replies = asked + said no to the letter, never fewer than the asked", () => {
    expect(v.tally.all).toBe(v.outcomes.asked + v.outcomes.ended.letter);
    expect(v.tally.all).toBeGreaterThanOrEqual(v.outcomes.asked);
  });
  it("a reply dated more than two years after its send is a bad date: listed, left out of the timings, counted as no date", () => {
    expect(v.tally.bad.map((b) => b.rawDays).sort((a, b) => a - b)).toEqual([868, 875]);
    expect(v.keeping.all).toEqual([1]);
    expect(v.keeping.longest).toBe(1);
    expect(v.tally.dated).toBe(1);
    expect(v.tally.noDate).toBe(v.tally.all - 1);
    expect(MAX_REPLY_DAYS).toBe(730);
  });
  it("a reply dated before its send is a bad date too", () => {
    const before = walk(W6, 50, []);
    before.acts.push(rung(before.q.id, R.REJECTED, ago(60)));
    before.q.status = R.REJECTED;
    const t = replyTally(run([before], agents).items);
    expect(t.bad.map((b) => b.rawDays)).toEqual([-10]);
    expect([t.all, t.dated, t.noDate]).toEqual([1, 0, 1]);
  });
  it("S4 says how many replies have no reply date", () => {
    const h = heads(v);
    expect(h[3].kicker).toBe(`${v.tally.all} replies so far`);
    expect(h[3].answer.map((r) => r.t).join("")).toContain(`replies have no reply date and are left out.`);
  });
});
