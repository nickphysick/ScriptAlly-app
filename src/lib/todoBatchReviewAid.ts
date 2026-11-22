/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54 — a DEV-ONLY review aid: `window.__SA_TD54_BATCH = n` keeps the first n queries of the "Fill in what
 * you sent" batch, so a batch of 6 and a batch of 14 can be seen on an account whose batch is 63. It trims the INPUT
 * (the board's own queue) and invents nothing.
 * ⚠️ THE CALL SITE CARRIES THE MODE GATE (TodoWorkspace), so a production bundle never reaches this module.
 */
export function devBatchCap(): number | null {
  try {
    const n = Number((window as unknown as { __SA_TD54_BATCH?: unknown }).__SA_TD54_BATCH);
    return Number.isFinite(n) && n >= 2 ? Math.floor(n) : null;
  } catch { return null; }
}
