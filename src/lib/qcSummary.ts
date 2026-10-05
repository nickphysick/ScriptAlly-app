/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcSummary — everything the Query Centre (v11) states about a set of queries, derived once: the
 * rows, whose court each is in, the ONE expected-date clock, the Overview's stat row and the
 * fan's hand, the sentence filter and the sorts. Pure; no Firebase; nothing stored.
 *
 * ⚠️ ONE DEFINITION OF "WITH YOU" — `isWithYou`. It drives the rust rule on rows, tiles and bars,
 * the rust dot in the card's band, the "N WITH YOU" chip and the With you filter. It is the app's
 * own classification (`turnFor(status) === "you"`: partial requested, full requested, revise &
 * resubmit) and NOT the mockup's, which also reddened offers. An offer has its own court.
 *
 * ⚠️ ONE CLOCK FOR THE WHOLE PAGE — `expectedFor`. Agent's turn: `resolveExpectedDate` (the most
 * recent of the writer's own date or a reply-stated window, else the agency's window from the last
 * send, else NULL — never the house 8/12/12 weeks). Writer's turn: `expectedSendDate` and nothing
 * else. Offer: `offerResponseDeadline`. `namedEndFor` is deliberately not used: it prefers a nudge
 * reminder, and a reminder is not an expected date.
 */
import { MONTHS_SHORT } from "./dates";
import { Activity, Agent, Query, QueryStatus } from "../types";
import { agentAgencyLine, agentInitials, agentPrimary } from "./agentDisplay";
import { buildRows as analyticsRows } from "./analytics";
import { compareAttention, type AttentionRow } from "./queryAttentionSort";
import { resolveExpectedDate } from "./expectedDate";
import { cardMaterials, stateFor, turnFor, type CardMaterials, type State } from "./queryCardFacts";
import type { DerivableActivity } from "./queryDerivation";
import { anyToMs, dayN, isClosedStatus, stageHistory, type StageHistory } from "./qcStages";

const DAY = 86_400_000;

/* ── courts ── */
export type Court = "you" | "agent" | "offer" | "closed";
export function courtOf(status: QueryStatus): Court {
  const t = turnFor(status);
  return t === "you" ? "you" : t === "offer" ? "offer" : t === "closed" ? "closed" : "agent";
}
/** THE one definition. See the header. */
export const isWithYou = (status: QueryStatus): boolean => courtOf(status) === "you";
export const COURT_LABEL: Record<Court, string> = { you: "With you", agent: "With the agent", offer: "Offer", closed: "Closed" };

/* ── stages, in the summary's order. R&R is a live status and gets a column only when one exists. ── */
export const BASE_STAGES: readonly QueryStatus[] = [
  QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.OFFER,
];
export const STAGE_NAME: Record<QueryStatus, string> = {
  [QueryStatus.QUERIED]: "Queried",
  [QueryStatus.PARTIAL_REQUESTED]: "Partial requested",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_REQUESTED]: "Full requested",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.REVISE_RESUBMIT]: "Revise & resubmit",
  [QueryStatus.OFFER]: "Offer",
  [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.WITHDRAWN]: "Withdrawn",
  [QueryStatus.NO_RESPONSE]: "Closed with no reply",
  [QueryStatus.RESUBMITTED]: "Resubmitted",
  [QueryStatus.SIGNED]: "Signed",
};
/** Six columns; seven — R&R between Full sent and Offer — only while a live R&R exists. */
export function stageOrder(rows: readonly QcRow[]): QueryStatus[] {
  const rr = rows.some((r) => r.status === QueryStatus.REVISE_RESUBMIT);
  const resub = rows.some((r) => r.status === QueryStatus.RESUBMITTED);
  if (!rr && !resub) return [...BASE_STAGES];
  const out = [...BASE_STAGES];
  if (rr) out.splice(out.indexOf(QueryStatus.OFFER), 0, QueryStatus.REVISE_RESUBMIT);
  if (resub) out.splice(out.indexOf(QueryStatus.OFFER), 0, QueryStatus.RESUBMITTED);
  return out;
}
/** The calendar's groups: by who must act first, R&R after Full requested, Closed last. */
export const CALENDAR_GROUPS: readonly (QueryStatus | "closed")[] = [
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER,
  QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.RESUBMITTED, "closed",
];

