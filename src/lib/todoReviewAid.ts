/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoReviewAid — a DEV-ONLY review aid for the To-do list v5 page. It narrows INPUT and fabricates nothing:
 * `window.__SA_TD5_STATE = "caught"` hands the page an empty board (its queries and dates stay real), and
 * `"nothing"` hands it no board, no queries and no own tasks — so the two quiet states can be seen and measured on
 * the shared harness account, which holds about fifty tasks, without deleting anything. Every figure on those
 * states (Coming up, Done today, the ring) is still the page's own derivation over real documents.
 *
 * ⚠️ THE GATE IS AT THE CALL SITE (`TodoTray.tsx`): a statically replaced `import.meta.env.MODE` makes the call dead
 * in a production build and this module unreachable.
 */
export type TrayReviewState = "caught" | "nothing";

export function trayReviewState(): TrayReviewState | null {
  if (typeof window === "undefined") return null;
  const v = (window as unknown as { __SA_TD5_STATE?: unknown }).__SA_TD5_STATE;
  return v === "caught" || v === "nothing" ? v : null;
}
