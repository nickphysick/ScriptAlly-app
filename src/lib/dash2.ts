/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dash2 — Dashboard v2's figures (3 Nov; ref design-refs/dashboard-v2).
 *
 * ⚠️ NOTHING HERE IS A NEW DERIVATION. The weekly totals are the ledger's own stock (`dailyLedger` → weekly), the
 * week's breakdown is `weekMix` folded by `weekCallout` (v116's three groups plus "Stage not dated"), and the band's
 * "weeks querying" is whole weeks since the first send. This module only arranges them for the card.
 */
import type { Query } from "../types";
import { aggregateLedger, dailyLedger, sentAt, type LedgerPoint } from "./oneScreen";
import { indexActivities, weekMix, type ActivityIndex } from "./dashWeekMix";
import { weekCallout, type WeekGroupKey } from "./dashHover";
import { isoWeekStart } from "./dashboardStats";
import type { Activity } from "../types";
import { MONTHS_SHORT } from "./dates";

const WEEK_MS = 7 * 86_400_000;
const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

/* ── the band's tag ───────────────────────────────────────────────────────────────────────────── */
/* v2.1 retired the three tiles (waiting on you, have replied, weeks querying) and their three helpers with them. */

/**
 * Dashboard v2.1 · the band's tag: WHOLE weeks since the manuscript's first query was sent, by calendar day (so a week
 * across the clocks changing is still seven days). Null before the first send — the tag is not drawn then.
 * ⚠️ NOT v2's retired `weeksQuerying`, which counted the ISO weeks a campaign spans, this week included, so a query sent
 * on a Sunday read "2 weeks" on the Monday. The tag states elapsed whole weeks.
 */
export function wholeWeeksQuerying(queries: readonly Query[], now: Date): number | null {
  const times = queries.map((q) => sentAt(q)).filter((t): t is number => t !== null && t <= now.getTime());
  if (times.length === 0) return null;
  const f = new Date(Math.min(...times));
  const from = Date.UTC(f.getFullYear(), f.getMonth(), f.getDate());
  const to = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(Math.round((to - from) / 86_400_000) / 7);
}

/** "1 week querying" · "{n} weeks querying" */
export const weeksTag = (n: number): string => `${n} ${n === 1 ? "week" : "weeks"} querying`;

/** Sent since this ISO week began — the band's "+{n} this week". */
export function sentThisWeek(queries: readonly Query[], now: Date): number {
  const from = isoWeekStart(now).getTime();
  return queries.filter((q) => { const s = sentAt(q); return s !== null && s >= from && s <= now.getTime(); }).length;
}

/* ── the weeks ───────────────────────────────────────────────────────────────────────────────── */

export interface Dash2Week {
  /** Monday of the week */
  start: Date;
  /** the instant the week's figure is read at: its close, or now for this week */
  atMs: number;
  /** the ledger's active stock at that instant */
  total: number;
  /** "3 Aug" */
  label: string;
  now: boolean;
}

/** One point per ISO week of the campaign, the last being this week. The ledger's own weekly roll-up. */
export function dash2Weeks(queries: readonly Query[], now: Date): Dash2Week[] {
  const weekly: LedgerPoint[] = aggregateLedger(dailyLedger([...queries], now), "weekly");
  return weekly.map((p, i) => ({
    start: p.start,
    atMs: Math.min(p.end.getTime(), now.getTime()),
    total: p.active,
    label: dayMonth(p.start),
    now: i === weekly.length - 1,
  }));
}

/** The last weeks that fit, at least `pitch` px apart, between `inset` from each edge. */
export function visibleWeeks<T>(weeks: readonly T[], plotW: number, inset = 18, pitch = 30): T[] {
  if (plotW <= 0) return weeks.slice(-2);
  const room = Math.max(1, Math.floor((plotW - 2 * inset) / pitch) + 1);
  return weeks.slice(-Math.max(2, room));
}

/** Five labels: the first week, three between, and "Today" — indexes into the visible weeks. */
export function dateLabels(weeks: readonly { label: string }[]): { i: number; text: string }[] {
  const n = weeks.length;
  if (n === 0) return [];
  if (n === 1) return [{ i: 0, text: "Today" }];
  const at = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1)));
  const seen = new Set<number>();
  return at.filter((i) => (seen.has(i) ? false : (seen.add(i), true)))
    .map((i) => ({ i, text: i === n - 1 ? "Today" : weeks[i].label }));
}

