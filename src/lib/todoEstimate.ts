/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoEstimate — time estimates, on Today only (board-optimise pack, Phase 7; ref
 * design-refs/board-features.html).
 *
 * ⚠️ THE FIELD, JUSTIFIED. This is the pack's one addition to user-facing task state:
 * `UserTask.estimateMin?: number`. It is the SMALLEST possible shape — one optional integer of
 * minutes, from a fixed ladder, on the object the writer already owns:
 *  · Not derived, because nothing in the app knows how long YOUR redraft takes. Every other
 *    figure on this board is derived precisely because the data already implies it; this one is
 *    a judgement only the writer can make, so storing it is the honest option rather than the
 *    lazy one.
 *  · Not a new collection or a map: a scalar on the task keeps the write inside the existing
 *    updateUserTask path and the existing rules allowlist entry — no new document, no new
 *    listener, no new failure mode.
 *  · Minutes as a NUMBER rather than a label, so the header can sum without parsing prose.
 *  · Optional, and absent means absent: the sum counts only what carries one and NEVER guesses.
 *
 * ⚠️ ESTIMATES LIVE ONLY ON TODAY. Planning is Today's job — the board is what exists, Today is
 * what you have chosen — and an estimate on a card you have not committed to is a plan for a day
 * you have not decided to have.
 */
import { UserTask } from "../types";

/** ⚠️ A FIXED LADDER, NEVER FREE TEXT (the ref's own rungs). Free entry would invite "about an
 *  hour?", which cannot be summed, and precision the writer does not have. `null` is the rung
 *  that CLEARS an estimate — a ladder with no way down is a trap. */
export const ESTIMATE_LADDER: { label: string; minutes: number | null }[] = [
  { label: "5m", minutes: 5 },
  { label: "10m", minutes: 10 },
  { label: "25m", minutes: 25 },
  { label: "45m", minutes: 45 },
  { label: "1h+", minutes: 60 },
  { label: "none", minutes: null },
];

export const ESTIMATE_VALUES = ESTIMATE_LADDER
  .map((r) => r.minutes)
  .filter((m): m is number => m !== null);

/** Only a rung may be stored — a value from anywhere else reads as no estimate at all. */
export function isLadderValue(minutes: number | undefined | null): minutes is number {
  return typeof minutes === "number" && ESTIMATE_VALUES.includes(minutes);
}

/** "~25 MIN" — the card's chip. Absent → null, and the card shows nothing. */
export function estimateChip(minutes: number | undefined): string | null {
  if (!isLadderValue(minutes)) return null;
  return minutes >= 60 ? `~${minutes / 60}H+` : `~${minutes} MIN`;
}

/**
 * ⚠️ THE HEAD SUMS ONLY WHAT CARRIES AN ESTIMATE, AND NEVER GUESSES. A day with three estimated
 * cards and four unestimated ones reads "EST. 35 MIN" — the truth about what was estimated —
 * rather than inventing a figure for the rest. Nothing at all when none carries one.
 */
export function estimateTotal(minutes: (number | undefined)[]): number {
  return minutes.filter(isLadderValue).reduce((a, b) => a + b, 0);
}

export function estimateHeadLabel(total: number, count: number, goodDay: number): string | null {
  if (count === 0 || total === 0) return null;
  /* Past the writer's own good-day line the head says so — the same advice the WIP line gives,
     in the same voice, because they are the same judgement about the same day. */
  if (count > goodDay) return "THAT'S A FULL DAY";
  return total >= 60
    ? `EST. ${Math.floor(total / 60)}H ${total % 60 ? `${total % 60} MIN` : ""}`.trim()
    : `EST. ${total} MIN`;
}

/** The estimates of a set of user tasks, by id — the page's own lookup. */
export function estimateOf(t: Pick<UserTask, "estimateMin">): number | undefined {
  return isLadderValue(t.estimateMin) ? t.estimateMin : undefined;
}