/* ── the row ── */
export type ExpectedKind = "reply" | "sendBy" | "offer";
export type ClosedHow = "passed" | "noReply" | "withdrawn";
export type Furthest = "query" | "partial" | "full";

export interface QcRow {
  id: string;
  query: Query;
  status: QueryStatus;
  state: State;
  court: Court;
  withYou: boolean;
  agentName: string;
  agency: string;
  /** The agency as recorded, for sorting — `agency` is the DISPLAY line and reads "No agency" when there is none, which would sort among the Ns. */
  agencyKey: string;
  initials: string;
  manuscriptId: string;
  sentMs: number | null;
  lastMs: number;
  history: StageHistory;
  /** The day it reached the stage it stands at; null when nothing dates it. */
  stageStartMs: number | null;
  expectedMs: number | null;
  expectedKind: ExpectedKind | null;
  /** Agent's turn, a date promised, and that date gone. The ONLY thing "Past expected" counts. */
  pastExpected: boolean;
  materials: CardMaterials;
  materialsRecorded: boolean;
  dayN: number | null;
  closedHow: ClosedHow | null;
  furthest: Furthest;
}

export function expectedFor(q: Query, agent: Agent | undefined | null): { ms: number | null; kind: ExpectedKind | null } {
  const status = q.status as QueryStatus;
  const court = courtOf(status);
  if (court === "closed") return { ms: null, kind: null };
  if (court === "you") return { ms: anyToMs(q.expectedSendDate), kind: "sendBy" };
  if (court === "offer") return { ms: anyToMs(q.offerResponseDeadline), kind: "offer" };
  const sends = [q.dateSent, q.partialSentDate, q.fullSentDate].map(anyToMs).filter((t): t is number => t != null);
  const r = resolveExpectedDate(q, sends.length ? Math.max(...sends) : null, agent?.responseTimeWeeks ?? null, null);
  return { ms: r.ms, kind: "reply" };
}

export function buildQcRows(queries: readonly Query[], agents: readonly Agent[], activities: readonly Activity[], nowMs: number): QcRow[] {
  const agentById = new Map(agents.map((a) => [a.id, a]));
  const log = new Map<string, DerivableActivity[]>();
  const lastAct = new Map<string, number>();
  for (const a of activities) {
    if (!a.queryId) continue;
    const list = log.get(a.queryId);
    if (list) list.push(a as DerivableActivity); else log.set(a.queryId, [a as DerivableActivity]);
    const t = anyToMs(a.date);
    if (t != null && t > (lastAct.get(a.queryId) ?? 0)) lastAct.set(a.queryId, t);
  }
  const reach = new Map(analyticsRows([...queries], [...activities], [...agents], nowMs).map((r) => [r.id, r]));
  return queries.map((q) => {
    const status = q.status as QueryStatus;
    const agent = agentById.get(q.agentId);
    const history = stageHistory(q, log.get(q.id));
    const exp = expectedFor(q, agent);
    const court = courtOf(status);
    const { materials, materialsRecorded } = cardMaterials(q.materialsWanted);
    const sentMs = anyToMs(q.dateSent);
    const r = reach.get(q.id);
    return {
      id: q.id, query: q, status, state: stateFor(status), court, withYou: court === "you",
      agentName: agentPrimary(agent), agency: agentAgencyLine(agent), agencyKey: (agent?.agency ?? "").trim(), initials: agentInitials(agent),
      manuscriptId: q.manuscriptId,
      sentMs,
      lastMs: Math.max(lastAct.get(q.id) ?? 0, anyToMs(q.lastStatusChange) ?? 0, sentMs ?? 0),
      history, stageStartMs: history.currentStartMs,
      expectedMs: exp.ms, expectedKind: exp.kind,
      pastExpected: court === "agent" && exp.ms != null && exp.ms < nowMs,
      materials, materialsRecorded,
      dayN: dayN(q, history, nowMs),
      closedHow: status === QueryStatus.REJECTED ? "passed" : status === QueryStatus.NO_RESPONSE ? "noReply" : status === QueryStatus.WITHDRAWN ? "withdrawn" : null,
      furthest: r?.reachedFull ? "full" : r?.reachedRequest ? "partial" : "query",
    };
  });
}

