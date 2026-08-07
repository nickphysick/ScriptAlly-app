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
/* ── THE RETURN BOUNDARY (tasks-audit P1) — the ONE classification every consumer uses ─────────
   ⚠️ THE BUG THIS SETTLES: nothing owned the boundary. The engine suppressed by the INSTANT
   (`until > now`) while other readers compared their own ways, and an offer's quiet-reminder flag
   (which never suppresses — "I need time" keeps the card on the board, quieter) was ALSO picked
   up by the flags-built Snoozed column: "Tom Ellery has made an offer" rendered in BOTH To do and
   Snoozed, twice in the calendar's today cell.
   THE LAW: the boundary is the DAY, from the same local clock the calendar uses. An item with
   snoozedUntil on a day AFTER today is SLEEPING; on today or before it is RETURNED — it renders
   once, in the lanes, carrying the return chip on the return day only. No stored state flips:
   the same derivation answers differently after midnight. */

const localYmdOf = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** SLEEPING: the return day is still ahead. (Day-level — "BACK 7 AUG" on 7 Aug means BACK.) */
export function flagSleeps(flag: Pick<TaskFlag, "snoozedUntil">, nowMs: number): boolean {
  if (!flag.snoozedUntil) return false;
  const until = Date.parse(flag.snoozedUntil);
  if (Number.isNaN(until)) return false;
  return localYmdOf(until) > localYmdOf(nowMs); // YYYY-MM-DD compares lexically
}

/** RETURNED TODAY: the return day IS today — the chip + the parchment pip, this day only. */
export function flagReturnedToday(flag: Pick<TaskFlag, "snoozedUntil">, nowMs: number): boolean {
  if (!flag.snoozedUntil) return false;
  const until = Date.parse(flag.snoozedUntil);
  if (Number.isNaN(until)) return false;
  return localYmdOf(until) === localYmdOf(nowMs);
}

/** ⚠️ DELEGATES to the boundary (tasks-audit P1) — this compared instants, so a snooze written
 *  at 09:00 "until tomorrow" returned at 09:00 sharp while day-level readers still called it
 *  sleeping. One clock, one boundary, everywhere. */
export function isFlagSuppressing(flag: TaskFlag, now: number): boolean {
  return flagSleeps(flag, now);
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
