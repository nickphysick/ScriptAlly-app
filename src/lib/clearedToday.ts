/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * clearedToday — "cleared today" is a UNION computed on read, never a stored counter (a counter
 * would desync the first time something is completed from the Queries Hub instead of the To-do
 * page). Three contributors:
 *   · a query action logged today  — an activity of a clearing type dated today
 *   · a Your-task completed today   — UserTask.done && completedAt is today
 *   · a housekeeping gap closed today — TaskFlag.resolvedAt is today
 * Pure + unit-tested; the component derives from this, never counts by hand.
 */

import { ActivityType, TaskFlag, UserTask } from "../types";

/** Activity types that represent a query action the writer completed (not passive events). */
export const CLEARING_ACTIVITY_TYPES: ReadonlySet<string> = new Set<string>([
  ActivityType.QUERY_SENT,
  ActivityType.MATERIALS_SENT,
  ActivityType.NUDGE_SENT,
  ActivityType.STATUS_CHANGED,
]);

function sameLocalDay(aMs: number, bMs: number): boolean {
  if (Number.isNaN(aMs) || Number.isNaN(bMs)) return false;
  const a = new Date(aMs);
  const b = new Date(bMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface ClearedTodayInput {
  activities: Pick<import("../types").Activity, "activityType" | "date">[];
  userTasks: Pick<UserTask, "done" | "completedAt">[];
  taskFlags: Pick<TaskFlag, "resolvedAt">[];
  now?: number;
}

/** The union members cleared today, kept as the objects passed in (generic) so callers can render
 *  cards from them. The count and the "Cleared today" column derive from ONE source — no desync. */
export interface ClearedToday<A, U, F> {
  activities: A[];
  userTasks: U[];
  flags: F[];
}

export function clearedTodayItems<
  A extends { activityType: string; date?: string },
  U extends { done: boolean; completedAt?: string },
  F extends { resolvedAt?: string },
>(inp: { activities: A[]; userTasks: U[]; taskFlags: F[]; now?: number }): ClearedToday<A, U, F> {
  const now = inp.now ?? Date.now();
  return {
    activities: inp.activities.filter((a) => CLEARING_ACTIVITY_TYPES.has(a.activityType) && !!a.date && sameLocalDay(new Date(a.date).getTime(), now)),
    userTasks: inp.userTasks.filter((t) => t.done && !!t.completedAt && sameLocalDay(new Date(t.completedAt).getTime(), now)),
    flags: inp.taskFlags.filter((f) => !!f.resolvedAt && sameLocalDay(new Date(f.resolvedAt).getTime(), now)),
  };
}

export function clearedTodayCount(inp: ClearedTodayInput): number {
  const c = clearedTodayItems(inp);
  return c.activities.length + c.userTasks.length + c.flags.length;
}