/* ── durations, in the mockup's words ── */
export const spanWords = (days: number): string => (days >= 35 ? `${Math.round(days / 7)} weeks` : `${days} ${days === 1 ? "day" : "days"}`);
const MON = MONTHS_SHORT;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const shortDay = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]}`; };
/**
 * The same date with its weekday — "Fri 31 Jul".
 *
 * ⚠️ IT IS THE WITH-YOU COURT'S ALONE, and that is the reference's own distinction rather than a
 * decorative one: a thing you must DO is planned into a week, so the weekday is the useful half of
 * the date; a reply you are waiting for arrives when it arrives, and the weekday it lands on is not
 * a fact about anything you can act on.
 */
export const shortWeekDay = (ms: number): string => { const d = new Date(ms); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const wholeDays = (a: number, b: number): number => Math.max(0, Math.round((b - a) / DAY));

/**
 * ⚠️ THE GAUGES, THE STAGE COLUMNS AND THE CLOSED GRID ARE DELETED (21 Sep) — REMOVED BY DESIGN,
 * NOT BROKEN. They were the compact strip's, and the strip is gone from the views: the Overview is
 * the only summary this page has, and Ledger, List and Calendar are content only. `gaugeFor`,
 * `stageColumns`, `closedGrid`, `GAUGE_CAP` and `NOTCH_PC` went WITH the component rather than
 * being left as a library nobody calls.
 *
 * ⚠️ CHECKED BEFORE REMOVING, AND BOTH APPARENT SURVIVORS WERE FALSE: `lib/cardC` has its own
 * unrelated `gaugeFor` (a name collision, not an importer) and `qcReviewAid` names it only inside
 * a COMMENT. A grep for the symbol reported two live consumers and there were none.
 *
 * ⚠️ AND v65 §4 TOOK THE OVERVIEW'S OWN SELECTORS WITH IT — `OverviewKey`, `OverviewCard`,
 * `overviewCards`, `rowsForCard` and `fanHand`. The three court tiles replace the seven-or-eight
 * stat cards, so `courtTiles` replaces them (and `tileHand`/`handOf` went with the fan, v126 §3); a replacement that is ADDED leaves the
 * original reachable, and only one that is SWAPPED retires it.
 *
 * What stays is what the sentence and the courts read: `rowsForStage`, `rowsForClosed`
 * and `rowsWithdrawn`.
 */

/**
 * ⚠️ THE TWO SELECTORS EVERY COUNT AND EVERY DEAL READS (v21 §5, Nick's ruling 2). A stat card
 * states a number and its fan deals that number of cards; the strip's stage column states the same
 * number; the closed band states the closed one. Those are FOUR surfaces asserting one fact, and
 * the only way they cannot come to disagree is for all four to call the same function — so the
 * membership test lives here once, and `qcSummary.test` asserts card count === fan length for
 * every card rather than checking each surface's arithmetic separately.
 *
 * ⚠️ AND `rowsForClosed` EXCLUDES WITHDRAWN, deliberately and in step with `closedGrid`. A
 * withdrawal is the writer's own decision, not an outcome the agent produced; the closed card
 * counts Rejected + No Response, so its fan deals Rejected + No Response. The withdrawn ones are
 * stated beside the fan ("+1 withdrawn, not shown") rather than silently dealt or silently dropped.
 */
export const rowsForStage = (rows: readonly QcRow[], status: QueryStatus): QcRow[] =>
  rows.filter((r) => r.court !== "closed" && r.status === status);
export const rowsForClosed = (rows: readonly QcRow[]): QcRow[] =>
  rows.filter((r) => r.closedHow === "passed" || r.closedHow === "noReply");
export const rowsWithdrawn = (rows: readonly QcRow[]): QcRow[] =>
  rows.filter((r) => r.closedHow === "withdrawn");

/* ── the three courts, as the page's tiles state them (v65 §1.3) ── */

/**
 * ⚠️ THREE COURTS, AND `tileCourt` IS NOT `courtOf` — the difference is OFFER, and it is a decision
 * rather than a slip. `courtOf` gives an offer its own court because the four-way split is what the
 * rest of the app reasons with; the page's three tiles put it under **With you**, because an
 * offer's decision is the writer's and there is no fourth tile for it to sit in. Nick's ruling of
 * 23 Sep, and the tile's own fact line says so out loud ("N offers to decide").
 *
 * ⚠️ `isWithYou` IS UNTOUCHED AND KEEPS ITS MEANING. The rust marker on a row, a bar or a chip
 * still means "material is owed by you", which an offer does not owe. Two names for two questions;
 * folding them would put a rust mark on every offer in the app.
 *
 * ⚠️ AND WITHDRAWN IS `null`, NOT `"closed"`. A withdrawal is the writer's own act rather than an
 * outcome an agent produced, so it is outside the three counts entirely — stated beside the closed
 * fan ("+N withdrawn, not shown") and counted nowhere. `null` is what makes that structural: a
 * withdrawn row has no tile to be counted in, so no tile can accidentally acquire it.
 */
export type TileCourt = "you" | "agent" | "closed";
export function tileCourt(status: QueryStatus): TileCourt | null {
  const c = courtOf(status);
  if (c === "you" || c === "offer") return "you";
  if (c === "agent") return "agent";
  /* Query actions v1 — SIGNED sits with WITHDRAWN in no tile: both are the writer's own act, not an
     outcome an agent produced, and a signing counted in the Closed fan beside passes would misname it. */
  return status === QueryStatus.WITHDRAWN || status === QueryStatus.SIGNED ? null : "closed";
}
export const rowsForTile = (rows: readonly QcRow[], tile: TileCourt): QcRow[] =>
  rows.filter((r) => tileCourt(r.status) === tile);

export interface CourtTile {
  key: TileCourt;
  name: string;
  count: number;
  /** The one italic line under the count. */
  fact: string;
  /** The fact is a count of queries past their date: ink, weight 600, rather than 45%. */
  urgent: boolean;
  /** The rust dot at the band's right — the court where the move is yours. */
  rust: boolean;
  /** §1 · the foot's left half: the agents in this court, in date order, at most `FOOT_DISCS`. */
  who: readonly CourtDisc[];
  /** How many further AGENTS the discs stand for — see `courtFoot`. Zero draws no `+N`. */
  more: number;
  /** §1 · the foot's right half, or null where there is no date this court can honestly state. */
  /** §5 (v96.1) — always present; `date` is `—` where the court has none. */
  when: CourtWhen;
}

/** One overlapping initials disc in a desk section's foot. */
/** `queryId` is the query that put the agent on the desk — the one a disc opens (v126 §7). */
export interface CourtDisc { initials: string; name: string; queryId?: string }
/**
 * The foot's right-hand fact: a label the COURT owns, and a date that may not exist.
 *
 * ⚠️ §5 (v96.1) — `date: null` IS THE ABSENCE, AND THE EM DASH IS THE RENDERER'S. Storing "—" here
 * would make every consumer compare against a punctuation mark to find out whether there is a date
 * — and the accessible name needs exactly that question, because an em dash is a convention for
 * the EYE and "next due em dash" is not something to say out loud.
 */
export interface CourtWhen { label: string; date: string | null }

/** The discs a section shows before it starts counting. */
export const FOOT_DISCS = 4;

/**
 * §1 · the foot of one desk section.
 *
 * ⚠️ THE DISCS ARE AGENTS, SO `+N` COUNTS AGENTS AND NOT QUERIES. An initials disc is a person; two
 * discs reading RV for the same Rosalind Vale would say there are two of her. The reference's own
 * demo has one query per agent, so there the two readings coincide and it cannot settle the
 * question — on a real account they differ by a lot (56 agent's-turn queries over about twenty
 * agents), and the count has to mean the same thing as the thing it is counting.
 *
 * ⚠️ THE RIGHT-HAND FACT IS THE NEXT FUTURE DATE, AND WHERE THERE IS NONE IT IS OMITTED. "next
 * reply expected" over a date that has already gone is false, and an em dash under that label is a
 * label with nothing to label. The italic line above already carries the pressing fact, so the foot
 * saying only who is in the court is a smaller loss than the foot stating something untrue.
 *
 * ⚠️ AND CLOSED RUNS THE OTHER WAY. There is no date due on a finished query, so its order is the
 * most recently closed first and its fact is the LAST close — the one date a closed court has. The
 * day it closed is `stageStartMs`, the day it reached the stage, never `lastMs`, which is the last
 * thing that happened to the query and moves whenever anyone adds a note to it.
 */
export function courtFoot(rows: readonly QcRow[], key: TileCourt, nowMs: number): Pick<CourtTile, "who" | "more" | "when"> {
  const closed = key === "closed";
  /* undated last in either direction — a missing date is not a position on the scale */
  const at = (r: QcRow): number | null => (closed ? r.stageStartMs : r.expectedMs);
  const ordered = [...rows].sort((a, b) => {
    const x = at(a);
    const y = at(b);
    if (x == null) return y == null ? 0 : 1;
    if (y == null) return -1;
    return closed ? y - x : x - y;
  });
  const seen = new Set<string>();
  const who: CourtDisc[] = [];
  let agents = 0;
  for (const r of ordered) {
    const id = r.query.agentId || `row:${r.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    agents += 1;
    if (who.length < FOOT_DISCS) who.push({ initials: r.initials, name: r.agentName, queryId: r.id });
  }
  /**
   * ⚠️ §5 (v96.1) · THE CLAUSE ALWAYS RENDERS; THE DATE IS WHAT CAN BE MISSING. It used to be
   * dropped whole when there was no date, with a note arguing that a label with nothing to label is
   * worse than nothing — and the cost of that is three sections with three different shapes, where
   * the one with the least to say looks like the one that failed to load. **Ruled otherwise (Nick,
   * 3 Oct): the words still render, with an em dash.** The absence of a date is a fact about the
   * court, and it is the same fact for everyone reading it.
   *
   * The LABEL is a property of the court, never of the date — which is what makes this possible at
   * all: "next due" / "next reply expected" / "last closed" are known before any row is consulted.
   */
  const label = closed ? "last closed" : key === "you" ? "next due" : "next reply expected";
  let date: string | null = null;
  if (closed) {
    const last = ordered.find((r) => r.stageStartMs != null)?.stageStartMs;
    if (last != null) date = shortDay(last);
  } else {
    const next = ordered.find((r) => r.expectedMs != null && r.expectedMs >= nowMs)?.expectedMs;
    if (next != null) date = key === "you" ? shortWeekDay(next) : shortDay(next);
  }
  const when: CourtWhen = { label, date };
  return { who, more: Math.max(0, agents - who.length), when };
}

