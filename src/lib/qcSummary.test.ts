/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcSummary — the Query Centre's derivations. Widths are asserted against KNOWN DATES (a count-only
 * test is not a lock), every rule with branches carries a tally proving each branch ran, and the
 * partitions are asserted as properties over status mixtures rather than one fixture.
 */
import { describe, it, expect } from "vitest";
import { Activity, Agent, Query, QueryStatus } from "../types";
import {
  BASE_STAGES, CALENDAR_GROUPS, DEFAULT_SORT, GAUGE_CAP, NOTCH_PC, SORT_OPTIONS, STAGE_NAME,
  buildQcRows, closedGrid, courtOf, expectedFor, factLine, filterForStatusParam, filterOptions, filterPhrase,
  gaugeFor, inScope, isWithYou, matchesFilter, primaryActionLabel, sortRows, stageColumns, stageFilter, stageOrder, standLine,
  type QcFilter, type QcRow,
} from "./qcSummary";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 19, 12);
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();
const ahead = (days: number) => new Date(NOW + days * DAY).toISOString();
const ALL = Object.values(QueryStatus) as QueryStatus[];

let n = 0;
const mkQ = (over: Partial<Query> = {}): Query => ({
  id: `q${++n}`, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: ago(20), ...over,
});
const agent = (over: Partial<Agent> = {}): Agent => ({ id: "a1", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", ...over } as Agent);
const act = (queryId: string, status: QueryStatus, date: string): Activity => ({ id: `${queryId}-${status}`, userId: "u", queryId, manuscriptId: "m1", activityType: "x" as never, description: "", details: "", date, resultingStatus: status });
const rowsOf = (qs: Query[], agents: Agent[] = [agent()], acts: Activity[] = []) => buildQcRows(qs, agents, acts, NOW);
const one = (over: Partial<Query>, a: Agent = agent(), acts: Activity[] = []): QcRow => rowsOf([mkQ(over)], [a], acts)[0];

describe("⚠️ ONE definition of 'with you' — rust, the chip and the filter all read it", () => {
  it("is exactly partial requested, full requested and revise & resubmit — NOT an offer", () => {
    expect(ALL.filter(isWithYou).sort()).toEqual([QueryStatus.FULL_REQUESTED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.REVISE_RESUBMIT].sort());
    expect(isWithYou(QueryStatus.OFFER)).toBe(false);
  });
  it("every status reaches exactly one court, and the four courts partition any mixture", () => {
    for (const s of ALL) expect(["you", "agent", "offer", "closed"]).toContain(courtOf(s));
    const rows = rowsOf(ALL.flatMap((s) => [mkQ({ status: s }), mkQ({ status: s })]));
    const by = (f: QcFilter) => rows.filter((r) => matchesFilter(r, f)).length;
    expect(by("you") + by("agent") + by("offers") + by("closed")).toBe(rows.length);
    expect(rows.filter((r) => r.withYou).length).toBe(by("you"));
  });
});

describe("the ONE clock — expectedFor", () => {
  it("agent's turn: the agency's window from the LAST send; null when nobody stated one (never 8/12/12)", () => {
    expect(expectedFor(mkQ({ dateSent: ago(20) }), agent({ responseTimeWeeks: 6 }))).toEqual({ ms: NOW - 20 * DAY + 42 * DAY, kind: "reply" });
    expect(expectedFor(mkQ({ dateSent: ago(20) }), agent())).toEqual({ ms: null, kind: "reply" });
    const ps = mkQ({ status: QueryStatus.PARTIAL_SENT, dateSent: ago(90), partialSentDate: ago(10) });
    expect(expectedFor(ps, agent({ responseTimeWeeks: 4 })).ms).toBe(NOW - 10 * DAY + 28 * DAY);
  });
  it("agent's turn: the writer's own expected date outranks the agency's window", () => {
    const q = { ...mkQ({ dateSent: ago(20) }), writerExpectedDate: ahead(3) } as Query;
    expect(expectedFor(q, agent({ responseTimeWeeks: 6 })).ms).toBe(new Date(ahead(3)).getTime());
  });
  it("⚠️ writer's turn: expectedSendDate AND NOTHING ELSE — not the agency's window, not the writer's reply date", () => {
    const bare = { ...mkQ({ status: QueryStatus.PARTIAL_REQUESTED }), writerExpectedDate: ahead(3) } as Query;
    expect(expectedFor(bare, agent({ responseTimeWeeks: 6 }))).toEqual({ ms: null, kind: "sendBy" });
    expect(expectedFor(mkQ({ status: QueryStatus.FULL_REQUESTED, expectedSendDate: ahead(14) }), agent())).toEqual({ ms: new Date(ahead(14)).getTime(), kind: "sendBy" });
    expect(expectedFor(mkQ({ status: QueryStatus.REVISE_RESUBMIT, expectedSendDate: { toDate: () => new Date(ahead(5)) } }), agent()).ms).toBe(new Date(ahead(5)).getTime());
  });
  it("offer: the offer's own deadline; closed: nothing", () => {
    expect(expectedFor(mkQ({ status: QueryStatus.OFFER, offerResponseDeadline: ahead(6) }), agent()).kind).toBe("offer");
    expect(expectedFor(mkQ({ status: QueryStatus.REJECTED }), agent({ responseTimeWeeks: 6 }))).toEqual({ ms: null, kind: null });
  });
  it("'Past expected' is agent's-turn only — a writer's-turn overrun is drawn on its gauge and NOT counted", () => {
    const late = one({ dateSent: ago(60) }, agent({ responseTimeWeeks: 4 }));
    const mine = one({ status: QueryStatus.PARTIAL_REQUESTED, dateSent: ago(60), partialRequestedDate: ago(30), expectedSendDate: ago(3) });
    expect(late.pastExpected).toBe(true);
    expect(mine.pastExpected).toBe(false);
    expect(gaugeFor(mine, NOW).kind).toBe("past");
  });
});

describe("the gauges — widths against known dates", () => {
  /* a Queried row whose window is exactly 10 days: sent `since` days ago, 10-day window via writerExpectedDate */
  const row = (since: number, window: number | null): QcRow => {
    const q = { ...mkQ({ dateSent: ago(since) }), ...(window == null ? {} : { writerExpectedDate: new Date(NOW - since * DAY + window * DAY).toISOString() }) } as Query;
    return rowsOf([q])[0];
  };
  const tally: Record<string, number> = {};
  const g = (since: number, window: number | null) => { const x = gaugeFor(row(since, window), NOW); tally[x.kind] = (tally[x.kind] ?? 0) + 1; return x; };

  it("the notch is 70 and the cap is four", () => { expect(NOTCH_PC).toBe(70); expect(GAUGE_CAP).toBe(4); });
  it("halfway through the window: navy to 35%, no ink", () => {
    const x = g(5, 10);
    expect([x.kind, x.f, x.fillPc, x.overPc]).toEqual(["within", 0.5, 35, 0]);
  });
  it("on the expected date: navy to the notch exactly, no ink", () => {
    const x = g(10, 10);
    expect([x.kind, x.fillPc, x.overPc]).toEqual(["within", 70, 0]);
  });
  it("⚠️ past the notch: navy stops AT the notch and ink carries on — 2 days past a 10-day window is 14%", () => {
    const x = g(12, 10);
    expect(x.kind).toBe("past");
    expect(x.fillPc).toBe(70);
    expect(x.overPc).toBeCloseTo(14, 6);
  });
  it("the ink is capped at the 30% beyond the notch, however far past", () => {
    expect(g(15, 10).overPc).toBe(30);
    expect(g(400, 10).overPc).toBe(30);
    expect(g(400, 10).fillPc + g(400, 10).overPc).toBe(100);
  });
  it("a query sent today still shows: f floors at .03, which is 2.1%", () => {
    const x = g(0, 10);
    expect(x.f).toBe(0.03);
    expect(x.fillPc).toBeCloseTo(2.1, 6);
  });
  it("⚠️ no date promised: no fill at all, and it says so", () => {
    const x = g(5, null);
    expect([x.kind, x.f, x.fillPc, x.overPc]).toEqual(["nodate", null, 0, 0]);
    expect(x.title).toBe("Jonathan Marsh, no date promised");
  });
  it("a stage nothing dates: dashed, 'stage not dated' — never a width computed from a guess", () => {
    const r = one({ status: QueryStatus.FULL_SENT, dateSent: ago(90) }, agent({ responseTimeWeeks: 4 }));
    expect(r.stageStartMs).toBeNull();
    const x = gaugeFor(r, NOW); tally[x.kind + ":undated"] = 1;
    expect([x.kind, x.fillPc, x.title]).toEqual(["nodate", 0, "Jonathan Marsh, stage not dated"]);
  });
  it("every branch above was entered", () => { expect(Object.keys(tally).sort()).toEqual(["nodate", "nodate:undated", "past", "within"]); });

  it("titles: the agent's turn says 'the expected date'; the writer's says 'your send-by date'", () => {
    expect(g(4, 10).title).toBe("Jonathan Marsh, 6 days until the expected date");
    expect(g(19, 10).title).toBe("Jonathan Marsh, 9 days past the expected date");
    expect(g(9, 10).title).toBe("Jonathan Marsh, 1 day until the expected date");
    const mine = (send: string | undefined) => gaugeFor(one({ status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: ago(10), expectedSendDate: send }), NOW).title;
    expect(mine(ahead(6))).toBe("Jonathan Marsh, 6 days until your send-by date");
    expect(mine(ago(3))).toBe("Jonathan Marsh, 3 days past your send-by date");
    expect(mine(undefined)).toBe("Jonathan Marsh, no send-by date");
    expect(gaugeFor(one({ status: QueryStatus.OFFER, offerDate: ago(4), offerResponseDeadline: ahead(40) }), NOW).title).toBe("Jonathan Marsh, 6 weeks until the decision date");
  });
});

describe("stage columns", () => {
  it("six columns, in order; a seventh — between Full sent and Offer — only while a live R&R exists", () => {
    expect(stageOrder(rowsOf([mkQ()]))).toEqual(BASE_STAGES);
    const withRr = stageOrder(rowsOf([mkQ({ status: QueryStatus.REVISE_RESUBMIT })]));
    expect(withRr).toHaveLength(7);
    expect(withRr.indexOf(QueryStatus.REVISE_RESUBMIT)).toBe(withRr.indexOf(QueryStatus.FULL_SENT) + 1);
    expect(withRr.indexOf(QueryStatus.OFFER)).toBe(6);
    expect(stageColumns(rowsOf([mkQ({ status: QueryStatus.REJECTED })]), NOW).map((c) => c.count)).toEqual([0, 0, 0, 0, 0, 0]);
  });
  it("⚠️ shows the FOUR furthest through their window, no-date last, and counts the rest", () => {
    const qs = [3, 18, 9, 1, 14, 6].map((since) => ({ ...mkQ({ dateSent: ago(since) }), writerExpectedDate: new Date(NOW - since * DAY + 20 * DAY).toISOString() }) as Query);
    const cols = stageColumns(rowsOf([...qs, mkQ({ dateSent: ago(50) })], [agent()]), NOW);
    const col = cols[0];
    expect(col.count).toBe(7);
    expect(col.gauges).toHaveLength(4);
    expect(col.more).toBe(3);
    expect(col.gauges.map((x) => x.f)).toEqual([0.9, 0.7, 0.45, 0.3]);
    expect(col.gauges.every((x) => x.kind !== "nodate"), "a dateless query outranked a dated one").toBe(true);
    expect(cols.slice(1).every((c) => c.count === 0 && c.gauges.length === 0 && c.more === 0)).toBe(true);
  });
  it("live means not closed: a withdrawn query is in no column", () => {
    const cols = stageColumns(rowsOf([mkQ(), mkQ({ status: QueryStatus.WITHDRAWN }), mkQ({ status: QueryStatus.OFFER })]), NOW);
    expect(cols.reduce((a, c) => a + c.count, 0)).toBe(2);
  });
  it("the calendar groups: who must act first, R&R after Full requested, Closed last", () => {
    expect(CALENDAR_GROUPS).toEqual([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, "closed"]);
  });
});

describe("the closed grid", () => {
  const closed = () => {
    const a = mkQ({ status: QueryStatus.REJECTED }), b = mkQ({ status: QueryStatus.REJECTED }), c = mkQ({ status: QueryStatus.NO_RESPONSE });
    const d = mkQ({ status: QueryStatus.REJECTED }), e = mkQ({ status: QueryStatus.WITHDRAWN }), f = mkQ({ status: QueryStatus.NO_RESPONSE }), live = mkQ();
    const acts = [act(b.id, QueryStatus.PARTIAL_REQUESTED, ago(40)), act(d.id, QueryStatus.FULL_REQUESTED, ago(50)), act(d.id, QueryStatus.OFFER, ago(30)), act(f.id, QueryStatus.PARTIAL_REQUESTED, ago(35)), act(e.id, QueryStatus.FULL_REQUESTED, ago(20))];
    return closedGrid(rowsOf([a, b, c, d, e, f, live], [agent()], acts));
  };
  it("a row is the furthest stage reached; a column is how it ended", () => {
    const g = closed();
    expect(g.rows.map((r) => [r.key, r.passed, r.noReply])).toEqual([["query", 1, 1], ["partial", 1, 1], ["full", 1, 0]]);
  });
  it("⚠️ the title's count IS the grid's sum; Withdrawn is stated beneath and never counted in", () => {
    const g = closed();
    expect(g.total).toBe(5);
    expect(g.rows.reduce((a, r) => a + r.passed + r.noReply, 0)).toBe(g.total);
    expect(g.withdrawn).toBe(1);
  });
  it("'After a full' means a full or beyond, and its title says so", () => {
    expect(closed().rows[2].title).toMatch(/or beyond/);
  });
  it("PROPERTY — over status mixtures: passed + no reply = rejected + no response, exactly", () => {
    let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let k = 0; k < 40; k++) {
      const qs = Array.from({ length: 1 + Math.floor(rnd() * 25) }, () => mkQ({ status: ALL[Math.floor(rnd() * ALL.length)] }));
      const g = closedGrid(rowsOf(qs));
      expect(g.rows.reduce((a, r) => a + r.passed + r.noReply, 0)).toBe(qs.filter((q) => q.status === QueryStatus.REJECTED || q.status === QueryStatus.NO_RESPONSE).length);
      expect(g.withdrawn).toBe(qs.filter((q) => q.status === QueryStatus.WITHDRAWN).length);
    }
  });
});

describe("the sentence — one filter, one scope, one sort", () => {
  it("the Closed FILTER includes Withdrawn (so those queries stay findable) while the closed CARD does not count it", () => {
    const rows = rowsOf([mkQ({ status: QueryStatus.WITHDRAWN }), mkQ({ status: QueryStatus.REJECTED }), mkQ()]);
    expect(rows.filter((r) => matchesFilter(r, "closed"))).toHaveLength(2);
    expect(closedGrid(rows).total).toBe(1);
  });
  it("the menu: All, the three courts, Past expected, each stage, then Closed — counted over the SCOPED set", () => {
    const rows = rowsOf([mkQ(), mkQ(), mkQ({ status: QueryStatus.PARTIAL_REQUESTED }), mkQ({ status: QueryStatus.OFFER }), mkQ({ status: QueryStatus.REJECTED })]);
    const menu = filterOptions(rows);
    expect(menu.map((o) => o.label)).toEqual(["All queries", "With you", "With the agent", "Offers", "Past expected", "Queried", "Partial requested", "Partial sent", "Full requested", "Full sent", "Offer", "Closed"]);
    expect(menu.map((o) => o.count)).toEqual([5, 1, 2, 1, 0, 2, 1, 0, 0, 0, 1, 1]);
    expect(menu.find((o) => o.key === "you")!.swatch).toBe("var(--state-you)");
    expect(menu.find((o) => o.key === "all")!.swatch).toBeNull();
    expect(filterOptions(rowsOf([mkQ({ status: QueryStatus.REVISE_RESUBMIT })])).map((o) => o.label)).toContain("Revise & resubmit");
  });
  it("the phrase rewrites itself, carries a chosen manuscript, and says so on the calendar", () => {
    expect(filterPhrase("all", 26)).toBe("All 26 queries");
    expect(filterPhrase("all", 1)).toBe("All 1 query");
    expect(filterPhrase("you", 4)).toBe("4 with you");
    expect(filterPhrase("agent", 12)).toBe("12 with the agent");
    expect(filterPhrase("offers", 1)).toBe("1 offer");
    expect(filterPhrase("past", 2)).toBe("2 past expected");
    expect(filterPhrase("closed", 4)).toBe("4 closed");
    expect(filterPhrase(stageFilter(QueryStatus.QUERIED), 12, { manuscriptTitle: "Murphy's Day Out" })).toBe("12 queried for Murphy's Day Out");
    expect(filterPhrase(stageFilter(QueryStatus.REVISE_RESUBMIT), 1)).toBe("1 revise & resubmit");
    expect(filterPhrase("all", 26, { calendar: true })).toBe("All 26 queries on the calendar");
  });
  it("scope: a chosen manuscript narrows; null is All", () => {
    const rows = rowsOf([mkQ({ manuscriptId: "m1" }), mkQ({ manuscriptId: "m2" })]);
    expect(rows.filter((r) => inScope(r, "m2"))).toHaveLength(1);
    expect(rows.filter((r) => inScope(r, null))).toHaveLength(2);
  });
  it("six sorts, in this order, default latest activity — and NO appraisal wording in any label", () => {
    expect(SORT_OPTIONS.map((o) => o.label)).toEqual(["latest activity first", "newest query first", "next reply date first", "with you first", "agents A to Z", "agencies A to Z"]);
    expect(DEFAULT_SORT).toBe("activity");
  });
  it("each sort does what it says; absence sorts LAST under 'next reply date first'", () => {
    const a = mkQ({ dateSent: ago(30), agentId: "a1" }), b = mkQ({ dateSent: ago(5), agentId: "a2", status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) }), c = mkQ({ dateSent: ago(10), agentId: "a3" });
    const agents = [agent({ id: "a1", name: "Zadie Ames", agency: "Ames & Co", responseTimeWeeks: 8 }), agent({ id: "a2", name: "Basil Birch", agency: "Yew Literary" }), agent({ id: "a3", name: "Cora Cole", agency: "" })];
    const rows = buildQcRows([a, b, c], agents, [act(a.id, QueryStatus.QUERIED, ago(1))], NOW);
    const ids = (s: Parameters<typeof sortRows>[1]) => sortRows(rows, s).map((r) => r.id);
    expect(ids("activity")).toEqual([a.id, b.id, c.id]);
    expect(ids("newest")).toEqual([b.id, c.id, a.id]);
    expect(ids("reply")[0]).toBe(a.id);
    expect(ids("you")[0]).toBe(b.id);
    expect(ids("agent")).toEqual([b.id, c.id, a.id]);
    expect(ids("agency")).toEqual([a.id, b.id, c.id]);
  });
  it("?status= — all→All, awaiting→With the agent, closed→Closed; ⚠️ attention was 'overdue for a reply', so →Past expected", () => {
    expect([filterForStatusParam("all"), filterForStatusParam("awaiting"), filterForStatusParam("closed"), filterForStatusParam("attention")]).toEqual(["all", "agent", "closed", "past"]);
  });
});

