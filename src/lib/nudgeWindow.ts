/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v141.1 — THE NUDGE WINDOW: the one rule for where an agent-court query stands in time.
 *
 *   wait   inside the agent's reply window (not yet past the expected reply date)
 *   nudge  past the expected reply date, by CLOSE_OVER_DAYS or less: a nudge is due
 *   close  past it by more than CLOSE_OVER_DAYS — or, with no expected date at all, CLOSE_UNDATED_DAYS in the stage
 *          with no word: worth considering closing
 *
 * ⚠️ ONE RULE, THREE READERS (Nick's ruling, v141.1): the Next action grouping (`nextAction`, lib/qcCalView), the
 *    four sets (`whereItStands`, lib/qcSummary) and the row's next move (`leadDoors`, lib/queryActions/entry) all ask
 *    THIS function. Before v141.1 the row's next move had its own cut-off (a year with the agent), and on the seed data
 *    24 queries read "Nudge" on their row while the grouping filed them under "Consider closing".
 * ⚠️ The To-do list's tasks (`replyTask`, lib/taskPrecedence) are a separate rule with its own grace and ceiling, and
 *    are deliberately not this one (v141.1 report).
 * ⚠️ The boundaries are strict: the expected date itself is still inside the window (`<`), and the 28th day past it is
 *    still a nudge (`>`). QC1411 L3 holds both edges.
 */

/** past the expected reply date by more than this, and it is not a nudge any more */
export const CLOSE_OVER_DAYS = 28;
/** …and an UNDATED stage this long with no word says the same thing */
export const CLOSE_UNDATED_DAYS = 84;
const DAY = 86_400_000;

export type NudgePhase = "wait" | "nudge" | "close";

/** where an agent-court query stands in time; the caller decides that it IS in the agent's court */
export function nudgePhase(r: { expectedMs: number | null; stageStartMs?: number | null }, nowMs: number): NudgePhase {
  const past = r.expectedMs != null && r.expectedMs < nowMs;
  const over = past ? (nowMs - r.expectedMs!) / DAY : 0;
  const inStage = r.stageStartMs != null ? (nowMs - r.stageStartMs) / DAY : 0;
  if ((past && over > CLOSE_OVER_DAYS) || (r.expectedMs == null && inStage > CLOSE_UNDATED_DAYS)) return "close";
  return past ? "nudge" : "wait";
}