/**
 * The three tiles, in the page's order, from one pass over the rows.
 *
 * ⚠️ A TILE AT ZERO SAYS "none yet" RATHER THAN STATING A FIGURE OF NOTHING. "0 passed · 0 no reply"
 * is two facts about an empty set, and "your move on these" about nothing is an instruction with no
 * object — the same rule the Overview's cards were written to.
 */
export function courtTiles(rows: readonly QcRow[], nowMs: number = Date.now()): CourtTile[] {
  const you = rowsForTile(rows, "you");
  const agent = rowsForTile(rows, "agent");
  const closed = rowsForTile(rows, "closed");
  const offers = you.filter((r) => r.status === QueryStatus.OFFER).length;
  const past = agent.filter((r) => r.pastExpected).length;
  const passed = closed.filter((r) => r.closedHow === "passed").length;
  const noReply = closed.filter((r) => r.closedHow === "noReply").length;
  return [
    {
      key: "you", name: COURT_LABEL.you, count: you.length,
      fact: you.length === 0 ? "none yet" : offers > 0 ? `${offers} offer${offers === 1 ? "" : "s"} to decide` : "your move on these",
      urgent: false, rust: you.length > 0,
      ...courtFoot(you, "you", nowMs),
    },
    {
      key: "agent", name: COURT_LABEL.agent, count: agent.length,
      fact: agent.length === 0 ? "none yet" : past > 0 ? `${past} past the date` : "all in the window",
      urgent: past > 0, rust: false,
      ...courtFoot(agent, "agent", nowMs),
    },
    {
      key: "closed", name: COURT_LABEL.closed, count: closed.length,
      fact: closed.length === 0 ? "none yet" : `${passed} passed · ${noReply} no reply`,
      urgent: false, rust: false,
      ...courtFoot(closed, "closed", nowMs),
    },
  ];
}

