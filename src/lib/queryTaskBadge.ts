/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * queryTaskBadge — per-query open-task summary for the Queries-Hub control ribbon's "Tasks" tile.
 *
 * Derived over the existing derived Task[] (db.tsx already excludes dismissed/resolved tasks), so a
 * query's `count` is its live open-task count. Tasks link back via `relatedRecordId === query.id`
 * (the same key logNudge + the To-do focus queue use). The urgent-vs-housekeeping split reuses the
 * SAME taskType classification the dashboard's "Over to you" (urgent) and "When you have a moment"
 * (housekeeping) streams draw — kept in one place here and drift-guarded against OverToYou.tsx by
 * queryTaskBadge.test.ts (a text assertion, so the lib stays pure — no component import).
 *
 * DELIBERATELY PURE: no React, no Firebase.
 */

import { Task } from "../types";

/** Urgent (writer's-turn / offer / overdue-chase) task types — mirror OverToYou.URGENT_TYPES. */
export const URGENT_TASK_TYPES = [
  "offer_received",
  "partial_requested",
  "full_requested",
  "revise_resubmit",
  "nudge_overdue",
] as const;

/** Housekeeping (recommended) task types — mirror OverToYou.HOUSEKEEPING_TYPES. */
export const HOUSEKEEPING_TASK_TYPES = [
  "dream_agent_unqueried",
  "querying_unstarted",
  "data_quality_poor",
  "no_response_close",
] as const;

export type QueryTaskTier = "urgent" | "housekeeping" | null;
export interface QueryTaskBadge {
  count: number;
  /** "urgent" if ANY open task is urgent-type; else "housekeeping" if only housekeeping; else null. */
  tier: QueryTaskTier;
}

const URGENT = URGENT_TASK_TYPES as readonly string[];
const HOUSEKEEPING = HOUSEKEEPING_TASK_TYPES as readonly string[];

/**
 * Summarise the open tasks that belong to `queryId`. Only tasks whose type actually renders as
 * actionable (urgent ∪ housekeeping) are counted — an unclassified type contributes nothing.
 */
export function queryTaskBadge(tasks: Task[], queryId: string): QueryTaskBadge {
  let count = 0;
  let hasUrgent = false;
  let hasHousekeeping = false;
  for (const t of tasks) {
    if (t.relatedRecordId !== queryId) continue;
    const isUrgent = URGENT.includes(t.taskType);
    const isHousekeeping = !isUrgent && HOUSEKEEPING.includes(t.taskType);
    if (!isUrgent && !isHousekeeping) continue;
    count += 1;
    if (isUrgent) hasUrgent = true;
    else hasHousekeeping = true;
  }
  return { count, tier: hasUrgent ? "urgent" : hasHousekeeping ? "housekeeping" : null };
}