/* ── the breakdown ───────────────────────────────────────────────────────────────────────────── */

export interface BreakdownRow { key: WeekGroupKey | "undated"; label: string; color: string; n: number }
export interface Breakdown { total: number; change: string; rows: BreakdownRow[] }

/** The card's colours (the brief's), keyed to `weekCallout`'s groups. */
export const BREAKDOWN_COLOR: Record<BreakdownRow["key"], string> = {
  queried: "#2d3a50", partial: "#8592a8", full: "#c9d1dd", undated: "#dcd6cc",
};

export const changeText = (d: number): string => (d > 0 ? `+${d} on last week` : d < 0 ? `−${-d} on last week` : "no change");

export { indexActivities };
export type { ActivityIndex };

/**
 * The week's breakdown: every group, zero rows included (the card hides them); the rows sum to `total` by
 * construction (`weekMix` partitions the set the ledger counted). `prevAtMs` is the week before's instant, or null.
 */
export function breakdownFor(queries: readonly Query[], index: ActivityIndex, atMs: number, prevAtMs: number | null, now: Date): Breakdown {
  const mix = weekMix(queries, index, atMs, now);
  const prev = prevAtMs === null ? null : weekMix(queries, index, prevAtMs, now).total;
  const c = weekCallout(mix, prev);
  const rows: BreakdownRow[] = [
    ...c.groups.map((g) => ({ key: g.key, label: g.label, color: BREAKDOWN_COLOR[g.key], n: g.n })),
    { key: "undated" as const, label: "Stage not dated", color: BREAKDOWN_COLOR.undated, n: c.undated },
  ];
  return { total: mix.total, change: changeText(prev === null ? 0 : mix.total - prev), rows };
}

/** "Week of 3 Aug: 14 active queries" — each circle's accessible name. */
export const weekAria = (label: string, n: number): string => `Week of ${label}: ${n} active ${n === 1 ? "query" : "queries"}`;

/* ── v2.2 · Sent: queries first sent, per week ──────────────────────────────────────────────────────── */

export interface SentWeek {
  /** queries first sent in this week (Monday to the next Monday, never past now) */
  ids: string[];
  n: number;
  /** every query first sent up to the end of this week (or now) — "{n} sent in all" */
  cumulative: number;
}

/** The end of a Monday-started week: the next Monday at local midnight (so a clocks-change week is still seven days). */
const weekEnd = (start: Date): number => { const e = new Date(start); e.setDate(e.getDate() + 7); return e.getTime(); };

/**
 * One entry per week given (Active's own weeks, `dash2Weeks`), counting each query ONCE at its first-sent date
 * (`sentAt`, the ledger's own). A query with no sent date is skipped, never placed. Newest last, as the weeks are.
 */
export function sentWeeks(queries: readonly Query[], weeks: readonly { start: Date }[], now: Date): SentWeek[] {
  const nowMs = now.getTime();
  const sent = queries
    .map((q) => ({ id: q.id, t: sentAt(q) }))
    .filter((x): x is { id: string; t: number } => x.t !== null && x.t <= nowMs)
    .sort((a, b) => a.t - b.t);
  return weeks.map((w) => {
    const from = w.start.getTime(), to = Math.min(weekEnd(w.start), nowMs + 1);
    const ids = sent.filter((x) => x.t >= from && x.t < to).map((x) => x.id);
    return { ids, n: ids.length, cumulative: sent.filter((x) => x.t < to).length };
  });
}

/** every query for this manuscript ever sent, up to now — the band's "{n} queries sent" */
export function sentAllTime(queries: readonly Query[], now: Date): number {
  return queries.filter((q) => { const s = sentAt(q); return s !== null && s <= now.getTime(); }).length;
}

/** "26 queries sent" / "1 query sent" */
export const sentCount = (n: number): string => `${n} ${n === 1 ? "query" : "queries"} sent`;
/** "Week of 3 Aug: 2 sent" — each Sent column's accessible name. */
export const sentWeekAria = (label: string, n: number): string => `Week of ${label}: ${n} sent`;

/** Pass-through so the card's caller can build the index once. */
export const activityIndex = (activities: readonly Activity[]): ActivityIndex => indexActivities(activities);
