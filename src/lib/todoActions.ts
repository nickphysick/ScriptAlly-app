/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoActions — the DECISIONS behind completion, snoozing and dock entry, extracted from the page
 * that used to hold them (tasks-consolidation, extraction commit).
 *
 * ⚠️ WHY THIS FILE EXISTS. `quickDone`, `snoozeCard` and the dock entry were local closures inside
 * `ToDoPage.tsx` — a 2,247-line component about to be rebuilt. A choke point that lives only as a
 * closure inside the file being replaced **is not a choke point, it is a coincidence**: the next
 * rewrite can walk past it without anything failing. The snooze ceiling had already been through
 * exactly that once (a cap that lived in one menu's tier list, which every other path ignored,
 * and an offer surfaced reading "BACK 7 AUG").
 *
 * ⚠️ WHAT IS EXTRACTED, AND WHAT IS NOT. The DECISIONS are here — pure, total, unit-tested:
 * which ceiling applies, which write path a kind takes, what the toast says, what enters the
 * dock. The EFFECTS stay in the page, because they are React closures over `updateUserTask`,
 * `dismissTask`, `setOverlay` and `flash`; dragging those in would mean dependency-injecting four
 * providers to test a branch. The page becomes a thin caller: it asks this module what to do and
 * then does it, so a rebuild can replace every line of the doing without touching the deciding.
 *
 * ⚠️ THE INVARIANT THIS BUYS: there is ONE clamp, ONE completion-path map and ONE dock filter, and
 * `todoActions.test.ts` asserts the page routes through them rather than re-deciding inline.
 */
import { BoardCard } from "./todoBoard";

/* ── snooze ceilings ───────────────────────────────────────────────────────────────────────── */

/** A year. The ordinary ceiling — long enough to mean "not now", short enough to come back. */
export const SNOOZE_MAX_DAYS = 365;
/** An offer cannot be put off past tomorrow: it is the one kind with someone waiting on an answer. */
export const OFFER_SNOOZE_MAX_DAYS = 1;

export interface SnoozeClamp {
  days: number;
  when: string;
  /** True when the request was reduced — the caller says so rather than silently shortening. */
  clamped: boolean;
}

/**
 * ⚠️ THE CEILING, PER KIND — and it returns a NUMBER rather than a boolean so a caller cannot
 * accidentally read "capped" as "capped at tomorrow".
 *
 * - **offers → 1 day.** Someone is waiting on an answer; a week's silence is not a decision.
 * - **deadlines → never past the deadline itself.** Snoozing an expiring exclusive past its expiry
 *   is the app helping you miss it. The caller supplies the remaining days; a deadline already
 *   past clamps to 0, which the caller must read as "cannot be snoozed at all".
 * - **everything else → a year.**
 */
export function snoozeCeilingDays(card: BoardCard, daysUntilDeadline?: number): number {
  if (card.taskType === "offer_received") return OFFER_SNOOZE_MAX_DAYS;
  if (typeof daysUntilDeadline === "number") return Math.max(0, Math.min(SNOOZE_MAX_DAYS, daysUntilDeadline));
  return SNOOZE_MAX_DAYS;
}

/** The dial's stops, and the only day-counts that get a name of their own. */
export const SNOOZE_STOPS: { days: number; label: string }[] = [
  { days: 1, label: "tomorrow" },
  { days: 3, label: "in a few days" },
  { days: 7, label: "next week" },
  { days: 14, label: "in two weeks" },
  { days: 30, label: "in a month" },
];

/**
 * ⚠️ A NAME ONLY WHERE THE NUMBER EARNS IT. An exact stop gets the stop's words; anything else —
 * which in practice means a deadline clamp, where the ceiling is whatever days remain — gets the
 * day count stated plainly. The first draft rounded 4 days up to "next week", so a clamp that
 * wrote 4 days announced 7: the label has to describe the write, not the tier it fell between.
 */
export function snoozeWhenLabel(days: number): string {
  const stop = SNOOZE_STOPS.find((s) => s.days === days);
  if (stop) return stop.label;
  if (days <= 0) return "not at all";
  return `in ${days} days`;
}

