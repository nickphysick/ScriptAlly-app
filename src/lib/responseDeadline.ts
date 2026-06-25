/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The canonical "response deadline" formula, in ONE place so the stored value and every live
 * fallback compute identically (zero drift). A response deadline is the query's send date plus the
 * agent's turnaround in whole weeks: `dateSent + responseTimeWeeks * 7 days`.
 *
 * This is the dateSent-anchored form — the correct, deterministic anchor for an EXISTING query.
 * (`addQuery` at db.tsx:1453 computes the at-creation value from `now`, which equals dateSent at
 * creation.) Both the Prompt-3 deadline fan-out (`computeAgentDeadlineWrites`) and the activityUtils
 * display fallback recompute through this, so a freshly-stored deadline and the live fallback can
 * never drift.
 */
export function computeResponseDeadline(dateSent: string, weeks: number): string {
  const d = new Date(dateSent);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString();
}
