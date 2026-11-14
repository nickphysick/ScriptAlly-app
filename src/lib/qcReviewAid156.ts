/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v156 — a DEV-ONLY review aid for the header's "this week" line: it fabricates INPUT (the send dates fed
 * to `weekGoal154`), never the model, so the streak maths and the copy are the real ones. Set before load:
 *   window.__SA_QC156_GOAL = "streak" | "none" | "met"   (or localStorage "sa.qc156.goal")
 *     streak  the goal met in each of the last six weeks, one short this week   → "One more keeps the streak going."
 *     none    one send last week, one this week                                 → "[m] more to hit your goal this week."
 *     met     the goal met in the last six weeks and this one                   → "Goal met — nice work."
 * ⚠️ THE CALL SITE CARRIES THE MODE GATE (Queries.tsx), so a production build drops this module.
 */
const DAY = 86_400_000;
export type QcGoalAid = "streak" | "none" | "met";
export function qcGoalAid(): QcGoalAid | null {
  if (typeof window === "undefined") return null;
  let v = (window as unknown as { __SA_QC156_GOAL?: string }).__SA_QC156_GOAL;
  if (v == null) { try { v = window.localStorage.getItem("sa.qc156.goal") ?? undefined; } catch { /* a private window */ } }
  return v === "streak" || v === "none" || v === "met" ? v : null;
}
/** the send dates for a state, at the writer's goal: k weeks ago is now − 7k days, so it lands in that week */
export function goalAidSends(kind: QcGoalAid, goal: number, nowMs: number): number[] {
  const out: number[] = [];
  const week = (k: number, n: number) => { for (let i = 0; i < n; i++) out.push(nowMs - k * 7 * DAY - (i + 1) * 60_000); };
  if (kind === "none") { week(1, 1); week(0, 1); return out; }
  for (let k = 1; k <= 6; k++) week(k, goal);
  week(0, kind === "met" ? goal : Math.max(0, goal - 1));
  return out;
}
