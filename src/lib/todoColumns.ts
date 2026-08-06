/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoColumns — the board's four columns (workspace pack, Phase 4).
 *
 * ⚠️ EVERY COLUMN IS A STATE THE APP ALREADY OWNS. There is NO stored placement — no
 * board-position field, no column id on a card, nothing written when a card moves. A card is in
 * "Today" because its `committedDate` is today, in "Snoozed" because a flag says so, in "Done"
 * because it was completed today. Move it and you change that fact; the column follows.
 *
 * This matters more than it sounds. The moment a board stores where a card sits, it becomes a
 * SECOND system that has to agree with the first, and the first thing that happens is a card
 * completed from the Queries Hub stays sitting in "To do" because nothing told the board. The
 * "Doing" column from the earlier explorations is dead for exactly this reason: it was the only
 * one that could not be derived from anything.
 *
 * ⚠️ THE INVARIANTS ARE THE POINT (audit item 10). Today column == the Today page == the sidebar
 * count's Today component; Snoozed column == the Snoozed list; Done column == today's log. These
 * are the same derivations rendered twice over, and the tests assert the equality so the board
 * cannot quietly drift into a second answer.
 */

import { BoardCard, AssembledBoard } from "./todoBoard";
import { TaskFlag } from "../types";
import { isSnoozed } from "./todoListPage";

export type TodoColumnId = "todo" | "today" | "snoozed" | "done";

export interface TodoColumnDef {
  id: TodoColumnId;
  label: string;
  /** What a drop onto this column MEANS — the existing verb, named. */
  dropVerb: string;
  /** The label the drop zone wears while a card is over it (the copy register). */
  dropLabel: string;
}

export const TODO_COLUMNS: TodoColumnDef[] = [
  { id: "todo", label: "To do", dropVerb: "return", dropLabel: "DROP TO PUT IT BACK" },
  { id: "today", label: "Today", dropVerb: "commit", dropLabel: "DROP TO ADD TO TODAY'S LIST" },
  { id: "snoozed", label: "Snoozed", dropVerb: "snooze", dropLabel: "DROP TO CHOOSE A RETURN DATE" },
  { id: "done", label: "Done", dropVerb: "complete", dropLabel: "DROP TO MARK IT DONE" },
];

export interface ColumnInput {
  board: AssembledBoard;
  flags: Pick<TaskFlag, "snoozedUntil" | "queryId" | "agentId">[];
  today: string;
  nowMs: number;
}

/**
 * ⚠️ NOTES NEVER RENDER ON THE BOARD (audit item 2). A note has no date, so it cannot be
 * snoozed; it has no tick, so it cannot be done. Three of the four columns are meaningless for
 * it, and a card that can only ever sit in one column is not a board citizen — it is a note, and
 * the Noteboard is where it belongs. My own mock once put one in Snoozed, which is how the rule
 * got written.
 */
export function boardEligible(cards: BoardCard[]): BoardCard[] {
  return cards.filter((c) => c.nature !== "note");
}

/** The snoozed card keys — flags still asleep, matched to the cards they suppress. */
function snoozedKeys(input: ColumnInput): Set<string> {
  const ids = new Set(
    input.flags.filter((f) => isSnoozed(f, input.nowMs)).map((f) => f.queryId ?? f.agentId).filter(Boolean) as string[]
  );
  const keys = new Set<string>();
  for (const c of [...input.board.do, ...input.board.hk, ...input.board.nt]) {
    const id = c.relatedRecordId ?? c.userTaskId;
    if (id && ids.has(id)) keys.add(c.key);
  }
  return keys;
}

export interface BoardColumns {
  todo: BoardCard[];
  today: BoardCard[];
  snoozed: BoardCard[];
  done: BoardCard[];
}

export function boardColumns(input: ColumnInput): BoardColumns {
  const asleep = snoozedKeys(input);
  const lanes = boardEligible([...input.board.do, ...input.board.hk, ...input.board.nt]);

  const today: BoardCard[] = [];
  const todo: BoardCard[] = [];
  const snoozed: BoardCard[] = [];

  for (const c of lanes) {
    // Order matters and is stated: asleep beats committed, because a snoozed card is not on
    // today's list even if it was yesterday — the snooze is the more recent decision.
    if (asleep.has(c.key)) { snoozed.push(c); continue; }
    if (c.committedDate === input.today || c.surfaced) { today.push(c); continue; }
    todo.push(c);
  }

  // Done is today's log, projected — the SAME `cleared` union the Today page reads.
  return { todo, today, snoozed, done: boardEligible(input.board.cleared) };
}

/**
 * ⚠️ AN OFFER CANNOT BE PUT AWAY (the confirmed-consistent list). It has a reply-by window that
 * is not yours to move: it cannot be dismissed anywhere, and it cannot be snoozed beyond
 * tomorrow. The board honours the same guard the rows do rather than inventing its own.
 */
export function offerGuard(card: BoardCard, target: TodoColumnId): { allowed: boolean; why?: string } {
  if (card.taskType !== "offer_received") return { allowed: true };
  if (target === "snoozed") {
    return { allowed: false, why: "An offer has a reply-by date — it can wait until tomorrow, but not be put away." };
  }
  return { allowed: true };
}

/**
 * What a drag from one column to another MEANS. The board performs no writes of its own: every
 * move resolves to a verb the app already has, and the component calls that verb.
 *
 * ⚠️ SNOOZE IS POPOVER-GATED. Dropping on Snoozed does not snooze anything — it opens the date
 * popover, and the card moves only once a date is chosen. A drag that silently picked a date
 * would be the app deciding when you want to see something again.
 */
export type DropPlan =
  | { kind: "commit" }            // → Today: the ＋Today verb
  | { kind: "uncommit" }          // out of Today: the same verb, reversed
  | { kind: "snooze-popover" }    // → Snoozed: OPENS the popover; the move waits for a date
  | { kind: "unsnooze" }          // out of Snoozed: return now
  | { kind: "complete" }          // → Done: the completion primitive + undo toast
  | { kind: "uncomplete" }        // out of Done: un-tick
  | { kind: "none"; why?: string };

export function dropPlan(
  card: BoardCard,
  from: TodoColumnId,
  to: TodoColumnId
): DropPlan {
  if (from === to) return { kind: "none" };
  const guard = offerGuard(card, to);
  if (!guard.allowed) return { kind: "none", why: guard.why };

  switch (to) {
    case "today": return { kind: "commit" };
    case "snoozed": return { kind: "snooze-popover" };
    case "done": return { kind: "complete" };
    case "todo":
      // Leaving a column is that column's verb reversed — never a separate "move to backlog".
      if (from === "today") return { kind: "uncommit" };
      if (from === "snoozed") return { kind: "unsnooze" };
      if (from === "done") return { kind: "uncomplete" };
      return { kind: "none" };
  }
}
