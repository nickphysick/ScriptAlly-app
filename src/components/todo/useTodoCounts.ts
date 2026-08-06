/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useTodoCounts — the ONE place a component gets To-do figures.
 *
 * ⚠️ THE COUNTING LAW HAS EXACTLY ONE IMPLEMENTATION (audit item 1), in `lib/todoCount`. This hook
 * is only the wiring: it assembles the board from the state DbProvider already holds and hands the
 * figures over. The sidebar badge, the page counts and the LISTS rows all come through here, which
 * is what makes badge == page total == board total an invariant rather than a coincidence.
 *
 * ⚠️ NO SECOND DERIVATION MAY BE ADDED HERE. If a surface needs a number this hook does not
 * expose, the number belongs in `todoCount` where the law lives — not computed at the call site,
 * where it would immediately be a second answer to the same question.
 */
import { useMemo } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { assembleBoard } from "../../lib/todoBoard";
import { groupHousekeeping, hkGapCount } from "../../lib/todoHousekeeping";
import { localYMD } from "../../lib/shellSidebar";
import { TodoCounts, todoCounts } from "../../lib/todoCount";
import { TodoListId } from "../../lib/todoRoutes";
import { isFlagSuppressing } from "../../lib/taskFlags";

export interface TodoCountsView extends TodoCounts {
  /** The five LIST rows, keyed for the side container. */
  byList: Record<TodoListId, number>;
}

export function useTodoCounts(): TodoCountsView {
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser,
  } = useScriptAllyDb();

  return useMemo(() => {
    const now = Date.now();
    const input = {
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
      now, mutedTaskRules: currentUser?.mutedTaskRules,
    };
    const board = assembleBoard({ ...input, today: localYMD(now) });
    const groups = groupHousekeeping(board.hk, agents, currentUser?.mutedTaskRules, queries);
    const stale = board.hk.filter((c) => c.taskType === "no_response_close");
    // Snoozed is a STANCE, not a lane: a flag that is currently suppressing its task. Counted from
    // the same flags the board reads, so the LIST row and the board's Snoozed column agree.
    const snoozed = taskFlags.filter((f) => isFlagSuppressing(f, now)).length;
    const c = todoCounts(board, hkGapCount(groups) + stale.length, snoozed);
    return {
      ...c,
      byList: {
        urgent: c.urgent,
        housekeeping: c.housekeeping,
        yours: c.yours,
        notes: c.notes,
        snoozed: c.snoozed,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser?.mutedTaskRules]);
}
