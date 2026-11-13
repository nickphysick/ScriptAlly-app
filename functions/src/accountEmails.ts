/**
 * sendAccountEmail — callable Cloud Function (europe-west2): the branded account emails (non-workspace v1, 9c).
 *
 * Makes the Firebase action link with the Admin SDK and sends our own email through `sendEmail`, from
 * "QueryHawk <hello@queryhawk.net>" (`SENDER_OF`). The logic is `handleAccountEmail` (accountEmailsCore.ts); this file
 * only wires the real dependencies in and maps refusals to `HttpsError`.
 *
 *   data: { kind: "signin" | "reset", email, origin? }    — no account needed
 *         { kind: "newEmail", newEmail, origin? }          — signed in
 *         { kind: "emailChanged" }                         — signed in, after the change has gone through
 *   answer: { ok: true }, the same for every address.
 *
 * ⚠️ THE RATE LIMIT IS THE WAITLIST'S (`consumeRateLimit`, `ratelimits/{key}_{hour}`: five an hour), keyed on a
 *    hash of the kind and the address (signed out) or the uid (signed in). Imported, not copied; nothing in
 *    waitlistStore changed. The collection is admin-only in firestore.rules.
 * ⚠️ THE PENDING CHANGE OF ADDRESS lives at `accountEmailChanges/{uid}`, admin-only (the rules' default deny), so the
 *    notice goes to the address the account was changed FROM, never to one a client names.
 * ⚠️ FIRESTORE THROUGH `db` (./firestore) ONLY — firestoreHandle.test.ts.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { db } from "./firestore";
import { RESEND_API_KEY, sendEmail } from "./email";
import { consumeRateLimit } from "./waitlistStore";
import { AccountEmailDeps, AccountEmailError, handleAccountEmail } from "./accountEmailsCore";
import { IP_HASH_SALT } from "./waitlistMail";
import { makeSettingsToken } from "./emailSettingsCore";

const PENDING = "accountEmailChanges";

const realDeps = (): AccountEmailDeps => {
  const auth = admin.auth();
  return {
    env: process.env,
    now: () => Date.now(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    canSend: () => !!RESEND_API_KEY.value(),
    auth: {
      getUserByEmail: (e) => auth.getUserByEmail(e),
      getUser: (uid) => auth.getUser(uid),
      generateSignInWithEmailLink: (e, s) => auth.generateSignInWithEmailLink(e, s),
      generatePasswordResetLink: (e, s) => auth.generatePasswordResetLink(e, s),
      generateVerifyAndChangeEmailLink: (e, n, s) => auth.generateVerifyAndChangeEmailLink(e, n, s),
    },
    allow: async (key) => (await consumeRateLimit(db, key, Date.now())).allowed,
    send: (to, kind, rendered) => sendEmail(to, kind, rendered),
    /* Non-workspace v1.1: the sign-in and reset emails' "Email settings" link opens the no-sign-in page. */
    settingsToken: (uid) => {
      let secret = "";
      try { secret = IP_HASH_SALT.value(); } catch { secret = ""; }
      return makeSettingsToken(uid, secret, Date.now());
    },
    pending: {
      put: async (uid, v) => { await db.doc(`${PENDING}/${uid}`).set(v); },
      take: (uid, currentEmail) => db.runTransaction(async (tx) => {
        const ref = db.doc(`${PENDING}/${uid}`);
        const snap = await tx.get(ref);
        if (!snap.exists) return null;
        const oldEmail = String(snap.get("oldEmail") ?? ""), newEmail = String(snap.get("newEmail") ?? "");
        if (!oldEmail || newEmail !== currentEmail) return null;
        tx.delete(ref);
        return { oldEmail, newEmail };
      }),
    },
  };
};

export const sendAccountEmail = onCall(
  { region: "europe-west2", timeoutSeconds: 30, memory: "256MiB", secrets: [RESEND_API_KEY, IP_HASH_SALT] },
  async (request) => {
    const data = (request.data ?? {}) as Record<string, unknown>;
    try {
      return await handleAccountEmail({ kind: data.kind, data, uid: request.auth?.uid ?? null }, realDeps());
    } catch (e) {
      if (e instanceof AccountEmailError) throw new HttpsError(e.code, e.message);
      console.error(JSON.stringify({ event: "account.email", outcome: "internal", message: String((e as Error)?.message ?? e).slice(0, 200) }));
      throw new HttpsError("internal", "Something went wrong. Please try again.");
    }
  },
);
