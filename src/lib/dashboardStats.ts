/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard stat selectors — the ONE data source behind the v37 dashboard's stat renderings
 * (full-width cards, focus-slot minis, focused panels) and the greeting eyebrow. Pure functions
 * over the queries/agents collections so they are unit-testable; no component may re-derive
 * these numbers its own way.
 *
 * Canon respected here (do not re-invent):
 *  - Response counting: each query counts at most once — `hasAgentResponded` (derived by
 *    recomputeQuery) with the legacy status-set fallback for un-migrated docs.
 *  - Active = the non-terminal pipeline statuses (STATUS_ORDER journey).
 *  - "Awaiting a reply" = active queries whose ball-holder is the agent (Queried / Partial
 *    Sent / Full Sent) — mirrors getPrimaryAction's classification without storing it.
 *  - Agents/idle = agentBuckets (lib/lifecycle.ts): idle = no queries ∧ open/unknown ∧ not set aside.
 */
import { Agent, Query, QueryStatus } from "../types";
import { agentBuckets } from "./lifecycle";

/** Monday 00:00 (local) of the ISO week containing `d`. */
export const isoWeekStart = (d: Date): Date => {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // Mon=0 … Sun=6
  out.setDate(out.getDate() - dow);
  return out;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const parseWhen = (v: unknown): number | null => {
  if (!v) return null;
  const t = typeof v === "string" || v instanceof Date ? new Date(v as any).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

/** Sends per ISO week for the trailing `bins` weeks; index bins-1 = the current week. */
export const weeklySendSeries = (queries: Query[], now: Date, bins = 8): number[] => {
  const series = Array(bins).fill(0);
  const thisWeek = isoWeekStart(now).getTime();
  for (const q of queries) {
    const t = parseWhen(q.dateSent);
    if (t === null) continue;
    const diff = Math.round((thisWeek - isoWeekStart(new Date(t)).getTime()) / WEEK_MS);
    const idx = bins - 1 - diff;
    if (idx >= 0 && idx < bins) series[idx]++;
  }
  return series;
};

/** Sends in the current ISO week (the "+N this week" pill). */
export const sendsThisWeek = (queries: Query[], now: Date): number =>
  weeklySendSeries(queries, now, 1)[0];

const ACTIVE_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
]);

/** Active queries whose ball-holder is the agent (writer has sent; no agent move yet). */
const AWAITING_REPLY_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_SENT,
]);

/** Legacy fallback for docs recomputeQuery hasn't migrated — mirrors Dashboard's rule exactly. */
const LEGACY_RESPONSE_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
  QueryStatus.REJECTED,
]);

export const activeQueriesOf = (queries: Query[]): Query[] =>
  queries.filter((q) => ACTIVE_STATUSES.has(q.status));

export const awaitingReplyCount = (queries: Query[]): number =>
  queries.filter((q) => AWAITING_REPLY_STATUSES.has(q.status)).length;

export const responsesReceivedCount = (queries: Query[]): number =>
  queries.filter((q) =>
    q.hasAgentResponded !== undefined ? q.hasAgentResponded : LEGACY_RESPONSE_STATUSES.has(q.status),
  ).length;

export const responseRatePercent = (queries: Query[]): number =>
  queries.length > 0 ? Math.round((responsesReceivedCount(queries) / queries.length) * 100) : 0;

export const idleAgentCount = (agents: Agent[], queries: Query[]): number =>
  agentBuckets<Agent>(agents, queries).idle.length;

export const shownAgentCount = (agents: Agent[], queries: Query[]): number => {
  const b = agentBuckets<Agent>(agents, queries);
  return b.queried.length + b.idle.length;
};

/** Active-pipeline mix for the segmented bar, in journey order, zero stages dropped. */
export const pipelineMix = (queries: Query[]): { status: QueryStatus; count: number }[] => {
  const order = [
    QueryStatus.QUERIED,
    QueryStatus.PARTIAL_REQUESTED,
    QueryStatus.PARTIAL_SENT,
    QueryStatus.FULL_REQUESTED,
    QueryStatus.FULL_SENT,
    QueryStatus.REVISE_RESUBMIT,
  ];
  return order
    .map((status) => ({ status, count: queries.filter((q) => q.status === status).length }))
    .filter((s) => s.count > 0);
};

const WEEK_WORDS = [
  "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];

/**
 * "WEEK NINE OF QUERYING" — ISO weeks since the user's earliest query activity (earliest
 * dateSent), spelled as a word when ≤ twelve, numeric after; `week one` when underivable.
 */
export const weekOfQuerying = (queries: Query[], now: Date): string => {
  const times = queries.map((q) => parseWhen(q.dateSent)).filter((t): t is number => t !== null);
  if (times.length === 0) return "week one";
  const earliest = isoWeekStart(new Date(Math.min(...times))).getTime();
  const diff = Math.round((isoWeekStart(now).getTime() - earliest) / WEEK_MS);
  const n = Math.max(1, diff + 1);
  return `week ${n <= 12 ? WEEK_WORDS[n - 1] : n}`;
};

/** The attention chip's text — singular at exactly 1. */
export const chipText = (n: number): string =>
  n === 1 ? "1 thing needs your attention" : `${n} things need your attention`;

/** Greeting salutation by local hour: morning < 12 ≤ afternoon < 18 ≤ evening. */
export const salutation = (now: Date): "Good morning" | "Good afternoon" | "Good evening" => {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/** "Friday 3 July" (en-GB, no ordinal suffix — v37 top bar + eyebrow format). */
export const longDate = (now: Date): string =>
  now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