/* ── the sentence: one filter, one manuscript scope, one sort ── */
export type QcFilter = "all" | "you" | "agent" | "offers" | "past" | "closed" | `stage:${QueryStatus}` | `court:${TileCourt}`;
export const stageFilter = (s: QueryStatus): QcFilter => `stage:${s}`;
/**
 * §1 · the filter a DESK SECTION applies — its own membership, so a section and the list it
 * produces cannot disagree.
 *
 * ⚠️ IT IS NOT `"you"` / `"agent"` / `"closed"`, AND THE DIFFERENCE IS MEASURABLE. The menu's
 * `"you"` reads `withYou` (`court === "you"`), which EXCLUDES an offer, while the with-you SECTION
 * counts offers in — `tileCourt` folds them there. And the menu's `"closed"` reads `court`, which
 * INCLUDES Withdrawn so those queries stay findable, while `tileCourt` returns null for Withdrawn
 * and Signed so the closed section does not count them. Measured on the harness account: pressing
 * the two sections with the menu's keys gave 12 rows under a section saying 13, and 14 under a
 * section saying 13. One function counts a section and filters to it; the menu keeps its own finer
 * options, which are a different and deliberate question.
 */
/**
 * §2 — the Find field's match: the agent's name or their agency, case- and accent-insensitively.
 *
 * ⚠️ IT IS A SEPARATE PASS FROM `matchesFilter`, NOT A SIXTH FACET. The filter answers "which court
 * / stage / state", and the desk's counts are derived from the UNFILTERED scope precisely so a
 * narrowing cannot move them; folding a text search into the same function would invite the next
 * reader to count through it. An empty term matches everything, so the caller needs no branch.
 */
