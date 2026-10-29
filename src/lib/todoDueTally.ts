/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TO-DO BADGE'S NUMBER (Phone app v2, Part 1B): tasks due today or earlier, exactly as the To-do tray counts them.
 *
 * ⚠️ NOT A NEW COUNT. This is the tray's own chain, step for step, as `TodoTray` runs it: the one board
 *    (`assembleBoardColumns`), its live cards (`cols.todo` + `cols.today`), the calendar's dated items
 *    (`calendarItems`) and the day buckets (`dayBuckets`). The badge is `overdue + today` — the same two figures the
 *    tray's headline states ("N OVERDUE · M due today"). `todoDueTally.test.ts` holds it equal to that chain run by
 *    hand, so the two cannot drift apart by one of them changing alone.
 */
import type { Activity, Agent, Manuscript, Query, Task, TaskFlag, UserTask } from "../types";
import { assembleBoardColumns } from "./todoColumns";
import { calendarItems, dayBuckets, londonToday } from "./trayCalendar";
import { localYMD } from "./shellSidebar";

export interface DueTallyInput {
  tasks: Task[];
  userTasks: UserTask[];
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  taskFlags: TaskFlag[];
  activities: Activity[];
  mutedTaskRules?: string[];
  nowMs: number;
}

export function todoDueTally(i: DueTallyInput): { overdue: number; today: number } {
  const { cols } = assembleBoardColumns({
    tasks: i.tasks, userTasks: i.userTasks, queries: i.queries, agents: i.agents, manuscripts: i.manuscripts,
    taskFlags: i.taskFlags, activities: i.activities, now: i.nowMs, today: localYMD(i.nowMs), mutedTaskRules: i.mutedTaskRules,
  });
  const live = [...cols.todo, ...cols.today];
  const db = { queries: i.queries, agents: i.agents, manuscripts: i.manuscripts, userTasks: i.userTasks, activities: i.activities };
  const items = calendarItems({ cards: live, db, flags: i.taskFlags, nowMs: i.nowMs });
  const b = dayBuckets(items, live, londonToday(i.nowMs));
  return { overdue: b.overdue, today: b.today };
}

/** the badge: due today or earlier */
export const todoDueBadge = (i: DueTallyInput): number => { const t = todoDueTally(i); return t.overdue + t.today; };
