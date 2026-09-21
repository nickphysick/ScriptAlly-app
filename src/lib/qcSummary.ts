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
import { Activity, Agent, Query, QueryStatus } from "../types";
import { agentAgencyLine, agentInitials, agentPrimary } from "./agentDisplay";
import { buildRows as analyticsRows } from "./analytics";
import { compareAttention, type AttentionRow } from "./queryAttentionSort";
import { resolveExpectedDate } from "./expectedDate";
import { cardMaterials, stateFor, turnFor, type CardMaterials, type State } from "./queryCardFacts";
import type { DerivableActivity } from "./queryDerivation";
import { anyToMs, dayN, isClosedStatus, stageHistory, type StageHistory } from "./qcStages";
import { FAN_MAX_DEALT } from "./qcFan";

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
};
/** Six columns; seven — R&R between Full sent and Offer — only while a live R&R exists. */
export function stageOrder(rows: readonly QcRow[]): QueryStatus[] {
  const rr = rows.some((r) => r.status === QueryStatus.REVISE_RESUBMIT);
  if (!rr) return [...BASE_STAGES];
  const out = [...BASE_STAGES];
  out.splice(out.indexOf(QueryStatus.OFFER), 0, QueryStatus.REVISE_RESUBMIT);
  return out;
}
/** The calendar's groups: by who must act first, R&R after Full requested, Closed last. */
export const CALENDAR_GROUPS: readonly (QueryStatus | "closed")[] = [
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER,
  QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, "closed",
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
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDay = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]}`; };
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
 * What stays is what the Overview and the fan read: `rowsForStage`, `rowsForClosed`,
 * `rowsWithdrawn`, `rowsForCard`, `fanHand` and `overviewCards`.
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

/* ── the Overview's stat row (v21 §3.1) ── */

export type OverviewKey = QueryStatus | "closed";
export interface OverviewCard {
  key: OverviewKey;
  /** The status whose glyph the card draws. The closed card draws the closed mark. */
  status: QueryStatus;
  name: string;
  count: number;
  /** The one mono line under the name. */
  note: string;
  /** The note is a count of queries past their date: ink, weight 600, rather than 45%. */
  urgent: boolean;
  /** The rust dot after the glyph — the two states where the move is yours and material is owed. */
  rust: boolean;
}

/**
 * One card per status, in pipeline order, and Closed last.
 *
 * ⚠️ THE ROW IS SEVEN CARDS, OR EIGHT WHILE A LIVE R&R EXISTS — and the eighth is `stageOrder`'s
 * own decision, not a second rule written here. The strip's stage columns and this row would
 * otherwise disagree about whether R&R is a thing on this account, which is exactly the class of
 * fault the shared selectors above exist to foreclose.
 *
 * ⚠️ AND THE MONO LINE STATES A FACT, NEVER A VERDICT. "N past the date" is the app's wording for a
 * date that has gone by; "overdue" and "late" are forbidden here as everywhere (CLAUDE.md). A card
 * at zero says "none" rather than stating a figure of nothing — including the closed card, whose
 * "0 passed · 0 no reply" would be two facts about an empty set.
 */
export function overviewCards(rows: readonly QcRow[], nowMs: number): OverviewCard[] {
  void nowMs; /* `pastExpected` is already derived against now when the rows are built */
  const live = rows.filter((r) => r.court !== "closed");
  const cards: OverviewCard[] = stageOrder(live).map((status) => {
    const mine = rowsForStage(rows, status);
    const past = mine.filter((r) => r.pastExpected).length;
    const owed = status === QueryStatus.PARTIAL_REQUESTED || status === QueryStatus.FULL_REQUESTED;
    const note = mine.length === 0 ? "none"
      : past > 0 ? `${past} past the date`
        : owed ? "your move"
          : status === QueryStatus.OFFER ? "decision due"
            : "in the window";
    return {
      key: status, status, name: STAGE_NAME[status], count: mine.length,
      note, urgent: mine.length > 0 && past > 0, rust: owed && mine.length > 0,
    };
  });
  const closed = rowsForClosed(rows);
  const passed = closed.filter((r) => r.closedHow === "passed").length;
  const noReply = closed.filter((r) => r.closedHow === "noReply").length;
  cards.push({
    key: "closed", status: QueryStatus.REJECTED, name: "Closed", count: closed.length,
    note: closed.length === 0 ? "none" : `${passed} passed · ${noReply} no reply`,
    urgent: false, rust: false,
  });
  return cards;
}

/** The rows a stat card deals when it is clicked — the same membership its count states. */
export function rowsForCard(rows: readonly QcRow[], key: OverviewKey): QcRow[] {
  return key === "closed" ? rowsForClosed(rows) : rowsForStage(rows, key);
}

/**
 * The hand the fan lays out for a stat card: at most fifteen query cards, latest activity first,
 * and the number left over (v21 §5, Nick's ruling of 21 Sep).
 *
 * ⚠️ IT READS `rowsForCard`, SO THE DEAL AND THE COUNT CANNOT DISAGREE — which is the whole point of
 * the shared selectors above, and the cap is the one place that claim could quietly stop being true.
 * The stat card's figure is still `count`; the header still says "50 queried"; what is capped is how
 * many of them get a card. `more` is therefore `count - FAN_MAX_DEALT`, never a separate count of
 * anything.
 *
 * ⚠️ LATEST ACTIVITY FIRST, AND THE SORT IS PART OF THE CLAIM. "The fifteen most recent" is only
 * meaningful against a stated order; taking the first fifteen of whatever order the rows arrived in
 * would deal an arbitrary fifteen and still pass a length check.
 */
export interface FanHand { dealt: QcRow[]; more: number; count: number }
export function fanHand(rows: readonly QcRow[], key: OverviewKey): FanHand {
  const all = rowsForCard(rows, key).slice().sort((a, b) => b.lastMs - a.lastMs);
  return { dealt: all.slice(0, FAN_MAX_DEALT), more: Math.max(0, all.length - FAN_MAX_DEALT), count: all.length };
}

/* ── the sentence: one filter, one manuscript scope, one sort ── */
export type QcFilter = "all" | "you" | "agent" | "offers" | "past" | "closed" | `stage:${QueryStatus}`;
export const stageFilter = (s: QueryStatus): QcFilter => `stage:${s}`;
export function matchesFilter(row: QcRow, f: QcFilter): boolean {
  switch (f) {
    case "all": return true;
    case "you": return row.withYou;
    case "agent": return row.court === "agent";
    case "offers": return row.court === "offer";
    case "past": return row.pastExpected;
    case "closed": return row.court === "closed"; /* Withdrawn included, so those queries stay findable */
    default: return row.status === (f.slice("stage:".length) as QueryStatus);
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
/** The first phrase. It rewrites itself; with a manuscript chosen it carries the title. */
export function filterPhrase(f: QcFilter, count: number, opts: { manuscriptTitle?: string | null; calendar?: boolean } = {}): string {
  const base =
    f === "all" ? `All ${count} ${count === 1 ? "query" : "queries"}`
      : f === "you" ? `${count} with you`
        : f === "agent" ? `${count} with the agent`
          : f === "offers" ? `${count} ${count === 1 ? "offer" : "offers"}`
            : f === "past" ? `${count} past expected`
              : f === "closed" ? `${count} closed`
                : `${count} ${STAGE_NAME[f.slice("stage:".length) as QueryStatus].toLowerCase()}`;
  return `${base}${opts.manuscriptTitle ? ` for ${opts.manuscriptTitle}` : ""}${opts.calendar ? " on the calendar" : ""}`;
}

export type QcSort = "activity" | "newest" | "reply" | "you" | "agent" | "agency";
export const DEFAULT_SORT: QcSort = "activity";
/** No appraisal wording: "with you first" says where the rows go, not what they are. */
export const SORT_OPTIONS: readonly { key: QcSort; label: string }[] = [
  { key: "activity", label: "latest activity first" },
  { key: "newest", label: "newest query first" },
  { key: "reply", label: "next reply date first" },
  { key: "you", label: "with you first" },
  { key: "agent", label: "agents A to Z" },
  { key: "agency", label: "agencies A to Z" },
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
  return row.status === QueryStatus.PARTIAL_SENT ? `${first} has your partial` : row.status === QueryStatus.FULL_SENT ? `${first} has your full` : `Waiting on ${first}`;
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
