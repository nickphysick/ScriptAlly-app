/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountDeletion — the grace window between asking and losing everything.
 *
 * ⚠️ NOTHING PURGES ANYTHING. There is no scheduled-job infrastructure in this project — zero
 * `onSchedule` handlers, no pubsub, no Cloud Scheduler — so what this module builds is the
 * REQUEST and the CANCEL, and `ACCOUNT_DELETION_ENABLED` in `dataExport.ts` still reads false to
 * say the purge does not exist. That is deliberate and it governs the copy: the page may say a
 * deletion has been ASKED FOR, and must not say it WILL HAPPEN on a date, because nothing in this
 * repo would make that true.
 *
 * ⚠️ IT IS NOT A PARALLEL DELETION PATH. `deletionConfirmed` stays where it was, in `dataExport`,
 * and this module imports it — one predicate deciding whether a confirmation counts, wherever the
 * question is asked.
 */
import { deletionConfirmed } from "./dataExport";
import { DELETION_WINDOW_DAYS } from "./companyInfo";

/**
 * ⚠️ FOURTEEN DAYS, AND THE WINDOW IS THE WHOLE SAFETY MECHANISM. An account deletion that took
 * effect on the click would be the one irreversible act in the app with no way back; the window is
 * what makes a moment of certainty survivable. It is deliberately shorter than the privacy
 * policy's own stated deletion period, so a purge running at the end of it still lands inside what
 * the policy promises.
 */
export const DELETION_GRACE_DAYS = 14;

/**
 * ⚠️ THE WORD IS `DELETE`, AND THIS SUPERSEDES THE ACCOUNT-EMAIL FORM.
 *
 * `deletionConfirmed` previously required the account's own email address, on the reasoning that
 * "typing your own address is a sentence you have to mean". That reasoning is good and it has one
 * hole the docblock did not consider: YOUR EMAIL IS ON THE SAME PAGE — in the Profile band, and in
 * the security section's read-only field — and browsers autofill it. A confirmation you can copy
 * from two inches away, or that the browser offers to type for you, is closer to a checkbox than
 * to a sentence. `DELETE` appears nowhere as a value to copy.
 *
 * Recorded as a supersession rather than a silent flip: the old form was a decision, and
 * `dataExport.test.ts` had a lock asserting `DELETE` would NOT confirm.
 */
export const DELETION_CONFIRM_WORD = "DELETE";

/** Whether the typed text arms the button. Delegates — one predicate, one place. */
export function deletionArmed(typed: string): boolean {
  return deletionConfirmed(typed, DELETION_CONFIRM_WORD);
}

export interface ScheduledDeletion {
  requestedAt: string;
  purgeAfter: string;
}

/** The record written when someone confirms. `now` injected so the dates are testable. */
export function deletionRequest(now: Date = new Date()): ScheduledDeletion {
  const purge = new Date(now.getTime() + DELETION_GRACE_DAYS * 86400000);
  return { requestedAt: now.toISOString(), purgeAfter: purge.toISOString() };
}

/**
 * How many whole days are left, floored at zero.
 *
 * ⚠️ A WINDOW THAT HAS RUN OUT IS STILL A LIVE REQUEST, not an expired one. With no purge job, an
 * account past its date has NOT been deleted — reading the state as "over" would let the page stop
 * showing the request and quietly drop the writer's only way to cancel it.
 */
export function daysRemaining(s: ScheduledDeletion, now: Date = new Date()): number {
  const end = new Date(s.purgeAfter).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - now.getTime()) / 86400000));
}

/** A stored value that is not a usable record reads as "no request" rather than crashing. */
export function scheduledDeletion(
  stored: Partial<ScheduledDeletion> | undefined | null,
): ScheduledDeletion | null {
  if (!stored?.requestedAt || !stored?.purgeAfter) return null;
  if (Number.isNaN(new Date(stored.purgeAfter).getTime())) return null;
  return { requestedAt: stored.requestedAt, purgeAfter: stored.purgeAfter };
}

/**
 * What the scheduled block says.
 *
 * ⚠️ "DUE FOR DELETION", NOT "WILL BE DELETED". Nothing runs on that date. The sentence states
 * what is TRUE — a request exists, dated, cancellable — and the caller renders the plain admission
 * that completion is not automatic. Promising an automatic purge would be this build's one piece
 * of copy that the code cannot back, and on the most consequential control on the page.
 */
export function deletionNotice(s: ScheduledDeletion, now: Date = new Date()): string {
  const when = new Date(s.purgeAfter).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const left = daysRemaining(s, now);
  const days = left === 1 ? "1 day" : `${left} days`;
  return left > 0
    ? `Your account is due for deletion on ${when} — ${days} from now.`
    : `Your account was due for deletion on ${when}.`;
}

/**
 * The retention sentence.
 *
 * ⚠️ THE PERIOD IS CONFIRMED AND COMES FROM `companyInfo.DELETION_WINDOW_DAYS`, which the privacy
 * policy reads too — so settings and the notice state one number or neither. It shipped WITHOUT a
 * figure for one commit, while the constant was still the placeholder "[30]": a bracketed
 * placeholder reaching a reader is worse than no figure, and turning one into a retention
 * commitment is a business decision rather than a formatting fix. Confirmed 21 Aug 2026.
 */
export const RETENTION_LINE =
  `Your data is kept while your account exists. If you delete your account, it's gone from our ` +
  `backups within ${DELETION_WINDOW_DAYS} days.`;

/** Exactly what goes, named. Vague reassurance is not consent to lose your work. */
export const DELETION_REMOVES = [
  "Your manuscripts, and every version and package on them",
  "Your agents, and the notes you've kept on them",
  "Your queries, and the whole history recorded against them",
  "Your to-do list, notes to self, and your account itself",
];
