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

import { MONTHS_SHORT } from "./dates";

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
  "You're using QueryHawk before it's finished. Your data is real and kept safely — but expect " +
  "the odd rough edge, and ";

export const BETA_STRIP_REPORT_LINK = "tell us when you find one";

export const BETA_STRIP_KNOWN_LINK = "What we already know about";

/** The feedback panel's own copy (Help system v1, Part E — design-refs/help-system-v1, screens 08 to 11). */
export const FEEDBACK_FAB = "Give feedback";
export const FEEDBACK_HEADING = "Tell us what you found";
export const FEEDBACK_SUBHEAD = "Every message reaches Nick, the founder.";
export const FEEDBACK_CLOSE_LABEL = "Close. Your draft is kept";
export const FEEDBACK_KIND_LABEL = "What kind of thing is it?";
export const FEEDBACK_SEND = "Send to Nick";
export const FEEDBACK_SENDING = "Sending…";
export const FEEDBACK_SENT_TITLE = "Got it, thank you";
export const FEEDBACK_SIGNATURE = "— Nick, founder";
export const FEEDBACK_SEVERITY_LABEL = "How much is it in your way?";
export const FEEDBACK_MAX = 4000;
export const FEEDBACK_SHOT_MAX = 5 * 1024 * 1024;

/**
 * ⚠️ THE FOUR KINDS INCLUDE ONE THAT IS NOT A COMPLAINT. "Something I liked" is in the list because
 * a feedback channel that only accepts faults teaches people it is a complaints box, and then it
 * only ever hears from the angriest tenth of them.
 * ⚠️ KEPT IN STEP WITH THE FUNCTION'S `FEEDBACK_KINDS` (functions/src/betaFeedbackCore), which refuses anything else.
 */
export const FEEDBACK_KINDS = [
  "Something's broken",
  "Something's confusing",
  "An idea",
  "Something I liked",
] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

/** The question follows the kind. */
export const FEEDBACK_QUESTION: Record<FeedbackKind, { label: string; placeholder: string }> = {
  "Something's broken": { label: "What happened?", placeholder: "What were you doing, what did you expect, and what happened instead?" },
  "Something's confusing": { label: "What were you trying to do?", placeholder: "Tell us where you got stuck, or which word or screen didn't make sense." },
  "An idea": { label: "What would make QueryHawk better for you?", placeholder: "Something you wish it did, or did differently." },
  "Something I liked": { label: "What did you like?", placeholder: "Knowing what works tells us what to keep." },
};

/** Broken only, optional. Kept in step with the function's `FEEDBACK_SEVERITIES`. */
export const FEEDBACK_SEVERITIES = ["Just noticed", "Slowing me down", "I can't carry on"] as const;
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];

/**
 * ⚠️ THE SCREENSHOT IS OFF UNTIL FIREBASE STORAGE EXISTS ON THE PROJECT. `scriptally-dev` has a bucket name and a rules
 * file but Storage was never set up ("Get Started" in the console), so the rule cannot deploy and every upload would fail
 * — and a failed upload fails the whole send. The pack's rule: leave it out rather than fake it. Everything else is
 * built (the drop zone, the paste, the upload path, the function's own-uid check, the Storage rule in storage.rules):
 * set Storage up, deploy the rule, and flip this.
 */
export const FEEDBACK_SCREENSHOTS = false;

/** Broken or confusing only: the screenshot (and only while FEEDBACK_SCREENSHOTS is on). */
export const takesScreenshot = (k: FeedbackKind | null) => FEEDBACK_SCREENSHOTS && (k === "Something's broken" || k === "Something's confusing");

export const FEEDBACK_CONTEXT_SUMMARY = "Sent with it: the page, your browser and your account";
export const FEEDBACK_NEVER = "Never anything you've written: no agents, queries, letters or manuscript.";
export const FEEDBACK_ACCOUNT_LINE = "Linked, so we can look into it";

/** The sent state's lines. */
export function feedbackSentLines(o: { wantsReply: boolean; email: string | null; broken: boolean }): { lead: string; email?: string; tail: string } {
  const tail = o.broken ? " Broken things go to the top of the list." : "";
  if (o.wantsReply && o.email) return { lead: "If it needs a reply, it'll come to ", email: o.email, tail: ` from feedback@queryhawk.net.${tail}` };
  return { lead: `You chose not to get a reply, so this one is just for us.${tail}`, tail: "" };
}

export interface FeedbackContext {
  route: string;
  viewport: string;
  browser: string;
  uid?: string;
  appVersion?: string;
}

/**
 * The browser in plain words — "Chrome 154 on a Mac" — from a user agent. Small and deliberate: the families a writer
 * is likely to use, in the order their user agents need checking (Edge and Opera both claim Chrome; Chrome claims Safari).
 */
export function describeBrowser(ua: string): string {
  const v = (re: RegExp) => { const m = re.exec(ua); return m ? m[1].split(".")[0] : ""; };
  let name = "A browser";
  let ver = "";
  if (/Edg\//.test(ua)) { name = "Edge"; ver = v(/Edg\/([\d.]+)/); }
  else if (/OPR\//.test(ua)) { name = "Opera"; ver = v(/OPR\/([\d.]+)/); }
  else if (/Firefox\//.test(ua)) { name = "Firefox"; ver = v(/Firefox\/([\d.]+)/); }
  else if (/CriOS\//.test(ua)) { name = "Chrome"; ver = v(/CriOS\/([\d.]+)/); }
  else if (/Chrome\//.test(ua)) { name = "Chrome"; ver = v(/Chrome\/([\d.]+)/); }
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) { name = "Safari"; ver = v(/Version\/([\d.]+)/); }
  let os = "";
  if (/iPhone/.test(ua)) os = "an iPhone";
  else if (/iPad/.test(ua)) os = "an iPad";
  else if (/Android/.test(ua)) os = "Android";
  else if (/CrOS/.test(ua)) os = "a Chromebook";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "a Mac";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Linux/.test(ua)) os = "Linux";
  return `${name}${ver ? ` ${ver}` : ""}${os ? ` on ${os}` : ""}`;
}

/** "Beta, 19 Oct" — the build's date (vite.config's `__QH_BUILD_DATE__`), or "Beta" where it is not defined (tests). */
export function appVersionLabel(iso?: string): string {
  if (!iso) return "Beta";
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "Beta";
  return `Beta, ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}
