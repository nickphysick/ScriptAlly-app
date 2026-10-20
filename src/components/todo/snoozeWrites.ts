/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SNOOZE WRITES, LIFTED OUT OF `ToDoPage` (To-do list v5, Part C) — so the phone's page and the
 * desktop's desk "Set aside" write through ONE primitive. `ToDoPage`'s `snoozeCard`/`snoozeGroup`
 * now call these; the behaviour, the clamp and the undo are what they were.
 *
 * Each returns the toast's message and its inverse, or null where the card cannot be snoozed.
 */
import type { BoardCard } from "../../lib/todoBoard";
import { USER_TASK_FLAG_TYPE } from "../../lib/todoBoard";
import type { HkGroup } from "../../lib/todoHousekeeping";
import { clampSnooze, snoozeVia, snoozeDateLabel } from "../../lib/todoActions";
import { flagKeyForTask } from "../../lib/taskFlags";
import type { useScriptAllyDb } from "../../lib/db";

type Writers = Pick<ReturnType<typeof useScriptAllyDb>, "upsertTaskFlag" | "dismissTask">;
export interface SnoozeDone { message: string; undo: () => Promise<void> }

export function snoozeCardWrites(db: Writers, c: BoardCard, days: number, when: string, daysUntilDeadline?: number): SnoozeDone | null {
  /* ⚠️ THE CEILING IS APPLIED IN lib/todoActions (`clampSnooze`), the single clamp every path reaches — with the task's
     own deadline where it has one (v5.1 §I.3: a send-by or answer-by date), so no write can sleep past it. */
  ({ days, when } = clampSnooze(c, days, when, daysUntilDeadline));
  if (days <= 0) return null;
  if (snoozeVia(c) === "user-task-flag") {
    const key = { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId! };
    void db.upsertTaskFlag(key, { snoozedUntil: new Date(Date.now() + days * 86400000).toISOString(), bumpSnooze: true });
    return { message: `Snoozed until ${snoozeDateLabel(days)}`, undo: () => db.upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }) };
  }
  if (snoozeVia(c) !== "dismiss-task") return null;
  void db.dismissTask(c.taskType!, c.relatedRecordId!, "fixed snooze", days);
  const key = flagKeyForTask(c.taskType, c.relatedRecordId);
  return { message: `Snoozed until ${snoozeDateLabel(days)}`, undo: () => db.upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }) };
}

export function snoozeGroupWrites(db: Writers, g: HkGroup, days: number): SnoozeDone {
  g.members.forEach((m) => m.agentId && void db.dismissTask("data_quality_poor", m.agentId, "fixed snooze", days));
  return {
    message: `Snoozed until ${snoozeDateLabel(days)}`,
    undo: async () => { g.members.forEach((m) => m.agentId && void db.upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })); },
  };
}
