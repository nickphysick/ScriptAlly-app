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
