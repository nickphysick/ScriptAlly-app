/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Beta mode — one flag, and everything the beta adds hangs off it.
 *
 * ⚠️ TURNING IT OFF MUST LEAVE THE APP AS IT WAS. The strip, the feedback dock and the invite gate
 * all render only while this is true, and signup is open exactly as it is today when it is false.
 * That is what makes leaving beta a one-line change rather than three removals, each of which is a
 * chance to leave something behind.
 *
 * ⚠️ IT IS NOT A SECRET AND NOT A GATE ON ITS OWN. The invite check that matters runs server-side;
 * this only decides whether the door is shown. A client constant is a decision about what to
 * render, never about what is permitted.
 */

/** Is this build a beta? Flip to false to leave beta. */
export const BETA_MODE = true;

/**
 * ⚠️ THE INVITE GATE IS BUILT AND NOT ARMED, AND IT IS A SEPARATE FLAG FOR A REASON.
 *
 * `BETA_MODE` is safe to ship true: it draws the strip and the feedback dock, and the worst a
 * writer meets if the feedback function is undeployed is a send that reports its own failure. The
 * invite gate is NOT safe to ship true, because `redeemInviteCode` is undeployed and no codes are
 * seeded — so turning it on before the deploy does not gate signup, it CLOSES it, for everyone,
 * silently, with a message about a code being wrong.
 *
 * Folding it into BETA_MODE would have made one flag mean "show the beta furniture" and "lock the
 * door" at once, and the safe half is the reason to leave the flag on.
 *
 * Nick: deploy `functions:redeemInviteCode` and `firestore:rules`, seed at least one
 * `inviteCodes/{CODE}` document, redeem a code end to end, THEN set this true.
 */
export const INVITE_GATE_ENABLED = false;

/**
 * Where the strip's dismissal is remembered.
 *
 * ⚠️ SESSION, NOT LOCAL, AND DELIBERATELY. A beta notice a writer dismissed in March should be back
 * the next time they open the app: what it says is still true, and the known-issues link behind it
 * is the thing that stops the same three faults being reported over and over. Persisting the
 * dismissal for ever would quietly retire the notice while the beta was still running.
 */
export const BETA_STRIP_DISMISSED_KEY = "sa.betaStripDismissed";

export const BETA_PILL = "Beta";

export const BETA_STRIP_LEAD =
  "You're using ScriptAlly before it's finished. Your data is real and kept safely — but expect " +
  "the odd rough edge, and ";

export const BETA_STRIP_REPORT_LINK = "tell us when you find one";

export const BETA_STRIP_KNOWN_LINK = "What we already know about";

/** The feedback dock's own copy. */
export const FEEDBACK_FAB = "Give feedback";
export const FEEDBACK_HEADING = "Tell us what you found";
export const FEEDBACK_KIND_LABEL = "What kind of thing is it?";
export const FEEDBACK_MESSAGE_LABEL = "What happened?";
export const FEEDBACK_PLACEHOLDER =
  "What were you doing, what did you expect, what happened instead?";
export const FEEDBACK_SEND = "Send it";
export const FEEDBACK_SENT_TITLE = "Got it";
export const FEEDBACK_SENT_BODY =
  "We read every one of these. If it needs a reply, you'll get one.";

/**
 * ⚠️ THE FOUR KINDS INCLUDE ONE THAT IS NOT A COMPLAINT. "Something I liked" is in the list because
 * a feedback channel that only accepts faults teaches people it is a complaints box, and then it
 * only ever hears from the angriest tenth of them.
 */
export const FEEDBACK_KINDS = [
  "Something's broken",
  "Something's confusing",
  "An idea",
  "Something I liked",
] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

/**
 * ⚠️ WHAT THE DOCK CAPTURES, AND WHAT IT MUST NEVER. Route, viewport, user agent and the account's
 * uid — enough to reproduce a fault. NEVER page content, never a form's values, never a line of
 * anyone's manuscript. The panel says so where the writer can read it, because a context block
 * they cannot inspect is a context block they have to take on trust.
 */
export const FEEDBACK_PRIVACY_NOTE =
  "We send the page you're on, your browser and your account — never anything you've written.";

export interface FeedbackContext {
  route: string;
  viewport: string;
  browser: string;
  uid?: string;
  appVersion?: string;
}

/** The three lines the panel shows back, in the ref's order. */
export function feedbackContextLines(context: FeedbackContext): string[] {
  return [
    `PAGE · ${context.route}`,
    `BROWSER · ${context.browser} · ${context.viewport}`,
    `ACCOUNT · ${context.uid ? "attached automatically" : "not signed in"}`,
  ];
}
