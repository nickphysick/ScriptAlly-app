/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MILESTONES AND THE WEEKLY STREAK (Phone app v2, Part 7D — Streaks & goals). Pure; derived from the writer's own
 * queries on every read and NEVER STORED.
 *
 * Milestones: First query · 10 out · First request · First full · 25 out · First offer. Each date is the writer's own
 * first event, read from `buildRows`' rows (`sentMs`, and `stageMs` — the earliest activity per status, the one
 * mechanism every stage date in the app comes from). A milestone reached with no date to it is earned and says so; one
 * not reached says how far along it is ("16 of 25") or, where nothing counts towards it, "Ahead".
 *
 * The streak: Monday weeks on the London calendar (`periodBounds("week")`, the goals' own boundary). A week is MET when
 * the queries sent in it reach the WEEKLY target in force that week (`resolveGoal`, from the append-only goal entries
 * — the app keeps no other goal history). Where no weekly target is in force, a week is met by sending at least one
 * query — the dashboard's own streak rule (`achievementPill`). The current week counts only once it is met: a week in
 * progress is never a missed week, and no week after today is ever read.
 */
import { QueryStatus, type QueryingGoalEntry } from "../types";
import { londonDay, periodBounds, resolveGoal, type Day } from "./queryingGoals";
import type { AnalyticsRow } from "./analytics";

const DAY = 86_400_000;
export type MilestoneKey = "first" | "ten" | "request" | "full" | "twentyfive" | "offer";
export interface Milestone {
  key: MilestoneKey;
  label: string;
  /** the glyph its badge carries */
  status: QueryStatus;
  earned: boolean;
  /** the instant it was earned; null when it was earned undated, or not earned */
  atMs: number | null;
  /** for a count not yet reached: "{n} of {target}"; for one nothing counts towards: "Ahead" */
  progress: string | null;
}
type Row = Pick<AnalyticsRow, "sentMs" | "stageMs" | "reachedRequest" | "reachedFull" | "reachedOffer">;

const earliest = (vals: readonly (number | null | undefined)[]): number | null => {
  const v = vals.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? Math.min(...v) : null;
};

export function milestones(rows: readonly Row[]): Milestone[] {
  const sent = rows.map((r) => r.sentMs).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  const nth = (n: number): Milestone["atMs"] => sent[n - 1] ?? null;
  const out = (key: MilestoneKey, label: string, status: QueryStatus, n: number): Milestone => {
    const earned = rows.length >= n;
    return { key, label, status, earned, atMs: earned ? nth(n) : null, progress: earned ? null : `${rows.length} of ${n}` };
  };
  const first = (key: MilestoneKey, label: string, status: QueryStatus, reached: boolean, at: number | null): Milestone =>
    ({ key, label, status, earned: reached, atMs: reached ? at : null, progress: reached ? null : "Ahead" });
  return [
    { key: "first", label: "First query", status: QueryStatus.QUERIED, earned: rows.length > 0, atMs: rows.length ? nth(1) : null, progress: rows.length ? null : "Ahead" },
    out("ten", "10 out", QueryStatus.PARTIAL_SENT, 10),
    first("request", "First request", QueryStatus.PARTIAL_REQUESTED, rows.some((r) => r.reachedRequest),
      earliest(rows.flatMap((r) => [r.stageMs[QueryStatus.PARTIAL_REQUESTED], r.stageMs[QueryStatus.FULL_REQUESTED]]))),
    first("full", "First full", QueryStatus.FULL_REQUESTED, rows.some((r) => r.reachedFull),
      earliest(rows.map((r) => r.stageMs[QueryStatus.FULL_REQUESTED] ?? (r.reachedOffer ? r.stageMs[QueryStatus.OFFER] : null)))),
    out("twentyfive", "25 out", QueryStatus.FULL_SENT, 25),
    first("offer", "First offer", QueryStatus.OFFER, rows.some((r) => r.reachedOffer), earliest(rows.map((r) => r.stageMs[QueryStatus.OFFER]))),
  ];
}

/* ══ the weekly streak ══ */

export interface StreakWeek {
  /** the Monday, a London day */
  start: Day;
  count: number;
  /** the weekly target in force that week; null when none is (then one query meets it) */
  target: number | null;
  met: boolean;
  /** the week that contains today */
  current: boolean;
}
export interface Streak {
  /** oldest first, ending with the current week */
  weeks: StreakWeek[];
  /** consecutive met weeks ending with the current week (if met) or the one before it */
  current: number;
  best: number;
}

const noon = (d: Day): Date => new Date(`${d}T12:00:00Z`);
const mondayOf = (at: Date): Day => periodBounds("week", at).start;

export function weekStreak(sentMs: readonly (number | null)[], entries: readonly QueryingGoalEntry[] | undefined, nowMs: number): Streak {
  const today = new Date(nowMs);
  const thisMonday = mondayOf(today);
  const counts = new Map<Day, number>();
  let firstMonday: Day | null = null;
  for (const ms of sentMs) {
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms > nowMs) continue;
    const m = mondayOf(new Date(ms));
    counts.set(m, (counts.get(m) ?? 0) + 1);
    if (!firstMonday || m < firstMonday) firstMonday = m;
  }
  if (!firstMonday) firstMonday = thisMonday;
  const weeks: StreakWeek[] = [];
  for (let t = noon(firstMonday).getTime(); ; t += 7 * DAY) {
    const start = mondayOf(new Date(t));
    if (start > thisMonday) break;
    const g = resolveGoal(entries ? [...entries] : undefined, noon(start));
    const target = g && g.cadence === "week" ? g.target : null;
    const count = counts.get(start) ?? 0;
    weeks.push({ start, count, target, met: count >= (target ?? 1), current: start === thisMonday });
    if (start === thisMonday) break;
  }
  let best = 0, run = 0;
  for (const w of weeks) { run = w.met ? run + 1 : 0; best = Math.max(best, run); }
  let current = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i];
    if (w.current && !w.met) continue; // a week in progress is never a missed week
    if (!w.met) break;
    current++;
  }
  return { weeks, current, best };
}

/** today's London day, for callers that need to show "this week" without a second clock */
export const todayDay = (nowMs: number): Day => londonDay(new Date(nowMs));