export const matchesFind = (row: QcRow, term: string): boolean => {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  /* ⚠️ `agencyKey`, NOT `agency`. The latter is the DISPLAY line and reads "No agency" where there
     is none — searchable text nobody typed, so "no agency" would find a set of queries by matching
     words the app wrote about them. The key is what the writer recorded. */
  const hay = `${row.agentName ?? ""} ${row.agencyKey ?? ""}`.toLowerCase();
  return hay.includes(t);
};

export const courtFilter = (t: TileCourt): QcFilter => `court:${t}`;
export const courtOfFilter = (f: QcFilter): TileCourt | null =>
  f.startsWith("court:") ? (f.slice("court:".length) as TileCourt) : null;
export function matchesFilter(row: QcRow, f: QcFilter): boolean {
  switch (f) {
    case "all": return true;
    case "you": return row.withYou;
    case "agent": return row.court === "agent";
    case "offers": return row.court === "offer";
    case "past": return row.pastExpected;
    case "closed": return row.court === "closed"; /* Withdrawn included, so those queries stay findable */
    default: {
      const court = courtOfFilter(f);
      if (court) return tileCourt(row.status) === court;
      return row.status === (f.slice("stage:".length) as QueryStatus);
    }
  }
}
export const inScope = (row: QcRow, manuscriptId: string | null): boolean => manuscriptId == null || row.manuscriptId === manuscriptId;

export interface FilterOption { key: QcFilter; label: string; count: number; swatch: string | null }
/** Counts read the manuscript-scoped set, never the filtered view — a menu that counted what it had already narrowed would show zeros. */
export function filterOptions(scoped: readonly QcRow[]): FilterOption[] {
  const n = (f: QcFilter) => scoped.filter((r) => matchesFilter(r, f)).length;
  const sw = (s: State) => `var(--state-${s})`;
  return [
    { key: "all", label: "All queries", count: n("all"), swatch: null },
    { key: "you", label: "With you", count: n("you"), swatch: sw("you") },
    { key: "agent", label: "With the agent", count: n("agent"), swatch: sw("agent") },
    { key: "offers", label: "Offers", count: n("offers"), swatch: sw("offer") },
    { key: "past", label: "Past expected", count: n("past"), swatch: null },
    ...stageOrder(scoped.filter((r) => r.court !== "closed")).map((s) => ({ key: stageFilter(s), label: STAGE_NAME[s], count: n(stageFilter(s)), swatch: sw(stateFor(s)) })),
    { key: "closed", label: "Closed", count: n("closed"), swatch: sw("closed") },
  ];
}
/**
 * §2 (v95) · the list head's title — `All 83 queries` at rest, `21 of 83 queries` with a filter on.
 *
 * ⚠️ IT IS A COUNT, NOT THE FILTER'S PHRASE. The sentence used to BE the filter control and said
 * "13 with you"; the head states how much of the list you are looking at and the three controls
 * beside it say what is doing the narrowing, so the two halves do not both describe the filter.
 *
 * ⚠️ AND THE MANUSCRIPT SCOPE IS A NARROWING LIKE ANY OTHER. With one chosen the total is the
 * scoped total, so "21 of 24" is 24 queries on THIS manuscript — the number the desk above is also
 * counting. A total of every query on the account would make the two disagree.
 */
