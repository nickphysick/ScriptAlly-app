/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v154 (design-refs/query-centre-v154.html) — the header's weekly goal chart: the last twenty weeks of
 * queries sent, this week against the goal, and the streak. The weeks are lib/milestones `weekStreak`'s (London
 * Mondays, the Streaks & goals feature's own count of `dateSent`), and the goal is the weekly target in force
 * (lib/queryingGoals `resolveGoal`).
 *
 * ⚠️ NO GOAL IS INVENTED SILENTLY: with no weekly target in force the chart reads `FALLBACK_WEEKLY_GOAL` and says so
 *    in its result (`goalFromWriter: false`) — a deferred decision, named in the v154 report, never a stored value.
 */
import type { QueryingGoalEntry } from "../types";
import { weekStreak } from "./milestones";
import { resolveGoal } from "./queryingGoals";

const DAY = 86_400_000;

/** ⚠️ DEFERRED: the goal when the writer has no weekly target in force (none set, or a fortnight or month cadence) */
export const FALLBACK_WEEKLY_GOAL = 3;
export const CHART_WEEKS = 20;

export interface GoalWeek154 {
  /** the Monday, a London day "YYYY-MM-DD" */
  start: string;
  count: number;
  /** count ≥ the goal */
  met: boolean;
  current: boolean;
}
export interface WeekGoal154 {
  goal: number;
  /** true when the goal is the writer's own weekly target; false when it is `FALLBACK_WEEKLY_GOAL` */
  goalFromWriter: boolean;
  /** oldest first, the last is this week */
  weeks: GoalWeek154[];
  now: number;
  /** how many more this week to reach the goal; 0 once met */
  left: number;
  /** consecutive completed weeks before this one that met the goal (this week never breaks it) */
  streak: number;
  /** nothing sent, ever */
  empty: boolean;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const asUtc = (d: string): Date => new Date(`${d}T00:00:00Z`);
const addDays = (d: string, n: number): string => new Date(asUtc(d).getTime() + n * DAY).toISOString().slice(0, 10);
/** "3 Nov" */
export const weekDay = (d: string): string => `${Number(d.slice(8, 10))} ${MON[Number(d.slice(5, 7)) - 1]}`;
export const monthOf = (d: string): string => MON[Number(d.slice(5, 7)) - 1];

/** the headline's words */
export const goalHeadline = (m: Pick<WeekGoal154, "now" | "goal">): string => `${m.now} of ${m.goal} this week`;
export const streakWords = (k: number): string => `${k}-week streak`;
export const goalNudge = (left: number): string =>
  left <= 0 ? "Goal met — nice work." : left === 1 ? "One more keeps the streak going." : `${left} more keeps the streak going.`;
export const goalLineWords = (goal: number): string => `your goal · ${goal} a week`;
export const barTip = (w: Pick<GoalWeek154, "start" | "count">): string => `w/c ${weekDay(w.start)} · ${w.count} sent`;

export function weekGoal154(sentMs: readonly (number | null)[], entries: readonly QueryingGoalEntry[] | undefined, nowMs: number, span = CHART_WEEKS): WeekGoal154 {
  const g = resolveGoal(entries ? [...entries] : undefined, new Date(nowMs));
  const goalFromWriter = !!g && g.cadence === "week";
  const goal = goalFromWriter ? g!.target : FALLBACK_WEEKLY_GOAL;
  const s = weekStreak(sentMs, entries, nowMs);
  const byStart = new Map(s.weeks.map((w) => [w.start, w]));
  const thisMonday = s.weeks[s.weeks.length - 1].start;
  const weeks: GoalWeek154[] = [];
  for (let i = span - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i);
    const w = byStart.get(start);
    /* each past week is read against the weekly target in force THAT week, else this chart's goal */
    const target = w?.target ?? goal;
    const count = w?.count ?? 0;
    weeks.push({ start, count, met: count >= target, current: i === 0 });
  }
  /* the streak runs back over every week on record, not only the twenty drawn */
  let streak = 0;
  for (let i = s.weeks.length - 2; i >= 0; i--) {
    const w = s.weeks[i];
    if (w.count < (w.target ?? goal)) break;
    streak++;
  }
  const now = weeks[weeks.length - 1].count;
  const empty = !sentMs.some((ms) => typeof ms === "number" && Number.isFinite(ms) && ms <= nowMs);
  return { goal, goalFromWriter, weeks, now, left: Math.max(0, goal - now), streak, empty };
}

/** month labels under the first week of each month; the first bar's only when no other label crowds it */
export function monthLabels(weeks: readonly Pick<GoalWeek154, "start">[], minGap = 3): { i: number; label: string }[] {
  const out: { i: number; label: string }[] = [];
  for (let i = 1; i < weeks.length; i++) if (monthOf(weeks[i].start) !== monthOf(weeks[i - 1].start)) out.push({ i, label: monthOf(weeks[i].start) });
  if (weeks.length && Number(weeks[0].start.slice(8, 10)) <= 7 && (out.length === 0 || out[0].i >= minGap)) out.unshift({ i: 0, label: monthOf(weeks[0].start) });
  return out;
}
