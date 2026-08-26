/**
 * unsubscribePage — the plain page an unsubscribe link lands on.
 *
 * ⚠️ SERVED BY THE FUNCTION, NOT A REDIRECT INTO THE APP. The verify link redirects to `/founders`
 * and nothing there reads the parameter yet — so a redirect would drop someone who has just left
 * onto a page still selling them the offer. A self-contained answer needs no client change and
 * cannot say the wrong thing.
 *
 * ⚠️ NO DARK PATTERNS, AND THAT IS A LIST OF SPECIFIC ABSENCES: no "are you sure", no undo link,
 * no "was this a mistake?", no offer to stay, no survey asking why. They clicked a link in an
 * email we sent them. The only honest response is to confirm it is done and get out of the way.
 *
 * ⚠️ AND IT SAYS WHAT LEAVING COSTS. The place goes back to the list — that is worth knowing, and
 * saying it is not the same as asking them to reconsider. It is stated in the past tense, as a
 * fact about what just happened, not as a reason to come back.
 */

import { UnsubscribeOutcome } from "./waitlistStore";
import { SUPPORT_EMAIL } from "./emailConfig";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Words { title: string; heading: string; body: string }

/**
 * ⚠️ A BAD TOKEN AND A MISSING DOCUMENT READ THE SAME, AND NEITHER READS AS AN ACCUSATION. From
 * the reader's side both mean "you are not on this list", which is what they wanted; telling them
 * apart would also make this endpoint an oracle for which signed ids exist.
 */
const words = (outcome: UnsubscribeOutcome | null): Words => {
  if (!outcome || !outcome.found) {
    return {
      title: "You're not on the list",
      heading: "You're not on the list.",
      body: "This link doesn't match anyone we're holding a place for — you may have unsubscribed " +
            "already, or the address may never have been added. Either way, there's nothing to do.",
    };
  }
  if (outcome.released) {
    return {
      title: "You're unsubscribed",
      heading: "That's done — you're off the list.",
      body: "We won't email you about founding access again. Your founding place has gone back to " +
            "the list for someone else.",
    };
  }
  /* Pending, waiting, or a second click on a link already used. */
  return {
    title: "You're unsubscribed",
    heading: "That's done — you're off the list.",
    body: "We won't email you about founding access again. You hadn't confirmed a founding place, " +
          "so there was nothing to give back.",
  };
};

export const unsubscribePage = (outcome: UnsubscribeOutcome | null): string => {
  const w = words(outcome);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(w.title)} — ScriptAlly</title>
<style>
  body{margin:0;background:#f7f4ee;color:#2e2722;
       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
  .card{max-width:520px;margin:14vh auto 0;background:#fffefb;border:1px solid #e7ddd2;
        border-radius:14px;padding:34px 32px}
  h1{margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:600}
  p{margin:0 0 14px;font-size:16px;line-height:1.6}
  .quiet{color:#6d5348;font-size:14px;margin:0}
  a{color:#7c3a2a}
</style>
</head><body>
<div class="card">
  <h1>${esc(w.heading)}</h1>
  <p>${esc(w.body)}</p>
  <p class="quiet">If that wasn't you, or you'd like to talk to a person, write to
    <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>.</p>
</div>
</body></html>`;
};
