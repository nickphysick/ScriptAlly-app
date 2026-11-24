/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · follow-up 2 — WHEN THE WRITER SET THEIR REMINDER (`Query.nudgeSetAt`, an ISO instant).
 *
 * A reminder set BEFORE the agent's latest reply entry reads as due on the entry's new reply date; one set AFTER it
 * stays where the writer put it (lib/agentReply `replyReminderMs`). A reminder with no stamp — every one written before
 * this field — counts as set before.
 *
 * ⚠️ STAMPED AT THE WRITE FUNNELS, NOT AT EACH CONTROL. About twenty controls set `nudgeDate` (the journeys, the card,
 * the To-do flows, the nudge's check-in, the agent card's "move the reminders"), and every one reaches a query document
 * through one of a handful of writers. Each writer passes its patch through `withReminderStamp`, so a new control cannot
 * forget the stamp. The source lock in reminderStamp.test.ts names every writer and fails on one that does not.
 *
 * ⚠️ A PATCH THAT ALREADY NAMES THE STAMP IS LEFT ALONE: that is an Undo putting the prior pair back, and stamping
 * "now" over it would make a restored reminder newer than it was.
 */
export const NUDGE_SET_AT_FIELD = "nudgeSetAt" as const;

/** a value that clears the field: absent-by-undefined, null, "" or a Firestore sentinel (`deleteField()`) */
const clears = (v: unknown): boolean => v === undefined || v === null || v === "" || (typeof v === "object" && !(v instanceof Date));
const dayOf = (v: unknown): string | null => {
  if (typeof v !== "string" || !v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * The query patch with the reminder's set-at stamp: set or changed → now; cleared → cleared with the same value
 * (undefined stays undefined, a `deleteField()` sentinel is reused); the same day as before → untouched (a save that
 * rewrites the reminder unchanged has not set it). No `nudgeDate` in the patch → untouched.
 *
 * ⚠️ THE PRIOR IS REQUIRED (close-out, 24 Nov). It is the query as it stood before this write, so a write that carries
 * the reminder unchanged (a whole-query save, a nudge re-booked for the same day) does not read as setting it. `null` is
 * only for a write with nothing before it (a new query) or one whose patch can never name the reminder — and a null
 * prior with a reminder in the patch stamps, so every writer that can carry one passes the query it read.
 */
export function withReminderStamp<T extends Record<string, unknown>>(patch: T, prior: { nudgeDate?: unknown } | null, now: Date = new Date()): T {
  if (!patch || !Object.prototype.hasOwnProperty.call(patch, "nudgeDate") || Object.prototype.hasOwnProperty.call(patch, NUDGE_SET_AT_FIELD)) return patch;
  const v = (patch as Record<string, unknown>).nudgeDate;
  if (clears(v)) return { ...patch, [NUDGE_SET_AT_FIELD]: v };
  if (prior && dayOf(prior.nudgeDate) != null && dayOf(prior.nudgeDate) === dayOf(v)) return patch;
  return { ...patch, [NUDGE_SET_AT_FIELD]: now.toISOString() };
}

/** the stamp, as an instant, or null (no stamp: counts as set before any entry) */
export function nudgeSetAtMs(q: unknown): number | null {
  const v = (q as Record<string, unknown> | null | undefined)?.[NUDGE_SET_AT_FIELD];
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}
