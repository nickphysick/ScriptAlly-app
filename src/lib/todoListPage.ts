/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoListPage — the To-do list page's own pure derivations (workspace pack, Phase 2).
 *
 * Three things the page needs and nothing else owns: which of the three TYPE GROUPS a row belongs
 * to, how the housekeeping pile folds, and what the snoozed set is. All pure, all derived — the
 * page renders them, it never recomputes them.
 */

import { TaskFlag } from "../types";
import { TodoListId } from "./todoRoutes";

/**
 * THE THREE TYPE GROUPS (audit item 4's companion: the lists are five, the GROUPS are three).
 *
 * ⚠️ "Your tasks & notes" is ONE group holding two natures. The side container lists them
 * separately because they are separate LISTS you can filter by; the page groups them together
 * because they are one thing you wrote down, and splitting a writer's own jottings into two
 * cards on the page they were written on reads as bureaucracy. The nature still shows on the
 * row — the group is not claiming they are the same.
 */
export interface TodoGroupDef {
  id: "urgent" | "housekeeping" | "yours";
  label: string;
  /** The LIST whose swatch heads this group (yours borrows the user-created sage). */
  swatch: TodoListId;
}

export const TODO_GROUPS: TodoGroupDef[] = [
  { id: "urgent", label: "Urgent", swatch: "urgent" },
  { id: "housekeeping", label: "Housekeeping", swatch: "housekeeping" },
  { id: "yours", label: "Your tasks & notes", swatch: "yours" },
];

/**
 * THE HOUSEKEEPING FOLD. Housekeeping is the pile that grows without anyone deciding it should —
 * forty-one items is normal and none of them is urgent — so the group shows a working number and
 * folds the rest behind one control rather than making you scroll past it to reach the things
 * that do matter.
 *
 * ⚠️ THE FOLD IS A VIEW, NOT A FILTER. The hidden rows are still in the group, still counted in
 * the heading, and still reached by "SHOW {n} MORE". A fold that changed the count would be
 * hiding work rather than deferring it.
 */
export const HOUSEKEEPING_FOLD = 5;

export function foldRows<T>(rows: T[], expanded: boolean, limit = HOUSEKEEPING_FOLD): {
  shown: T[];
  hidden: number;
} {
  if (expanded || rows.length <= limit) return { shown: rows, hidden: 0 };
  return { shown: rows.slice(0, limit), hidden: rows.length - limit };
}

/** A flag is snoozed when its `snoozedUntil` is still in the future. */
export function isSnoozed(flag: Pick<TaskFlag, "snoozedUntil">, nowMs: number): boolean {
  if (!flag.snoozedUntil) return false;
  const ms = Date.parse(flag.snoozedUntil);
  return !Number.isNaN(ms) && ms > nowMs;
}

/** The snoozed count for the foot band and the LISTS row — one derivation, both surfaces. */
export function snoozedCount(flags: Pick<TaskFlag, "snoozedUntil">[], nowMs: number): number {
  return flags.filter((f) => isSnoozed(f, nowMs)).length;
}

/**
 * ⚠️ CAME BACK TODAY — the returned-from-snooze chip (the copy register's
 * "Snoozed {date} · back today").
 *
 * A row that reappears with no explanation reads as a bug in a list you thought you had cleared.
 * The chip says why it is here, and it says it for ONE day: the flag's `snoozedUntil` has passed,
 * and it passed on today's date. Yesterday's returns are simply back — carrying the chip
 * indefinitely would make "back today" a lie by the second day.
 *
 * Date-only comparison on the LOCAL day, deliberately: "today" is a calendar question, and a UTC
 * comparison puts an evening return on tomorrow's list for anyone west of Greenwich.
 */
export function returnedToday(
  flag: Pick<TaskFlag, "snoozedUntil"> | undefined,
  nowMs: number
): boolean {
  if (!flag?.snoozedUntil) return false;
  const ms = Date.parse(flag.snoozedUntil);
  if (Number.isNaN(ms) || ms > nowMs) return false; // still asleep
  const back = new Date(ms);
  const now = new Date(nowMs);
  return (
    back.getFullYear() === now.getFullYear() &&
    back.getMonth() === now.getMonth() &&
    back.getDate() === now.getDate()
  );
}

/** "SNOOZED 4 AUG · BACK TODAY" — the chip's text, en-GB, uppercased by the caller's CSS. */
export function returnedChipLabel(snoozedUntilIso: string): string {
  const d = new Date(snoozedUntilIso);
  if (Number.isNaN(d.getTime())) return "Back today";
  return `Snoozed ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · back today`;
}
