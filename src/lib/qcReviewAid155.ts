/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v155 — a dev-only review aid for the two states the harness account cannot show on its own.
 *
 *   window.__SA_QC_STATE = "quiet"   the list's rows without any query in Offers, Materials requested or Nudge due
 *   window.__SA_QC_STATE = "first"   no rows at all for the manuscript (day one)
 *
 * Or, to survive a reload on dev: `localStorage.setItem("sa.qc155.state", "quiet")` (remove the key to go back).
 * The loading skeleton has its own aid: `window.__SA_QC_HOLD_MS = 4000`, or `localStorage "sa.qc155.holdMs"` (useQcLoad).
 *
 * ⚠️ IT TAKES ROWS AWAY, NEVER WRITES OR DRAWS ANY: the page's own condition, copy and layout run on what is left, so a
 *    screenshot under it is evidence about the page. Nothing is stored.
 * ⚠️ THE CALL SITE CARRIES THE MODE GATE (`import.meta.env.MODE !== "production" ? qcStateAid() : null`), so a
 *    production bundle never reaches this module.
 */
export type QcStateAid = "quiet" | "first";
export function qcStateAid(): QcStateAid | null {
  if (typeof window === "undefined") return null;
  let v = (window as unknown as { __SA_QC_STATE?: string }).__SA_QC_STATE;
  if (v == null) { try { v = window.localStorage.getItem("sa.qc155.state") ?? undefined; } catch { /* a private window */ } }
  return v === "quiet" || v === "first" ? v : null;
}
