/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v2, Part 2 — HOME'S FIGURES (ref design-refs/phone-app-v2/src/v2.js `heroBand`, `screenHome2`).
 *
 * ⚠️ NOTHING HERE IS A NEW COUNT. The hero reads the dashboard chart's own ledger (`oneScreen.dailyLedger`, rolled up
 *    weekly by `aggregateLedger`, the same weekly series the phone dashboard's Active card drew); "Where they stand"
 *    reads the Query Centre's `whereItStands` sets through `queriesPhone.chipCounts`, so its numbers ARE the Queries
 *    tab's chip counts.
 *
 * ⚠️ TWO OF THE REF'S FOUR SERIES EXIST. The ledger carries `active` (a stock) and `sent` (a flow); it has no replies
 *    and no requests, and nothing else in the app keeps either as a series over time. So the switch offers Active and
 *    Sent — Replies and Requests are left out rather than derived here (the report says so).
 */
import type { Query, QueryStatus } from "../types";
import { aggregateLedger, dailyLedger, sentAt } from "./oneScreen";
import { liveQueries } from "./dashBreakdown";
import { dayMonth } from "./dates";

export type HeroSeries = "active" | "sent";
export type HeroRange = "1M" | "3M" | "All";
export const HERO_SERIES: readonly HeroSeries[] = ["active", "sent"];
export const HERO_RANGES: readonly HeroRange[] = ["1M", "3M", "All"];
export const SERIES_LABEL: Record<HeroSeries, string> = { active: "Active", sent: "Sent" };
export const SERIES_NOUN: Record<HeroSeries, string> = { active: "active queries", sent: "queries sent" };
/** how many weekly points each range draws (the ref's RANGE: 5 and 13; All is every week) */
export const RANGE_POINTS: Record<Exclude<HeroRange, "All">, number> = { "1M": 5, "3M": 13 };

export interface Hero {
  /** the big number: now, whatever the range */
  value: number;
  /** the line, oldest first */
  values: number[];
  /** the change across the range: last point less first */
  change: number;
  /** "in the last month" · "in the last 3 months" · "since 13 Jul" */
  phrase: string;
}

/**
 * The hero for one series and one range. Active's number is the dashboard's live count (the desktop chart's headline,
 * `liveQueries`); Sent's is every query with a send date (`sentAt`, the one definition of "sent"). The line is the weekly
 * ledger: Active its closing stock, Sent the running total of its sends.
 */
export function heroFor(scoped: readonly Query[], now: Date, series: HeroSeries, range: HeroRange): Hero {
  const weekly = aggregateLedger(dailyLedger(scoped as Query[], now), "weekly");
  let run = 0;
  const all = weekly.map((w) => (series === "active" ? w.active : (run += w.sent)));
  const values = range === "All" ? all : all.slice(-RANGE_POINTS[range]);
  const value = series === "active" ? liveQueries(scoped).length : scoped.filter((q) => sentAt(q) !== null).length;
  const change = values.length ? values[values.length - 1] - values[0] : 0;
  const firstSent = scoped.map(sentAt).filter((x): x is number => x !== null).sort((a, b) => a - b)[0];
  const phrase = range === "1M" ? "in the last month" : range === "3M" ? "in the last 3 months"
    : firstSent != null ? `since ${dayMonth(firstSent)}` : "so far";
  return { value, values, change, phrase };
}

/** the ref's smoothed line through the points (v2.js `sparkPath`): cubic segments with the control points at mid-x */
export function sparkPath(vals: readonly number[], w: number, h: number, pad = 6): { d: string; last: [number, number] } {
  if (vals.length === 0) return { d: "", last: [w, h - pad] };
  const pts = vals.length === 1 ? [vals[0], vals[0]] : [...vals];
  const max = Math.max(...pts), min = 0;
  const dx = w / (pts.length - 1);
  const xy = pts.map((v, i): [number, number] => [i * dx, h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2)]);
  let d = `M${xy[0][0]} ${xy[0][1]}`;
  for (let i = 1; i < xy.length; i++) {
    const [x0, y0] = xy[i - 1], [x1, y1] = xy[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  return { d, last: xy[xy.length - 1] };
}

/** the closed line's split: passes and no-replies, by status, over the Closed chip's own rows */
export function closedSplit(statuses: readonly (QueryStatus | string)[]): { passed: number; noReply: number } {
  return {
    passed: statuses.filter((s) => s === "Rejected").length,
    noReply: statuses.filter((s) => s === "No Response").length,
  };
}

/** the switch's remembered choice, per device (absent or unreadable → Active · 3M) */
export const HERO_KEY = "sa.phoneHero";
export function readHero(): { series: HeroSeries; range: HeroRange } {
  try {
    const v = JSON.parse(localStorage.getItem(HERO_KEY) ?? "null") as { series?: string; range?: string } | null;
    const series = HERO_SERIES.includes(v?.series as HeroSeries) ? (v!.series as HeroSeries) : "active";
    const range = HERO_RANGES.includes(v?.range as HeroRange) ? (v!.range as HeroRange) : "3M";
    return { series, range };
  } catch { return { series: "active", range: "3M" }; }
}
export function writeHero(v: { series: HeroSeries; range: HeroRange }): void {
  try { localStorage.setItem(HERO_KEY, JSON.stringify(v)); } catch { /* private mode */ }
}
