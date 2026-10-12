/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * corkboardReviewAid — a DEV-ONLY review aid for the Corkboard. It narrows INPUT and fabricates nothing:
 * `window.__SA_CB_ONLY = "cbseed-"` hands the page only the user tasks whose id starts with that prefix, so
 * a lock about "eight notes" or "one note" or "no notes" can be measured on the shared harness account
 * without deleting what other sessions keep there (tests/e2e/seedCorkboard.mjs writes the `cbseed-*` set).
 * Every count, chip and position is still derived by the page's own functions from real documents.
 *
 * ⚠️ THE GATE IS AT THE CALL SITE (`TodoNoteboardPage.tsx`), where a statically replaced
 * `import.meta.env.MODE` makes the call dead code in a production build and this module unreachable — a
 * guard inside the module would still ship the module (the qcReviewAid lesson).
 */
import type { UserTask } from "../types";

export function onlyForReview(tasks: UserTask[]): UserTask[] {
  if (typeof window === "undefined") return tasks;
  const p = (window as unknown as { __SA_CB_ONLY?: unknown }).__SA_CB_ONLY;
  if (typeof p !== "string" || !p) return tasks;
  return tasks.filter((t) => t.id.startsWith(p));
}

/**
 * `window.__SA_CB_HOLD_MS = n` holds the page in its loading beat for n ms after the collections land — as if
 * the writer's tasks had not answered yet — so the loading frame can be measured against the page that
 * replaces it (lock L1). It delays INPUT (when the page believes its data has settled); nothing is drawn for it.
 */
export function loadHoldForReview(): number {
  if (typeof window === "undefined") return 0;
  const v = (window as unknown as { __SA_CB_HOLD_MS?: unknown }).__SA_CB_HOLD_MS;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}
