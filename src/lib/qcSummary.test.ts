/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcSummary — the Query Centre's derivations.
 *
 * ⚠️ THE GAUGE, STAGE-COLUMN AND CLOSED-GRID CASES ARE RETIRED (21 Sep) BECAUSE THEIR SUBJECTS ARE
 * — the compact strip is gone from the views by design. They were good locks (widths asserted
 * against KNOWN DATES, a tally per branch); they are not weakened, they have nothing left to
 * guard. What survives asserts the Overview's stat row and the fan's hand, which is where those
 * numbers live now.
 */
import { describe, it, expect } from "vitest";
import { Activity, Agent, Query, QueryStatus } from "../types";
import {
  BASE_STAGES, CALENDAR_GROUPS, DEFAULT_SORT, SORT_OPTIONS, STAGE_NAME,
  buildQcRows, courtOf, expectedFor, factLine, filterForStatusParam, filterOptions, filterPhrase,
  handOf, rowsForClosed, rowsWithdrawn,
  courtTiles, rowsForTile, tileCourt, tileHand, type TileCourt,
  inScope, isWithYou, matchesFilter, primaryActionLabel, sortRows, stageFilter, stageOrder, standLine,
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
  });
});

/**
 * ⚠️ THE OVERVIEW'S STAT ROW IS DELETED (v65 §4), AND ITS CLAIMS DID NOT LAPSE — THEY MOVED. The
 * seven-or-eight stat cards are three court tiles, so `overviewCards`, `rowsForCard`, `fanHand`,
 * `OverviewKey` and `OverviewCard` went with them rather than being left exported for a page that
 * no longer has a caller. Each thing this block proved has a home below, over the tiles:
 *
 *   · a card states what its fan deals  → "the count and the hand are the same membership, per tile"
 *   · the cap, and latest-activity order → "the hand's cap and order are ONE function — `handOf`"
 *   · withdrawn is in no closed count   → the same case, and `tileCourt`'s own `null`
 *   · a card at zero states no figures  → "the fact lines, including the zero case"
 *   · "N past the date" is ink          → "the rust dot is the With-you tile's and no other"
 *
 * The one claim with no successor is the ORDER of the stage cards (pipeline order, Closed last,
 * eight while a live R&R exists) — there are no stage cards to order. `stageOrder` still decides
 * the sentence's menu and is locked where the menu is.
 */

describe("the sentence — one filter, one scope, one sort", () => {
  it("the Closed FILTER includes Withdrawn (so those queries stay findable) while the closed CARD does not count it", () => {
    const rows = rowsOf([mkQ({ status: QueryStatus.WITHDRAWN }), mkQ({ status: QueryStatus.REJECTED }), mkQ()]);
    expect(rows.filter((r) => matchesFilter(r, "closed"))).toHaveLength(2);
    expect(rowsForClosed(rows)).toHaveLength(1);
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
    expect(factLine(one({ dateSent: ago(51) }, agent({ responseTimeWeeks: 6 })), NOW)).toBe("7 weeks waiting · 9 days past expected");
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
      said.push(factLine(r, NOW), standLine(r), primaryActionLabel(s) ?? "");
    }
    said.push(...filterOptions(rowsOf(ALL.map((s) => mkQ({ status: s })))).map((o) => o.label));
    expect(said.length).toBeGreaterThan(60);
    for (const s of said) expect(s, s).not.toMatch(/overdue|\blate\b|rejected|urgent|attention/i);
  });
});

/* ── v65 §1.3 · the three courts ───────────────────────────────────────────────────────────── */

describe("⚠️ tileCourt is NOT courtOf, and the difference is the whole ruling", () => {
  it("an OFFER is With you here, and With its own court everywhere else", () => {
    expect(courtOf(QueryStatus.OFFER)).toBe("offer");
    expect(tileCourt(QueryStatus.OFFER)).toBe("you");
    /* ⚠️ and `isWithYou` must NOT have moved with it — the rust marker still means material owed */
    expect(isWithYou(QueryStatus.OFFER)).toBe(false);
  });
  it("a WITHDRAWN query belongs to no tile at all", () => {
    expect(tileCourt(QueryStatus.WITHDRAWN)).toBeNull();
    expect(courtOf(QueryStatus.WITHDRAWN)).toBe("closed");
  });
  it("the three sets, named — and every status lands in exactly one of them or in none", () => {
    const by: Record<string, QueryStatus[]> = { you: [], agent: [], closed: [], none: [] };
    for (const s of ALL) by[tileCourt(s) ?? "none"].push(s);
    expect(by.you.sort()).toEqual([QueryStatus.FULL_REQUESTED, QueryStatus.OFFER, QueryStatus.PARTIAL_REQUESTED, QueryStatus.REVISE_RESUBMIT].sort());
    expect(by.agent.sort()).toEqual([QueryStatus.FULL_SENT, QueryStatus.PARTIAL_SENT, QueryStatus.QUERIED].sort());
    expect(by.closed.sort()).toEqual([QueryStatus.NO_RESPONSE, QueryStatus.REJECTED].sort());
    expect(by.none).toEqual([QueryStatus.WITHDRAWN]);
    /* the partition: nothing counted twice, nothing missed */
    expect(by.you.length + by.agent.length + by.closed.length + by.none.length).toBe(ALL.length);
  });
});