export const listTitle = (visible: number, total: number): string =>
  visible === total
    ? `All ${total} ${total === 1 ? "query" : "queries"}`
    : `${visible} of ${total} ${total === 1 ? "query" : "queries"}`;

/** The first phrase. It rewrites itself; with a manuscript chosen it carries the title. */
export function filterPhrase(f: QcFilter, count: number, opts: { manuscriptTitle?: string | null; calendar?: boolean } = {}): string {
  const base =
    f === "all" ? `All ${count} ${count === 1 ? "query" : "queries"}`
      : f === "you" ? `${count} with you`
        : f === "agent" ? `${count} with the agent`
          : f === "offers" ? `${count} ${count === 1 ? "offer" : "offers"}`
            : f === "past" ? `${count} past expected`
              : f === "closed" ? `${count} closed`
                /* a desk section's own phrasing — the section's name, lower-cased into the sentence */
                : courtOfFilter(f) ? `${count} ${COURT_LABEL[courtOfFilter(f) as TileCourt].toLowerCase()}`
                  : `${count} ${STAGE_NAME[f.slice("stage:".length) as QueryStatus].toLowerCase()}`;
  return `${base}${opts.manuscriptTitle ? ` for ${opts.manuscriptTitle}` : ""}${opts.calendar ? " on the calendar" : ""}`;
}

export type QcSort = "activity" | "newest" | "reply" | "you" | "agent" | "agency";
export const DEFAULT_SORT: QcSort = "activity";
/** No appraisal wording: "with you first" says where the rows go, not what they are. */
/**
 * ⚠️ `label` IS THE MENU'S AND `short` IS THE CONTROL'S, from ONE table (§2, v95). The head draws
 * the chosen value inside the control — `sort latest activity ⌄`, which is what the reference
 * renders — while the menu names the whole thing, "Latest activity first", because a menu is a
 * list of alternatives and needs to say in what sense. One table, so the two cannot drift.
 */
export const SORT_OPTIONS: readonly { key: QcSort; label: string; short: string }[] = [
  { key: "activity", label: "latest activity first", short: "latest activity" },
  { key: "newest", label: "newest query first", short: "newest query" },
  { key: "reply", label: "next reply date first", short: "next reply date" },
  { key: "you", label: "with you first", short: "with you" },
  { key: "agent", label: "agents A to Z", short: "agents A–Z" },
  { key: "agency", label: "agencies A to Z", short: "agencies A–Z" },
];
const FAR = Number.MAX_SAFE_INTEGER;
const attentionRow = (r: QcRow): AttentionRow => ({
  register: r.court === "you" ? "you" : r.court === "offer" ? "offer" : r.court === "closed" ? "closed" : r.pastExpected ? "late" : "calm",
  expectedMs: r.expectedMs, closedMs: r.court === "closed" ? r.stageStartMs : null, lastActivityMs: r.lastMs,
});
export function sortRows(rows: readonly QcRow[], sort: QcSort): QcRow[] {
  const byActivity = (a: QcRow, b: QcRow) => b.lastMs - a.lastMs || a.id.localeCompare(b.id);
  const cmp: Record<QcSort, (a: QcRow, b: QcRow) => number> = {
    activity: byActivity,
    newest: (a, b) => (b.sentMs ?? 0) - (a.sentMs ?? 0) || byActivity(a, b),
    /* absence sorts LAST: a query with no date cannot be the next to land */
    reply: (a, b) => (a.expectedMs ?? FAR) - (b.expectedMs ?? FAR) || byActivity(a, b),
    /* ⚠️ "with you first" IS THE PAGE'S EXISTING ATTENTION ORDER, KEPT AND RELABELLED — `compareAttention`,
       not a second ranking: with you, then past the expected date, then offers, then the rest by the
       soonest date, then closed by the most recent close. The label says where the rows go and
       nothing about what they are. */
    you: (a, b) => compareAttention(attentionRow(a), attentionRow(b)) || byActivity(a, b),
    agent: (a, b) => a.agentName.localeCompare(b.agentName, "en-GB") || byActivity(a, b),
    /* ⚠️ NO AGENCY SORTS LAST, BY A BOOLEAN — not by a sentinel string. U+FFFF is a noncharacter and
       ICU collation ignores it, so an agency-less agent sorted FIRST. */
    agency: (a, b) => Number(!a.agencyKey) - Number(!b.agencyKey) || a.agencyKey.localeCompare(b.agencyKey, "en-GB") || a.agentName.localeCompare(b.agentName, "en-GB"),
  };
  return [...rows].sort(cmp[sort]);
}

