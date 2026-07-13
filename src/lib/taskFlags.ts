/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskFlags — pure helpers for the stance store (`users/{uid}/taskFlags`): the deterministic doc-id
 * composite, the derived-task ↔ flag match, and whether a flag currently suppresses its task. The
 * components (taskType/queryId/agentId/rule) are stored as FIELDS as well as folded into the id, so
 * re-deriving the id later is a migration, not data loss. See `TaskFlag` in types.ts.
 */

import { TaskFlag, DismissedTask } from "../types";

/** Derived task types keyed to an AGENT record (its relatedRecordId is an agentId). */
const AGENT_TASK_TYPES: ReadonlySet<string> = new Set(["data_quality_poor", "dream_agent_unqueried"]);

/** A far-future snooze that reads as "muted indefinitely" (until the Phase 5 mute model lands). */
export const MUTED_UNTIL = "3000-01-01T00:00:00.000Z";

export interface TaskFlagKey {
  taskType: string;
  queryId?: string;
  agentId?: string;
  rule?: string;
}

/** Deterministic composite id. Firestore-safe (fields are snake_case / ids), re-derivable. */
export function taskFlagId(key: TaskFlagKey): string {
  return [key.taskType, `q_${key.queryId ?? ""}`, `a_${key.agentId ?? ""}`, `r_${key.rule ?? ""}`].join("__");
}

/** The flag key for a derived engine Task — classifies relatedRecordId as query- vs agent-court. */
export function flagKeyForTask(taskType: string, relatedRecordId: string): TaskFlagKey {
  return AGENT_TASK_TYPES.has(taskType) ? { taskType, agentId: relatedRecordId } : { taskType, queryId: relatedRecordId };
}

/** Does this flag point at that derived task? (matches on the stored components, not the id). */
export function flagMatchesTask(flag: TaskFlag, taskType: string, relatedRecordId: string): boolean {
  if (flag.taskType !== taskType) return false;
  return flag.queryId === relatedRecordId || flag.agentId === relatedRecordId;
}

/** Should this flag hide its derived task right now? — snoozed into the future (far-future = muted). */
export function isFlagSuppressing(flag: TaskFlag, now: number): boolean {
  return !!flag.snoozedUntil && new Date(flag.snoozedUntil).getTime() > now;
}

/** Migrate one legacy DismissedTask into a TaskFlag (permanent → indefinite mute; else the snooze). */
export function buildTaskFlagFromDismissed(d: DismissedTask, userId: string): TaskFlag {
  const key = flagKeyForTask(d.taskType, d.relatedRecordId);
  const snoozedUntil = d.dismissType === "permanent" ? MUTED_UNTIL : d.resurfaceDate;
  return {
    id: taskFlagId(key),
    userId,
    taskType: d.taskType,
    ...(key.queryId ? { queryId: key.queryId } : {}),
    ...(key.agentId ? { agentId: key.agentId } : {}),
    snoozeCount: 1,
    ...(snoozedUntil ? { snoozedUntil } : {}),
  };
}