describe("the row's words", () => {
  it("⚠️ writer's turn keeps 'N days since request'; 'due …' leads ONLY when expectedSendDate exists", () => {
    expect(factLine(one({ status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: ago(12) }, agent({ responseTimeWeeks: 6 })), NOW)).toBe("12 days since request");
    expect(factLine(one({ status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: ago(12), expectedSendDate: ahead(14) }), NOW)).toBe(`due 3 Oct · 14 days left · 12 days since request`);
    expect(factLine(one({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(1), expectedSendDate: ago(2) }), NOW)).toMatch(/^due 17 Sep · 2 days past · 1 day since request$/);
  });
  it("agent's turn: the reply date, or that none was promised, or how far past it is", () => {
    expect(factLine(one({ dateSent: ago(36) }, agent({ responseTimeWeeks: 6 })), NOW)).toBe("reply by 25 Sep · 6 days away");
    expect(factLine(one({ dateSent: ago(36) }), NOW)).toBe("no date promised · 5 weeks waiting");
    expect(factLine(one({ dateSent: ago(51) }, agent({ responseTimeWeeks: 6 })), NOW)).toBe("7 weeks waiting · 9 days past the expected date");
  });
  it("the footer's line, and the footer's one action — none when closed", () => {
    expect(standLine(one({ status: QueryStatus.PARTIAL_REQUESTED }))).toBe("Jonathan is waiting on your partial");
    expect(standLine(one({ status: QueryStatus.FULL_SENT }))).toBe("Jonathan has your full");
    expect(ALL.map((s) => [s, primaryActionLabel(s)])).toEqual([
      [QueryStatus.QUERIED, "Record a response"], [QueryStatus.PARTIAL_REQUESTED, "Mark partial sent"], [QueryStatus.PARTIAL_SENT, "Record a response"],
      [QueryStatus.FULL_REQUESTED, "Mark full sent"], [QueryStatus.FULL_SENT, "Record a response"], [QueryStatus.REVISE_RESUBMIT, "Record your resubmission"],
      [QueryStatus.OFFER, "Record your decision"], [QueryStatus.REJECTED, null], [QueryStatus.WITHDRAWN, null], [QueryStatus.NO_RESPONSE, null],
    ]);
  });
  it("⚠️ NO APPRAISAL LANGUAGE in anything this module can say — swept over every status, in and past its window", () => {
    const said: string[] = [...SORT_OPTIONS.map((o) => o.label), ...Object.values(STAGE_NAME)];
    for (const s of ALL) for (const since of [2, 200]) {
      const r = one({ status: s, dateSent: ago(since), partialRequestedDate: ago(since), fullRequestedDate: ago(since), expectedSendDate: ago(since - 10) }, agent({ responseTimeWeeks: 4 }));
      said.push(factLine(r, NOW), standLine(r), gaugeFor(r, NOW).title, primaryActionLabel(s) ?? "");
    }
    said.push(...filterOptions(rowsOf(ALL.map((s) => mkQ({ status: s })))).map((o) => o.label));
    expect(said.length).toBeGreaterThan(60);
    for (const s of said) expect(s, s).not.toMatch(/overdue|\blate\b|rejected|urgent|attention/i);
  });
});