/* ── the list's fact line ── */
/**
 * What stands under the status name. Writer's turn keeps the app's "N days since request", and
 * gains "due 3 Oct · 14 days left" IN FRONT of it only when `expectedSendDate` exists — a due date
 * is never derived from anything else.
 */
export function factLine(row: QcRow, nowMs: number): string {
  const since = row.stageStartMs != null ? wholeDays(row.stageStartMs, nowMs) : null;
  if (row.court === "closed") return row.stageStartMs != null ? `closed ${shortDay(row.stageStartMs)}` : "close not dated";
  if (row.court === "you") {
    const tail = since != null ? `${since} ${since === 1 ? "day" : "days"} since request` : "request not dated";
    if (row.expectedMs == null) return tail;
    const due = row.expectedMs >= nowMs
      ? `due ${shortDay(row.expectedMs)} · ${spanWords(wholeDays(nowMs, row.expectedMs))} left`
      : `due ${shortDay(row.expectedMs)} · ${spanWords(wholeDays(row.expectedMs, nowMs))} past`;
    return `${due} · ${tail}`;
  }
  if (row.court === "offer") return since != null ? `${spanWords(since)} since the offer` : "offer not dated";
  if (row.expectedMs == null) return since != null ? `no date promised · ${spanWords(since)} waiting` : "no date promised";
  /* "past expected", the sentence filter's own words — the full phrase ran past a 240px column */
  if (row.expectedMs < nowMs) return `${spanWords(since ?? 0)} waiting · ${spanWords(wholeDays(row.expectedMs, nowMs))} past expected`;
  return `reply by ${shortDay(row.expectedMs)} · ${spanWords(wholeDays(nowMs, row.expectedMs))} away`;
}
/** The card footer's two lines: where it stands, in words. */
export function standLine(row: QcRow): string {
  const first = row.agentName.split(" ")[0] || row.agentName;
  if (row.court === "closed") return STAGE_NAME[row.status];
  if (row.court === "offer") return `${first} has offered representation`;
  if (row.court === "you") {
    const what = row.status === QueryStatus.PARTIAL_REQUESTED ? "partial" : row.status === QueryStatus.FULL_REQUESTED ? "full" : "revisions";
    return `${first} is waiting on your ${what}`;
  }
  return row.status === QueryStatus.PARTIAL_SENT ? `${first} has your partial` : row.status === QueryStatus.FULL_SENT || row.status === QueryStatus.RESUBMITTED ? `${first} has your full` : `Waiting on ${first}`;
}

/* ── ?status= — the deep link's four values, onto the sentence ── */
/**
 * ⚠️ "attention" MEANT "overdue for a reply" (`needsOverdue`), NOT "with you". It maps to Past
 * expected, which is what it has always selected; nothing in the app generates the link today.
 */
export function filterForStatusParam(p: "all" | "attention" | "awaiting" | "closed"): QcFilter {
  return p === "attention" ? "past" : p === "awaiting" ? "agent" : p === "closed" ? "closed" : "all";
}

/* ── the action in the card's footer ── */
export function primaryActionLabel(status: QueryStatus): string | null {
  if (isClosedStatus(status)) return null;
  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED: return "Mark partial sent";
    case QueryStatus.FULL_REQUESTED: return "Mark full sent";
    case QueryStatus.REVISE_RESUBMIT: return "Record your resubmission";
    case QueryStatus.OFFER: return "Record your decision";
    default: return "Record a response";
  }
}
