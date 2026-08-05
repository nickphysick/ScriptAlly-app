/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoCount — THE COUNTING LAW (audit item 1).
 *
 * ⚠️ THE FAULT THIS SETTLES: the panel badge said 44 while the lists said 3 + 41 + 2 + 6 = 52, and
 * nothing in the app defined what 44 counted. Two numbers, both called "To-do", neither wrong on
 * its own terms and no way to reconcile them.
 *
 * THE RULE: the badge counts ACTIONABLE items — urgent + housekeeping + open user tasks. **Notes
 * are excluded**: they are dateless by definition and nothing chases them, so they must not
 * inflate a number that means "things waiting on you".
 *
 * ⚠️ ONE DERIVATION, USED EVERYWHERE. The sidebar badge, the page counts and anything else
 * claiming to be "the" To-do number read THIS function. That is what makes the invariant test
 * (badge == list page total == board total) meaningful rather than a coincidence maintained by
 * hand.
 *
 * ⚠️ AND IT MUST NOT DOUBLE-COUNT. A user task with a linked reminder is routed into the URGENT
 * lane by the board assembler, so it is already inside `urgent`; only the tasks left in the
 * notes-to-self lane are added. Counting `userTasks.length` on top of `urgent` would inflate the
 * badge by exactly the items the writer is most likely to notice.
 */
import { AssembledBoard, BoardCard } from "./todoBoard";

export interface TodoCounts {
  urgent: number;
  housekeeping: number;
  /** Open user TASKS only — dated items the writer created. Notes are not here. */
  yours: number;
  /** Dateless notes. Counted for its own LIST row, and excluded from `actionable`. */
  notes: number;
  snoozed: number;
  /** The one number that means "things waiting on you". */
  actionable: number;
}

/** A user card is a TASK when it has a date; without one it is a note (the notes-and-tasks law). */
const isTask = (c: BoardCard): boolean => c.nature === "task";
const isNote = (c: BoardCard): boolean => c.nature === "note";

export function todoCounts(
  board: AssembledBoard,
  housekeepingGaps: number,
  snoozedCount: number,
): TodoCounts {
  const urgent = board.do.length;
  // Only the nt lane's tasks — the do lane's user tasks are already inside `urgent` above.
  const yours = board.nt.filter(isTask).length;
  const notes = board.nt.filter(isNote).length;
  return {
    urgent,
    housekeeping: housekeepingGaps,
    yours,
    notes,
    snoozed: snoozedCount,
    actionable: urgent + housekeepingGaps + yours,
  };
}

/** The single number the sidebar badge shows. Named so no caller has to remember the rule. */
export function todoBadgeCount(counts: TodoCounts): number {
  return counts.actionable;
}
