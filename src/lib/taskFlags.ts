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

/* exported for the due derivation (`taskDue`), which reads the writer's hold on this same clock —
   one local day, one function, so a hold that returns "today" here is due today there */
export const localYmdOf = (ms: number): string => {
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

/**
 * DISMISSED: the writer said no, without a date (pane round, Phase 7).
 *
 * ⚠️ IT IS ITS OWN STATE, NOT A FAR-FUTURE SNOOZE. `MUTED_UNTIL` already means "muted
 * indefinitely" and would have carried a dismissal with no schema change at all — but it is what
 * the housekeeping GROUP MUTE writes, so reusing it would have retitled every muted rule group as
 * "dismissed" the moment the filter learned the word. Two acts, two fields, and the writer's own
 * distinction between "not this group, ever" and "not this task" survives.
 *
 * ⚠️ AND `skippedAt` NEEDED NO RULES DEPLOY: it is already in `isValidTaskFlag`'s allowlist, has
 * been since the flag store was written, and until now nothing wrote it and nothing read it. A
 * field in the allowlist with no writer is exactly what a dismissal wanted.
 */
export function flagDismissed(flag: Pick<TaskFlag, "skippedAt">): boolean {
  return typeof flag.skippedAt === "string" && flag.skippedAt.length > 0;
}

/** ⚠️ DELEGATES to the boundary (tasks-audit P1) — this compared instants, so a snooze written
 *  at 09:00 "until tomorrow" returned at 09:00 sharp while day-level readers still called it
 *  sleeping. One clock, one boundary, everywhere.
 *
 *  ⚠️ AND A DISMISSAL SUPPRESSES WITH NO CLOCK AT ALL — "it won't come back on its own" is the
 *  promise the confirm dialog makes, so there is no date to compare against. */
/* ── "BACK IF ANYTHING CHANGES" (To-do list v5.1 §I.2) ─────────────────────────────────────────
   A dismissal no longer holds for ever. It holds while NOTHING ON ITS SUBJECT IS NEWER THAN THE DISMISSAL; the moment
   something newer is stored, the task is back. Nothing is written when that happens — the stale `skippedAt` is simply
   outranked, at read time, by every reader at once, and dismissing again overwrites it.

   ⚠️ THE SUBJECT'S CHANGE TIME IS WHAT THE APP STORES, AND FOR SOME SUBJECTS IT STORES NOTHING. A query's change is its
      newest activity (a reply, a nudge, a send, a close — the writer's own logging included). An agent has no stored
      edit time at all (`lastCheckedDate` records VERIFICATION and `mswlCheckedAt` only the wishlist; the agent-updated
      activities carry no agent id), so a dismissal of an agent's task holds until the writer brings it back.
   ⚠️ THE WRITER'S OWN FLAG WRITES ARE NOT CHANGES — they are not activities, so they never reach this.
   ⚠️ A DAY-ONLY ACT COUNTS AS LATE IN ITS DAY. The query drawer dates what it records at local NOON (`dayIso`), so a
      noon-exact time says "this day", not "at noon". Read as noon, a reply logged at three o'clock after a two o'clock
      dismissal would be OLDER than the dismissal and never bring the task back; read as the end of its day it does.
      The cost is the other direction — an act logged earlier the same day as the dismissal also counts as newer — and
      that errs towards bringing a task back, which is the promise ("nothing set aside is lost"). */

/** the time an activity's `date` dates a change at: exact, or the end of its local day for a day-only (noon) date */
export function changeMs(dateIso: string | undefined): number | null {
  if (!dateIso) return null;
  const t = Date.parse(dateIso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const dayOnly = d.getHours() === 12 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
  return dayOnly ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1 : t;
}

/** the newest stored change on a flag's subject, and the activity that made it — or null where nothing dates one */
export function subjectChange<A extends { queryId?: string; date: string }>(
  flag: Pick<TaskFlag, "taskType" | "queryId" | "agentId">, activities: readonly A[],
): { ms: number; act: A } | null {
  if (flag.taskType === "user_task" || AGENT_TASK_TYPES.has(flag.taskType) || !flag.queryId) return null;
  let best: { ms: number; act: A } | null = null;
  for (const a of activities) {
    if (a.queryId !== flag.queryId) continue;
    const ms = changeMs(a.date);
    if (ms != null && (!best || ms > best.ms)) best = { ms, act: a };
  }
  return best;
}

/** does the subject have a stored change time at all? (an agent's task does not: back only when brought back) */
export const subjectDatesChanges = (flag: Pick<TaskFlag, "taskType" | "queryId">): boolean =>
  flag.taskType !== "user_task" && !AGENT_TASK_TYPES.has(flag.taskType) && !!flag.queryId;

/**
 * A dismissal holds while nothing on its subject is newer than it. `subjectChangedAtMs` absent (or the subject dates
 * no changes) means it holds until the writer brings it back.
 */
export function dismissalHolds(flag: Pick<TaskFlag, "skippedAt">, subjectChangedAtMs?: number | null): boolean {
  if (!flagDismissed(flag)) return false;
  if (subjectChangedAtMs == null || !Number.isFinite(subjectChangedAtMs)) return true;
  const at = Date.parse(flag.skippedAt!);
  if (Number.isNaN(at)) return true;
  return subjectChangedAtMs <= at;
}

/** ⚠️ ONE CLASSIFICATION FOR EVERY READER: sleeping, or dismissed and still holding. A reader that cannot say when the
 *  subject last changed passes nothing, and a dismissal then holds — the behaviour before §I.2. */
export function isFlagSuppressing(flag: TaskFlag, now: number, subjectChangedAtMs?: number | null): boolean {
  return flagSleeps(flag, now) || dismissalHolds(flag, subjectChangedAtMs);
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
