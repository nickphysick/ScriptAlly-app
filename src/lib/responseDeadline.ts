/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The canonical "response deadline" formula, in ONE place so the stored value and every live
 * fallback compute identically (zero drift). A response deadline is the query's send date plus the
 * agent's turnaround in whole weeks: `dateSent + responseTimeWeeks * 7 days`.
 *
 * This is the dateSent-anchored form — the correct, deterministic anchor for an EXISTING query.
 * Both the Prompt-3 deadline fan-out (`computeAgentDeadlineWrites`) and the activityUtils display
 * fallback recompute through this, so a freshly-stored deadline and the live fallback can never
 * drift.
 *
 * ⚠️ IT THREW, AND IT THREW SILENTLY UNTIL IT DID NOT (§3, provenance pack). `weeks` is typed
 * `number`, but `addQuery`'s create-time seed passed `agent.responseTimeWeeks` straight in — an
 * OPTIONAL field. With no stated weeks `d.setDate(NaN)` makes the date invalid and `toISOString()`
 * raises a `RangeError`, so adding a query for an agency that states no response time would have
 * killed the whole create path. TypeScript did not see it because `responseTimeWeeks?: number`
 * reaches a `number` parameter through the same `Partial`-shaped call site that carries the rest.
 *
 * ⚠️ §1 REMOVED THAT CALL — the create-time seed is gone, because storing the agency's window on
 * the query was a stored copy of a derivable fact. THE GUARD STAYS ANYWAY: two other callers pass
 * weeks from records that may not carry them, and a function that returns an invalid date rather
 * than throwing would have been worse, not better.
 *
 * ⚠️ IT RETURNS `""`, NOT A GUESSED DATE. There is no window, so there is no deadline; inventing a
 * house figure here would put the app's own arithmetic into a field every reader treats as a fact
 * about the agency. Callers already treat an absent deadline as absent.
 *
 * ⚠️ AND THE GUARD IS ABSENCE, NOT FALSINESS — `0` KEEPS ITS OLD ANSWER. A stored zero is the
 * retired "not stated" convention rather than a missing value, the fan-out has always turned it
 * into the send date unchanged, and `!weeks` would have swept it up with `undefined` and changed a
 * behaviour this section was not asked to touch. The throw came from absence; only absence is
 * caught. (Whether a zero window means anything is a separate question, and `agentWindowMs` in
 * `expectedDate.ts` already declines to draw one — that is a DISPLAY decision, not this formula's.)
 */
export function computeResponseDeadline(dateSent: string, weeks?: number | null): string {
  if (weeks == null || !Number.isFinite(weeks) || weeks < 0) return "";
  const d = new Date(dateSent);
  d.setDate(d.getDate() + weeks * 7);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
