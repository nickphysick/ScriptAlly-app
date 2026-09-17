/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashBreakdown — "Where your queries stand" (dashboard stage 2, 17 Sep).
 *
 * ⚠️ ONE PARTITION, AND EVERY LIVE FIGURE ON THE PAGE IS READ OFF IT. A query is LIVE when it is on
 * the board — it carries a usable send date, the ledger's own `sentAt` — and its status is not
 * closed. The header's "queries out", the chart's headline, the five columns and the R&R/offer line
 * beneath them are all this set, so "header = columns + footer" holds by construction rather than
 * by five counts that happen to agree.
 *
 * ⚠️ OFFER IS LIVE (Nick, 17 Sep). The chart used to count an offer as closed while the agent list
 * and the manuscripts page counted it as active; the dashboard now agrees with them, and the ledger's
 * `TERMINAL` set in `oneScreen.ts` was changed in the same pass so the chart's line agrees too.
 *
 * ⚠️ AN UNDATED QUERY IS NOT ON THE BOARD, HERE OR ON THE CHART. That is the ledger's rule and this
 * reuses it rather than restating it: a count that included undated imports would disagree with the
 * line it sits above the moment one existed.
 */
import { Activity, Agent, Query, QueryStatus } from "../types";
import { sentAt } from "./oneScreen";
import { resolveExpectedDate } from "./expectedDate";
import { getActivityTime, normalizeResultingStatus } from "./queryDerivation";

const DAY_MS = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The seven statuses a live query can hold — everything but a pass, a withdrawal or silence. */
export const LIVE_STATUSES: readonly QueryStatus[] = [
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
];

export const isLive = (q: Query): boolean => LIVE_STATUSES.includes(q.status) && sentAt(q) !== null;

export const liveQueries = (queries: readonly Query[]): Query[] => queries.filter(isLive);

/** The header's and the chart's figure — the size of the live set. */
export const liveCount = (queries: readonly Query[]): number => liveQueries(queries).length;

export type BreakdownTone = "queried" | "you" | "agent";

export interface BreakdownColumnSpec {
  status: QueryStatus;
  /** the pill's words — how far the query has got, never a verdict */
  label: string;
  /** which state token fills the pill */
  tone: BreakdownTone;
  /** the ball is with the writer — the column is marked */
  court: boolean;
}

/** The five columns, in the pipeline's order. R&R and Offer are live and deliberately not columns. */
export const BREAKDOWN_COLUMNS: readonly BreakdownColumnSpec[] = [
  { status: QueryStatus.QUERIED, label: "Queried", tone: "queried", court: false },
  { status: QueryStatus.PARTIAL_REQUESTED, label: "Partial req", tone: "you", court: true },
  { status: QueryStatus.PARTIAL_SENT, label: "Partial sent", tone: "agent", court: false },
  { status: QueryStatus.FULL_REQUESTED, label: "Full req", tone: "you", court: true },
  { status: QueryStatus.FULL_SENT, label: "Full sent", tone: "agent", court: false },
];

export interface BreakdownColumn extends BreakdownColumnSpec {
  count: number;
  /** the fact line — `""` renders an empty line, never a placeholder */
  fact: string;
}

export interface Breakdown {
  /** every live query — the header's figure */
  total: number;
  columns: BreakdownColumn[];
  rr: number;
  offer: number;
  /** `Plus 1 R&R · 1 offer`, or null when both are zero */
  extras: string | null;
}

export interface BreakdownInput {
  /** the manuscript-scoped queries */
  queries: readonly Query[];
  /** the manuscript-scoped activity log — the send anchors come from here first */
  activities: readonly Activity[];
  /** the agent records, for each agency's stated reply window */
  agents: readonly Agent[];
  now: Date;
}

const startOfDay = (ms: number): number => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** "18 Sep", or "18 Sep 2025" when the year is not the current one. */
export const shortDate = (ms: number, now: Date): string => {
  const d = new Date(ms);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
};

/** Whole days between two instants, counted on the calendar rather than in 24-hour blocks. */
const daysBetween = (from: number, to: number): number =>
  Math.max(0, Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS));

/** "oldest 116 days" — the longest-waiting query at the letter stage. */
export const queriedFact = (queried: readonly Query[], now: Date): string => {
  const sends = queried.map(sentAt).filter((t): t is number => t !== null);
  if (!sends.length) return "";
  const n = daysBetween(Math.min(...sends), now.getTime());
  if (n === 0) return "oldest sent today";
  return `oldest ${n} ${n === 1 ? "day" : "days"}`;
};

/**
 * When a stage's pages went out — the LOG first, the derived field only as a fallback.
 *
 * ⚠️ THE SAME ORDER THE QUERY CARD READS (queryAmbient §1b). `partialSentDate` / `fullSentDate` are
 * `recomputeQuery`'s OUTPUT and are missing on some records; the log is its input and is what always
 * exists. The LATEST such event wins, because a re-sent partial restarts the wait.
 */
