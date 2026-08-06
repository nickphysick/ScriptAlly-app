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
import { TaskFlag, Query, Agent } from "../types";
import { isSnoozed } from "./todoListPage";
import { agentPrimary, agentInitials } from "./agentDisplay";

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
  /** The FULL flags — the Snoozed column is built from them, so it needs their shape. */
  flags: TaskFlag[];
  queries: Pick<Query, "id" | "agentId">[];
  agents: Pick<Agent, "id" | "name" | "agency">[];
  /** The housekeeping rule groups, already built by the page, as sweep cards. */
  sweeps: { card: SweepCard; memberKeys: string[] }[];
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

/**
 * ⚠️ THE SNOOZED COLUMN IS BUILT FROM THE FLAGS, NOT FROM THE LANES — and this is the whole fix.
 *
 * THE BUG: the column used to look for lane cards whose record matched a sleeping flag. It could
 * never find one. The task engine (db.tsx) filters a snoozed derived task OUT of `tasks` BEFORE
 * the board is assembled, and `assembleBoard` does the same for snoozed user cards. By the time
 * a column sees the board, everything snoozed has already gone. So the column rendered 0 while
 * the LISTS row and the chip strip — which count the FLAGS — said 1.
 *
 * Two sources for one fact, and the one the column used was structurally incapable of answering.
 *
 * THE FIX: the flags are the source, for the count AND the column. A sleeping flag names its own
 * record (`queryId`/`agentId`) and its `taskType`, which is enough to rebuild the card it is
 * hiding. Nothing here is stored; it is the same read, projected for display.
 */
export interface SnoozedInput {
  flags: TaskFlag[];
  queries: Pick<Query, "id" | "agentId">[];
  agents: Pick<Agent, "id" | "name" | "agency">[];
  nowMs: number;
}

/** The KIND facet for a snoozed card — the same vocabulary the lanes use. */
const SNOOZED_KIND: Record<string, string> = {
  offer_received: "OFFER",
  partial_requested: "AGENT WAITING",
  full_requested: "AGENT WAITING",
  revise_resubmit: "AGENT WAITING",
  nudge_overdue: "AGENT WAITING",
  no_response_close: "STALE",
  data_quality_poor: "DETAILS",
  user_task: "YOUR TASK",
};

/** "Back 12 Aug" — a snoozed card's right-hand slot states when it returns, which is the only
 *  fact about it that matters while it is asleep. */
export function backOnLabel(snoozedUntilIso: string): string {
  const d = new Date(snoozedUntilIso);
  if (Number.isNaN(d.getTime())) return "ASLEEP";
  return `BACK ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}`;
}

export function snoozedCards(input: SnoozedInput): BoardCard[] {
  return input.flags
    .filter((f) => isSnoozed(f, input.nowMs))
    .map((f) => {
      const q = f.queryId ? input.queries.find((x) => x.id === f.queryId) : undefined;
      const ag = input.agents.find((a) => a.id === (f.agentId ?? q?.agentId));
      const who = ag ? agentPrimary(ag) : "";
      const kind = SNOOZED_KIND[f.taskType] ?? "SNOOZED";
      return {
        key: `snz-${f.id}`,
        stream: "hk" as const,
        title: who ? `${who} — put away` : "Put away",
        who,
        subtitle: "",
        due: f.snoozedUntil ? backOnLabel(f.snoozedUntil) : "ASLEEP",
        kind,
        warn: false,
        snoozes: f.snoozeCount ?? 0,
        hk: true,
        initials: ag ? agentInitials(ag) : "•",
        record: ag ? [agentPrimary(ag), ag.agency].filter(Boolean).join(" · ") : "",
        committed: false,
        done: false,
        taskType: f.taskType,
        relatedRecordId: f.queryId ?? f.agentId,
        ...(f.taskType === "user_task" && f.queryId ? { userTaskId: f.queryId } : {}),
      };
    });
}

/**
 * ⚠️ THE PARTITION MUST SUM, AND BATCH WORK IS WHY IT DID NOT.
 *
 * Housekeeping is COUNTED by gaps (`hkGapCount` = the number of members across the rule groups —
 * forty-one fixable things) but RENDERED as one card per rule group. So the badge said 42 while
 * the columns drew 27: fifteen members existed in the count and had no card. They were not
 * hidden behind a fold — there was nothing to unfold.
 *
 * The resolution is not to render fifteen more cards. A data-quality gap is not a task you do one
 * at a time; it is a sweep. So a group renders as ONE SWEEP CARD carrying its own n-of-m, and the
 * card ACCOUNTS FOR all of its members — which is what makes the sum work again. The card is the
 * unit on the board; the members are the unit in the count; the sweep card carries the bridge.
 */
export interface SweepCard extends BoardCard {
  /** How many members this one card stands for. The sum reads this, not 1. */
  sweepOf: number;
  /** The rule key, so the card can open the existing Batch-fix sheet. */
  sweepRule: string;
}

export function isSweepCard(c: BoardCard): c is SweepCard {
  return typeof (c as SweepCard).sweepOf === "number";
}

/** What one card ACCOUNTS FOR — 1 for an ordinary card, its member count for a sweep. */
export function cardWeight(c: BoardCard): number {
  return isSweepCard(c) ? c.sweepOf : 1;
}

/** The rendered weight of a column — the figure that must reconcile with the badge. */
export function columnWeight(cards: BoardCard[]): number {
  return cards.reduce((n, c) => n + cardWeight(c), 0);
}

/** Build the one card that stands for a whole rule group. */
export function sweepCardFor(
  rule: string,
  label: string,
  memberCount: number,
  memberKeys: string[]
): { card: SweepCard; memberKeys: string[] } {
  return {
    memberKeys,
    card: {
      key: `sweep-${rule}`,
      stream: "hk",
      title: `${memberCount} ${label.toLowerCase()}`,
      who: "",
      subtitle: "",
      due: `${memberCount} TO FIX`,
      kind: label.toUpperCase(),
      warn: false,
      snoozes: 0,
      hk: true,
      initials: "•",
      record: "Housekeeping",
      committed: false,
      done: false,
      taskType: "data_quality_poor",
      sweepOf: memberCount,
      sweepRule: rule,
    },
  };
}

export interface BoardColumns {
  todo: BoardCard[];
  today: BoardCard[];
  snoozed: BoardCard[];
  done: BoardCard[];
}

export function boardColumns(input: ColumnInput): BoardColumns {
  /* The SWEEP CARDS stand in for their groups' members. The grouped hk cards are removed from
     the flat lane set first, so a member is never both inside a sweep and loose on the board —
     that would double-count it and break the sum in the other direction. */
  const grouped = new Set(input.sweeps.flatMap((g) => g.memberKeys));
  const lanes = boardEligible(
    [...input.board.do, ...input.board.hk, ...input.board.nt].filter((c) => !grouped.has(c.key))
  );

  const today: BoardCard[] = [];
  const todo: BoardCard[] = [];

  for (const c of lanes) {
    if (c.committedDate === input.today || c.surfaced) { today.push(c); continue; }
    todo.push(c);
  }
  // A sweep is never "today" or "done" — it is a standing pile, so it sits in To do.
  todo.push(...input.sweeps.map((g) => g.card));

  // ⚠️ Snoozed comes from the FLAGS (see snoozedCards) — the lanes cannot supply it, because
  // everything asleep has already been filtered out of them. This is the ONE source the LISTS
  // row and the chip strip also count.
  const snoozed = boardEligible(snoozedCards({
    flags: input.flags, queries: input.queries, agents: input.agents, nowMs: input.nowMs,
  }));

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