/**
 * ⚠️ THE CHOKE POINT. Every snooze — menu tier, drag dial, keyboard, batch — passes through here,
 * and the ceiling is applied HERE rather than in any caller's option list. A cap that lives in one
 * menu's tiers is a cap every other path walks past; that is not hypothetical, it shipped.
 *
 * It also re-labels: a request clamped from "next week" to tomorrow must not keep saying "next
 * week", or the toast lies about what was written.
 */
export function clampSnooze(card: BoardCard, days: number, when: string, daysUntilDeadline?: number): SnoozeClamp {
  const ceiling = snoozeCeilingDays(card, daysUntilDeadline);
  if (days <= ceiling) return { days, when, clamped: false };
  return { days: ceiling, when: snoozeWhenLabel(ceiling), clamped: true };
}

/**
 * ⚠️ THE SAME CEILING, FOR CALLERS THAT HOLD A TASK TYPE RATHER THAN A CARD. FocusFlow's staged
 * runner and its sweep snooze both had their OWN copy of the offer cap — so the rule lived in
 * three places at once, which is three chances to disagree about a cap that has already shipped
 * wrong. One ceiling, two shapes of caller.
 */
export function clampSnoozeDays(taskType: string | undefined, days: number): number {
  if (taskType === "offer_received") return Math.min(days, OFFER_SNOOZE_MAX_DAYS);
  return Math.min(days, SNOOZE_MAX_DAYS);
}

/* ── which write path a snooze takes ───────────────────────────────────────────────────────── */

export type SnoozeVia = "user-task-flag" | "dismiss-task" | "none";

/**
 * A writer's own item carries its snooze on a task flag; an engine-raised one goes through
 * `dismissTask` with a fixed-snooze reason. A card with neither an id nor a task type cannot be
 * snoozed at all, and saying so here stops the caller writing a half-formed key.
 */
export function snoozeVia(card: BoardCard): SnoozeVia {
  if (card.userTaskId) return "user-task-flag";
  if (card.taskType && card.relatedRecordId) return "dismiss-task";
  return "none";
}

/** The lane an overlay belongs to — the card's own stream, defaulted rather than assumed. */
export function cardLane(card: BoardCard): "do" | "hk" | "nt" {
  return card.stream === "nt" ? "nt" : card.stream === "hk" ? "hk" : "do";
}

/* ── which write path a completion takes ───────────────────────────────────────────────────── */

export type CompletionVia =
  | "user-task"        // the writer's own item — a plain done/completedAt write
  | "close-query"      // no_response_close — a status change, not a tick
  | "log-nudge"        // nudge_overdue — the nudge's own isolated path
  | "mark-sent"        // the query's own send flow owns it
  | "none";            // nothing to complete — the kind has no honest arm

/**
 * ⚠️ ONE MAP FROM KIND TO WRITE PATH. `quickDone` grew this as an if-ladder inside the page, so
 * "which kinds can be ticked" was answerable only by reading a 90-line function. Stated once, it
 * is also what the row can ask before it draws a tick at all — a tick that does nothing is worse
 * than no tick.
 */
export function completionVia(card: BoardCard): CompletionVia {
  if (card.userTaskId) return "user-task";
  if (!card.relatedRecordId) return "none";
  if (card.taskType === "no_response_close") return "close-query";
  if (card.taskType === "nudge_overdue") return "log-nudge";
  return "mark-sent";
}

/** Whether the row should render a tick at all — the derived answer, never a per-row guess. */
export function isTickable(card: BoardCard): boolean {
  return completionVia(card) !== "none";
}

/* ── dock entry ────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ DOCK ENTRY IS `dockQueue` IN lib/todoDock — ALREADY A SEAM, and deliberately not duplicated
 * here. This re-export exists so a reader looking for "how does something get into the dock"
 * finds the answer in the module named for actions, rather than concluding there are two filters.
 * There is one, and it is that one.
 */
export { dockQueue } from "./todoDock";
