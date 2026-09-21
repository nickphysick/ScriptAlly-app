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
  fanHand, overviewCards, rowsForCard, rowsForClosed, rowsWithdrawn,
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

describe("the Overview's stat row — a card states a number, and its fan deals that number", () => {
  /* one of every status, plus a second Queried, so every card has something to be wrong about */
  const mixed = () => {
    const qs = [
      mkQ({ status: QueryStatus.QUERIED }), mkQ({ status: QueryStatus.QUERIED }),
      mkQ({ status: QueryStatus.PARTIAL_REQUESTED }), mkQ({ status: QueryStatus.PARTIAL_SENT }),
      mkQ({ status: QueryStatus.FULL_REQUESTED }), mkQ({ status: QueryStatus.FULL_SENT }),
      mkQ({ status: QueryStatus.REVISE_RESUBMIT }), mkQ({ status: QueryStatus.OFFER }),
      mkQ({ status: QueryStatus.REJECTED }), mkQ({ status: QueryStatus.NO_RESPONSE }),
      mkQ({ status: QueryStatus.WITHDRAWN }),
    ];
    return rowsOf(qs);
  };

  it("seven cards, in pipeline order, Closed last — eight while a live R&R exists", () => {
    const plain = overviewCards(rowsOf([mkQ()]), NOW);
    expect(plain.map((c) => c.key)).toEqual([...BASE_STAGES, "closed"]);
    const withRr = overviewCards(mixed(), NOW);
    expect(withRr).toHaveLength(8);
    expect(withRr.map((c) => c.key).indexOf(QueryStatus.REVISE_RESUBMIT))
      .toBe(withRr.map((c) => c.key).indexOf(QueryStatus.FULL_SENT) + 1);
    expect(withRr[withRr.length - 1].key).toBe("closed");
  });

  /**
   * ⚠️ THE LOCK NICK ASKED FOR, AND IT IS AN EQUALITY BETWEEN TWO DERIVATIONS RATHER THAN TWO
   * LITERALS. A card's count and the hand it deals are the same membership or the reader is told
   * "12 queried" and handed eleven cards. Asserting `toBe(2)` on both sides would go green the day
   * someone changed both in the same wrong direction.
   */
  it("⚠️ every card's count is exactly the length of the hand it deals", () => {
    const rows = mixed();
    const cards = overviewCards(rows, NOW);
    expect(cards.length).toBeGreaterThan(3);
    for (const c of cards) {
      expect(rowsForCard(rows, c.key), `${String(c.key)} deals a different set from the number it states`)
        .toHaveLength(c.count);
    }
    /* and the whole row accounts for every row exactly once, withdrawn excepted */
    const dealt = cards.flatMap((c) => rowsForCard(rows, c.key).map((r) => r.id));
    expect(new Set(dealt).size, "a query is dealt by two cards").toBe(dealt.length);
    expect(dealt).toHaveLength(rows.length - rowsWithdrawn(rows).length);
  });

  it("⚠️ the closed card deals what it counts — Rejected and No Response, never Withdrawn", () => {
    const rows = mixed();
    const closedCard = overviewCards(rows, NOW).find((c) => c.key === "closed")!;
    expect(closedCard.count).toBe(2);
    expect(closedCard.note).toBe("1 passed · 1 no reply");
    expect(rowsForCard(rows, "closed").map((r) => r.status).sort())
      .toEqual([QueryStatus.NO_RESPONSE, QueryStatus.REJECTED].sort());
    expect(rowsForCard(rows, "closed").some((r) => r.closedHow === "withdrawn")).toBe(false);
    expect(rowsWithdrawn(rows)).toHaveLength(1);
    /* the card's count IS the selector's length — the closed grid that used to state this third
       figure went with the compact strip, and `rowsForClosed` is the one answer now */
    expect(rowsForClosed(rows)).toHaveLength(closedCard.count);
  });

  /**
   * ⚠️ RULING 2, RESTATED FOR THE CAPPED FAN RATHER THAN LOOSENED (Nick, 21 Sep). The original
   * claim was "a card's count IS the length of the hand it deals". The fan now deals at most
   * fifteen, so that sentence is no longer true as written — and the wrong response would be to
   * relax it to something a wrong deal could satisfy. It becomes THREE claims instead, which
   * together say everything the original said:
   *
   *   1. the dealt cards are exactly the first `min(count, 15)` in LATEST-ACTIVITY order;
   *   2. the stack card exists if and only if `count > 15`, and its number is `count - 15`;
   *   3. the stat card's figure is still `count` — the cap changes the DEAL, never the COUNT.
   *
   * Between them there is nowhere for a discrepancy to hide: 1 pins which fifteen, 2 pins that the
   * rest are accounted for out loud, 3 pins that the headline never shrank to match the hand.
   */
  const many = (n: number, status = QueryStatus.QUERIED) =>
    rowsOf(Array.from({ length: n }, (_, i) => mkQ({ status, dateSent: ago(n - i) })));

  it("⚠️ 1 — the deal is the first min(count, 15) in latest-activity order, from the card's own set", () => {
    const rows = many(50);
    const hand = fanHand(rows, QueryStatus.QUERIED);
    expect(hand.count).toBe(50);
    expect(hand.dealt).toHaveLength(15);
    /* the order is stated, so "the most recent fifteen" means something */
    const byRecency = rowsForCard(rows, QueryStatus.QUERIED).slice().sort((a, b) => b.lastMs - a.lastMs);
    expect(hand.dealt.map((r) => r.id)).toEqual(byRecency.slice(0, 15).map((r) => r.id));
    /* …and it is the CARD's set, not the whole account */
    const mixed = rowsOf([...Array.from({ length: 20 }, () => mkQ()), mkQ({ status: QueryStatus.OFFER })]);
    expect(fanHand(mixed, QueryStatus.QUERIED).dealt.every((r) => r.status === QueryStatus.QUERIED)).toBe(true);
  });

  it("⚠️ 2 — the stack card is present iff count > 15, and its number is count − 15", () => {
    for (const [n, more] of [[3, 0], [15, 0], [16, 1], [50, 35]] as const) {
      const hand = fanHand(many(n), QueryStatus.QUERIED);
      expect(hand.more, `${n} queries`).toBe(more);
      expect(hand.dealt.length, `${n} queries`).toBe(Math.min(n, 15));
      /* the stack is a consequence of the cap, never an independent count */
      expect(hand.dealt.length + hand.more, `${n} queries are not all accounted for`).toBe(n);
    }
  });

  it("⚠️ 3 — the cap changes the DEAL and never the COUNT: the stat card still says 50", () => {
    const rows = many(50);
    const card = overviewCards(rows, NOW).find((c) => c.key === QueryStatus.QUERIED)!;
    expect(card.count, "the headline shrank to the hand").toBe(50);
    expect(card.count).toBe(fanHand(rows, QueryStatus.QUERIED).count);
    expect(card.count).toBe(rowsForCard(rows, QueryStatus.QUERIED).length);
  });

  it("the mono line states a fact and never a verdict, and an empty card says `none`", () => {
    const empty = overviewCards(rowsOf([mkQ({ status: QueryStatus.REJECTED })]), NOW);
    for (const c of empty.filter((x) => x.count === 0)) expect(c.note).toBe("none");
    /* an agent's-turn query whose promised date has gone */
    const late = rowsOf([mkQ({ dateSent: ago(200) })], [agent({ responseTimeWeeks: 8 })]);
    const q = overviewCards(late, NOW).find((c) => c.key === QueryStatus.QUERIED)!;
    expect(q.note).toBe("1 past the date");
    expect(q.urgent).toBe(true);
    for (const c of overviewCards(mixed(), NOW)) {
      expect(c.note, `"${c.note}" appraises`).not.toMatch(/overdue|late|stale|slow|bad|good/i);
    }
  });

  it("the rust dot is the two states where material is owed and the move is yours", () => {
    const cards = overviewCards(mixed(), NOW);
    expect(cards.filter((c) => c.rust).map((c) => c.key))
      .toEqual([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED]);
    /* …and never on a card at zero */
    expect(overviewCards(rowsOf([mkQ()]), NOW).some((c) => c.rust)).toBe(false);
  });
});

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