describe("the court tiles state what their fan deals", () => {
  const tiles = (st: QueryStatus[]) => rowsOf(st.map((status) => mkQ({ status })));
  it("⚠️ the count and the hand are the same membership, per tile — never two derivations", () => {
    const rows = tiles([QueryStatus.QUERIED, QueryStatus.OFFER, QueryStatus.PARTIAL_REQUESTED, QueryStatus.REJECTED, QueryStatus.WITHDRAWN]);
    for (const t of ["you", "agent", "closed"] as TileCourt[]) {
      const tile = courtTiles(rows).find((c) => c.key === t)!;
      expect(tile.count, t).toBe(rowsForTile(rows, t).length);
      expect(tileHand(rows, t).count, t).toBe(tile.count);
    }
    /* the withdrawn one is in no tile's count and in no tile's hand */
    const total = courtTiles(rows).reduce((n, c) => n + c.count, 0);
    expect(total, "a withdrawn query was counted in a tile").toBe(rows.length - 1);
  });
  it("⚠️ and the hand's cap and order are ONE function — `handOf`, which both doors read", () => {
    /* ⚠️ THE DATES MUST DIFFER OR THE ORDER CLAIM IS VACUOUS. Twenty rows built from one factory
       share a `lastMs`, so ANY order is in descending order and dropping the sort passes. Measured:
       it did — the mutation reddened a neighbouring case and left this one green. */
    /* …and they are built OLDEST FIRST, so the input's own order is the wrong one. Built newest
       first, the unsorted slice is already descending and dropping the sort is invisible. Measured
       that too: the first fixture had distinct dates and STILL passed the mutation. */
    const rows = rowsOf(Array.from({ length: 20 }, (_, i) => mkQ({ status: QueryStatus.QUERIED, dateSent: ago(20 - i) })));
    const hand = tileHand(rows, "agent");
    expect(new Set(rows.map((r) => r.lastMs)).size, "the fixture is a monoculture; the order claim below would be vacuous").toBe(20);
    expect(hand.dealt.length).toBe(15);
    expect(hand.more).toBe(5);
    expect(hand.count).toBe(20);
    expect(handOf(rowsForTile(rows, "agent"))).toEqual(hand);
    /* latest activity first — a length check alone would pass on any fifteen */
    expect(hand.dealt.map((r) => r.lastMs)).toEqual([...hand.dealt.map((r) => r.lastMs)].sort((a, b) => b - a));
  });
  it("the fact lines, including the zero case — a tile at zero states no figures", () => {
    const empty = courtTiles([]);
    expect(empty.map((t) => t.fact)).toEqual(["none yet", "none yet", "none yet"]);
    const rows = tiles([QueryStatus.OFFER, QueryStatus.PARTIAL_REQUESTED, QueryStatus.QUERIED, QueryStatus.REJECTED, QueryStatus.NO_RESPONSE]);
    const t = Object.fromEntries(courtTiles(rows).map((c) => [c.key, c]));
    expect(t.you.fact).toBe("1 offer to decide");
    expect(t.closed.fact).toBe("1 passed · 1 no reply");
    /* ⚠️ "all in the window" is a FACT; the app never says overdue or late outside Birds-eye */
    expect(t.agent.fact === "all in the window" || /past the date$/.test(t.agent.fact)).toBe(true);
    for (const c of courtTiles(rows)) expect(c.fact, c.key).not.toMatch(/overdue|late|behind/i);
  });
  it("the rust dot is the With-you tile's and no other", () => {
    const rows = tiles([QueryStatus.PARTIAL_REQUESTED, QueryStatus.QUERIED, QueryStatus.REJECTED]);
    expect(courtTiles(rows).map((c) => c.rust)).toEqual([true, false, false]);
    expect(courtTiles([]).map((c) => c.rust)).toEqual([false, false, false]);
  });
});
