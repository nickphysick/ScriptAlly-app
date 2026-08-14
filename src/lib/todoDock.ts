/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoDock — the dock's pure model (board+dock pack, Phase 4).
 *
 * ⚠️ THE DOCK IS THE ONE PLACE WORK GETS FINISHED. The board says where everything stands; the
 * dock is where you actually send the full, close the query, answer the offer. That division is
 * why a derived card cannot be ticked on the board — ticking would clear the reminder and leave
 * the work undone, so the board bounces it here instead.
 *
 * ⚠️ AND IT HAS ONE ENGINE, TWO ENTRANCES. "Focused session" in the tool row and "Work the list"
 * on Today both open THIS surface, walking their own queue. A second focused-session surface is
 * what the pack retires: two work surfaces would need to agree about what "done" means, and the
 * first time they disagreed one of them would be silently wrong.
 */

import { BoardCard } from "./todoBoard";

/** Which inline flow the work surface mounts. Derived from the card, never stored. */
export type DockFlowKind = "agent-waiting" | "offer" | "stale" | "user-task" | "housekeeping";

export function dockFlowKind(card: BoardCard): DockFlowKind {
  if (card.userTaskId) return "user-task";
  switch (card.taskType) {
    case "offer_received": return "offer";
    case "no_response_close": return "stale";
    case "partial_requested":
    case "full_requested":
    case "revise_resubmit":
    case "nudge_overdue": return "agent-waiting";
    default: return "housekeeping";
  }
}

/**
 * ⚠️ THE MATERIALS THE AGENT-WAITING FLOW SENDS, and the status that follows.
 *
 * The flow's one ink act is "record it sent", and what "it" is comes from the task, not from a
 * guess: a partial request is answered with a partial, a full with a full, an R&R with a
 * resubmitted full. The target status is the same derivation — which is what makes recording the
 * send move the query AND retire the task in one act, with no second decision to get wrong.
 */
export interface SendSpec {
  /** What goes — the writer confirms rather than chooses from scratch. */
  material: "partial" | "full";
  /** The status the query moves to. Kept beside the material so they cannot drift. */
  targetStatus: "Partial Sent" | "Full Sent";
  /** An R&R resubmission — the display-only revision bump the primitive already handles. */
  isResubmit: boolean;
  /** The ink primary's words. */
  actLabel: string;
}

export function sendSpecFor(card: BoardCard): SendSpec | null {
  switch (card.taskType) {
    case "partial_requested":
      return { material: "partial", targetStatus: "Partial Sent", isResubmit: false, actLabel: "Record the partial as sent" };
    case "full_requested":
      return { material: "full", targetStatus: "Full Sent", isResubmit: false, actLabel: "Record the full as sent" };
    case "revise_resubmit":
      return { material: "full", targetStatus: "Full Sent", isResubmit: true, actLabel: "Record the resubmission as sent" };
    default:
      return null;
  }
}

/**
 * The queue's next item — the one the dock offers after a completion.
 *
 * ⚠️ IT OFFERS, IT NEVER RUNS. Advancing to the next item docks it; it does not perform its flow.
 * A work surface that started the next act on your behalf would be deciding for you at exactly
 * the moment you had stopped paying attention, having just finished something.
 */
export function nextInQueue(queue: BoardCard[], currentKey: string): BoardCard | null {
  const i = queue.findIndex((c) => c.key === currentKey);
  if (i === -1) return queue[0] ?? null;
  return queue[i + 1] ?? null;
}

/** The queue neighbour in a direction — the ↑↓ keys' move, clamped rather than wrapping. */
export function stepQueue(queue: BoardCard[], currentKey: string, delta: 1 | -1): BoardCard | null {
  const i = queue.findIndex((c) => c.key === currentKey);
  if (i === -1) return queue[0] ?? null;
  const j = i + delta;
  return j >= 0 && j < queue.length ? queue[j] : null;
}

/** "NEXT: Nudge Marcus Reed" — the footer's forward look, absent at the end of the queue. */
export function nextLabel(next: BoardCard | null): string | null {
  return next ? `NEXT: ${next.title}` : null;
}

/**
 * The dock's queue is the CURRENT COLUMN ORDER, filtered view respected — the same array the
 * board just drew, handed over rather than recomputed. Notes never enter it (they are not on the
 * board), and neither does anything already done: a queue of finished work is a queue of nothing
 * to do.
 */
export function dockQueue(cards: BoardCard[]): BoardCard[] {
  return cards.filter((c) => c.nature !== "note" && !c.done);
}

/**
 * ⚠️ WHICH CARD THE PANE IS SHOWING — DERIVED, because the queue is (rail + workspace, Phase 5).
 *
 * The dock used to hold its own SNAPSHOT of the queue, taken when it opened. That was harmless
 * while the dock REPLACED the list: one list on screen, nothing to disagree with. The moment the
 * rail stood beside it, the two could visibly diverge — snooze a card from the rail and it left
 * the rail while the pane's stack kept showing it and kept counting it. Two lists that can
 * disagree about what is outstanding is the same failure as two writers of query status, and it
 * gets the same answer: there is ONE list, and the pane holds a selection INTO it.
 *
 * ⚠️ THE KEY IS THE SOURCE OF TRUTH; THE POSITION IS ONLY A RECOVERY HINT. While the key is in
 * the list, that is the answer and its index is remembered in passing. When the key is GONE —
 * you snoozed the docked card from the rail — the hint says where it was, and the pane advances
 * to whatever now occupies that position.
 *
 * ⚠️ IT CLAMPS TO THE END, NEVER BACK TO THE START. Past the end means the docked card was last,
 * so the card before it is what remains; jumping to the top of the list because a row vanished
 * under you is the worse failure, and it is the one a naive `?? queue[0]` produces.
 *
 * An empty queue is the one case that yields nothing: there is no card to show because there is
 * no work left, which is the pane closing rather than the pane being cleared.
 */
export function resolveDocked(
  queue: BoardCard[],
  key: string | null,
  lastPos: number,
): { card: BoardCard | null; pos: number } {
  if (!key || queue.length === 0) return { card: null, pos: lastPos };
  const i = queue.findIndex((c) => c.key === key);
  if (i !== -1) return { card: queue[i], pos: i };
  const at = Math.min(Math.max(lastPos, 0), queue.length - 1);
  return { card: queue[at], pos: at };
}
