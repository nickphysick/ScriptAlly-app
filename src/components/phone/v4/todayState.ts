/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — what Today is showing, from data alone (PA4-4): straight after a task, day one (no queries), everyday
 * (tasks), or a quiet day (queries and no task).
 */
export type TodayState = "everyday" | "after" | "quiet" | "dayone";
export function todayState(queries: number, tasks: number, after: boolean): TodayState {
  if (after) return "after";
  if (queries === 0) return "dayone";
  return tasks > 0 ? "everyday" : "quiet";
}
