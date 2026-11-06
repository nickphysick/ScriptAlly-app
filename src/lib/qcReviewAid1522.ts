/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.2 — a dev-only review aid. `window.__SA_QC_PLAN = "free"` draws the page as the Free plan sees it
 * (Package grouping locked, no Version select); "pro" as Pro. It changes what is DRAWN, never what is stored.
 * ⚠️ THE CALL SITE CARRIES THE MODE GATE (`import.meta.env.MODE !== "production" ? qcPlanAid() : null`), so a
 *    production bundle never reaches this module.
 */
export function qcPlanAid(): boolean | null {
  if (typeof window === "undefined") return null;
  const v = (window as unknown as { __SA_QC_PLAN?: string }).__SA_QC_PLAN;
  return v === "free" ? false : v === "pro" ? true : null;
}
