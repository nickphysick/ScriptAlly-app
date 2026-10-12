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
