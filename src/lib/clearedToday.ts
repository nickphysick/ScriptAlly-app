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
 *
 * ⚠️ THE THREE CONTRIBUTORS OVERLAP, AND THE UNION MUST SUBTRACT THE OVERLAP (workspace P0B).
 * Closing a query as "no response" does two things at once: it logs a STATUS_CHANGED activity
 * AND it resolves the matching TaskFlag. Both are dated today, so a flat concatenation rendered
 * ONE completion as TWO done rows — "Closed {agent} — no response" beside "{agent} — sorted" —
 * which is the same agent appearing twice on the board, and a `clearedTodayCount` that
 * overcounted by one for every such close. The act, not the record, is the unit: a resolved flag
 * whose query already has a clearing activity today IS that activity, so the flag drops.
 *
 * The activity is kept as the survivor deliberately — it carries the real vocabulary of what
 * happened ("Closed X — no response"), where the flag can only say a gap shut.
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

/** Declared structurally rather than by `Pick`, because `Activity.queryId` is REQUIRED on the
 *  full type and this reads it only as a join key — a caller counting activities should not be
 *  forced to carry a field the count does not need. */
export interface ClearedTodayInput {
  activities: { activityType: string; date?: string; queryId?: string }[];
  userTasks: Pick<UserTask, "done" | "completedAt">[];
  taskFlags: { resolvedAt?: string; queryId?: string }[];
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
  A extends { activityType: string; date?: string; queryId?: string },
  U extends { done: boolean; completedAt?: string },
  F extends { resolvedAt?: string; queryId?: string },
>(inp: { activities: A[]; userTasks: U[]; taskFlags: F[]; now?: number }): ClearedToday<A, U, F> {
  const now = inp.now ?? Date.now();
  const activities = inp.activities.filter(
    (a) => CLEARING_ACTIVITY_TYPES.has(a.activityType) && !!a.date && sameLocalDay(new Date(a.date).getTime(), now)
  );
  // The overlap subtraction (see the header note): every query that already reported itself today
  // through the activity log. A flag pointing at one of these is the SAME act, not a second one.
  // A flag with no queryId (an agent-scoped housekeeping gap) can never collide, so it always
  // stands — absence of a pointer is not a match.
  const spokenFor = new Set(activities.map((a) => a.queryId).filter((id): id is string => !!id));
  return {
    activities,
    userTasks: inp.userTasks.filter((t) => t.done && !!t.completedAt && sameLocalDay(new Date(t.completedAt).getTime(), now)),
    flags: inp.taskFlags.filter(
      (f) => !!f.resolvedAt && sameLocalDay(new Date(f.resolvedAt).getTime(), now) && !(f.queryId && spokenFor.has(f.queryId))
    ),
  };
}

export function clearedTodayCount(inp: ClearedTodayInput): number {
  const c = clearedTodayItems(inp);
  return c.activities.length + c.userTasks.length + c.flags.length;
}