export const stageSentAt = (
  q: Query,
  stage: QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT,
  log: readonly Activity[],
): { ms: number | null; fromLog: boolean } => {
  let latest: number | null = null;
  for (const a of log) {
    if (a.queryId !== q.id || normalizeResultingStatus(a.resultingStatus) !== stage) continue;
    const t = getActivityTime(a.date);
    if (t > 0 && (latest === null || t > latest)) latest = t;
  }
  if (latest !== null) return { ms: latest, fromLog: true };
  const field = stage === QueryStatus.PARTIAL_SENT ? q.partialSentDate : q.fullSentDate;
  const t = typeof field === "string" && field ? new Date(field).getTime() : NaN;
  return { ms: Number.isFinite(t) ? t : null, fromLog: false };
};

/**
 * Each sent query's expected reply, where somebody STATED one — the agency's window, or a date the
 * writer set. `resolveExpectedDate` never returns the app's 8/12/12-week default, which is exactly
 * why it is the resolver here: a date nobody stated is not a due date.
 *
 * ⚠️ A WINDOW AN AGENT STATES INSIDE A REPLY IS NOT READ HERE. It lives in each query's own event
 * log, which only the reading pane loads; the dashboard has the global feed, which does not carry it.
 */
export const statedReplyDates = (
  sent: readonly Query[],
  stage: QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT,
  input: Pick<BreakdownInput, "activities" | "agents">,
): number[] => {
  const agentById = new Map(input.agents.map((a) => [a.id, a]));
  const out: number[] = [];
  for (const q of sent) {
    const weeks = agentById.get(q.agentId)?.responseTimeWeeks;
    const anchor = stageSentAt(q, stage, input.activities).ms;
    const r = resolveExpectedDate(q, anchor, typeof weeks === "number" && weeks > 0 ? weeks : null, null);
    if (r.ms != null) out.push(r.ms);
  }
  return out;
};

/**
 * "reply due 18 Sep" — the soonest stated date still ahead; "reply was due 13 Sep" when every one has
 * passed (the most recent of them); "" when nobody stated anything.
 */
export const replyDueFact = (dates: readonly number[], now: Date): string => {
  if (!dates.length) return "";
  const today = startOfDay(now.getTime());
  const ahead = dates.filter((t) => startOfDay(t) >= today);
  if (ahead.length) return `reply due ${shortDate(Math.min(...ahead), now)}`;
  return `reply was due ${shortDate(Math.max(...dates), now)}`;
};

/** `Plus 1 R&R · 1 offer`, omitting a zero half; null when both are zero. */
export const extrasLine = (rr: number, offer: number): string | null => {
  const parts: string[] = [];
  if (rr > 0) parts.push(`${rr} R&R`);
  if (offer > 0) parts.push(`${offer} ${offer === 1 ? "offer" : "offers"}`);
  return parts.length ? `Plus ${parts.join(" · ")}` : null;
};

export const queryBreakdown = (input: BreakdownInput): Breakdown => {
  const live = liveQueries(input.queries);
  const byStatus = (s: QueryStatus) => live.filter((q) => q.status === s);
  const columns = BREAKDOWN_COLUMNS.map((spec): BreakdownColumn => {
    const set = byStatus(spec.status);
    let fact = "";
    if (set.length) {
      if (spec.status === QueryStatus.QUERIED) fact = queriedFact(set, input.now);
      else if (spec.court) fact = "in your court";
      else fact = replyDueFact(statedReplyDates(set, spec.status as QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT, input), input.now);
    }
    return { ...spec, count: set.length, fact };
  });
  const rr = byStatus(QueryStatus.REVISE_RESUBMIT).length;
  const offer = byStatus(QueryStatus.OFFER).length;
  const total = live.length;
  /* ⚠️ THE RECONCILIATION IS ASSERTED, NOT ASSUMED. The seven statuses partition the live set, so
     this cannot fail today — it is here for the day a status is added to one list and not the other. */
  const sum = columns.reduce((a, c) => a + c.count, 0) + rr + offer;
  if (sum !== total) {
    console.warn(`[dashBreakdown] the columns (${sum}) do not add up to the live queries (${total})`);
  }
  return { total, columns, rr, offer, extras: extrasLine(rr, offer) };
};

/**
 * The quick-actions footer's DAY — days since this manuscript's first query, that day being day 1.
 * Null before the first query goes out.
 */
export const queryingDay = (queries: readonly Query[], now: Date): number | null => {
  const sends = queries.map(sentAt).filter((t): t is number => t !== null);
  if (!sends.length) return null;
  return daysBetween(Math.min(...sends), now.getTime()) + 1;
};
