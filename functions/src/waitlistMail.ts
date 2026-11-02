/**
 * waitlistMail — the three waitlist emails' senders, and the IP salt they sign with.
 *
 * Moved out of waitlist.ts unchanged (launch readiness, 2 Nov) so the retention job can send email 2
 * to a writer it promotes, without a second copy of the sender.
 */
import { defineSecret } from "firebase-functions/params";
import { db } from "./firestore";
import { sendEmail } from "./email";
import { resolveMailConfig } from "./emailConfig";
import { prepareConfirm, prepareWaiting, prepareWelcome } from "./emailTemplates";
import { unsubscribeToken } from "./waitlistModel";

/**
 * ⚠️ THE IP SALT IS A SECRET AND NEVER HAS A DEFAULT IN CODE. A hard-coded fallback would look
 * like a salt and provide none — anyone with the repo could reverse every stored hash by
 * enumerating IPv4. When it is unset the function still works and simply stores no `ipHash`:
 * rate limiting degrades to per-window-without-identity rather than the build failing closed on a
 * public signup form.
 */
export const IP_HASH_SALT = defineSecret("WAITLIST_IP_SALT");

/**
 * ⚠️ A MESSAGE WITH A MISSING LINK IS NOT SENT, AND THE REFUSAL IS LOUD. `prepare*` returns what
 * was missing rather than a message with an empty href — refusing is recoverable (fix the config,
 * run it again) and a hundred invites carrying a dead link is not. An absent unsubscribe link
 * refuses too: that is a compliance failure, not a cosmetic one.
 *
 * ⚠️ THE UNSUBSCRIBE TOKEN NEEDS THE SALT, so an unset `WAITLIST_IP_SALT` refuses the send rather
 * than emailing an unsigned link. That is the one place the salt is load-bearing beyond rate
 * limiting, and it is why the refusal names it.
 */
export const sendConfirm = async (to: string, docId: string, verifyToken: string, salt: string) => {
  const cfg = resolveMailConfig(process.env);
  if (!salt) {
    console.error(JSON.stringify({ event: "email.refused", template: "confirm", missing: ["salt"] }));
    return;
  }
  const prepared = prepareConfirm(cfg, verifyToken, unsubscribeToken(docId, salt));
  if (!prepared.ok) {
    console.error(JSON.stringify({
      event: "email.refused", template: "confirm", missing: prepared.missing,
    }));
    return;
  }
  await sendEmail(to, "confirm", prepared.email);
};

export const sendWelcome = async (docId: string, position: number, cap: number, salt: string) => {
  const cfg = resolveMailConfig(process.env);
  /* The address is not in the verify request — it is on the document the token just verified. */
  const snap = await db.doc(`waitlist/${docId}`).get();
  const to = (snap.get("email") as string) ?? "";
  if (!to || !salt) {
    console.error(JSON.stringify({
      event: "email.refused", template: "welcome",
      missing: [...(to ? [] : ["recipient"]), ...(salt ? [] : ["salt"])],
    }));
    return;
  }
  const prepared = prepareWelcome(cfg, position, cap, unsubscribeToken(docId, salt));
  if (!prepared.ok) {
    console.error(JSON.stringify({
      event: "email.refused", template: "welcome", missing: prepared.missing,
    }));
    return;
  }
  await sendEmail(to, "welcome", prepared.email);
};

/** Email 3, to a writer whose confirmation landed on the waiting list. Same refusals as the welcome. */
export const sendWaiting = async (docId: string, salt: string) => {
  const cfg = resolveMailConfig(process.env);
  const snap = await db.doc(`waitlist/${docId}`).get();
  const to = (snap.get("email") as string) ?? "";
  if (!to || !salt) {
    console.error(JSON.stringify({
      event: "email.refused", template: "waiting",
      missing: [...(to ? [] : ["recipient"]), ...(salt ? [] : ["salt"])],
    }));
    return;
  }
  const prepared = prepareWaiting(cfg, unsubscribeToken(docId, salt));
  if (!prepared.ok) {
    console.error(JSON.stringify({ event: "email.refused", template: "waiting", missing: prepared.missing }));
    return;
  }
  await sendEmail(to, "waiting", prepared.email);
};
