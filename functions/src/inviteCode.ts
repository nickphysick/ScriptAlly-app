/**
 * redeemInviteCode — callable Cloud Function (europe-west2, Blaze plan).
 *
 * The beta's actual gate. The client's invite step is presentation; the account is created by the
 * Firebase Auth SDK, which anyone can call from a console, so a check that only runs in the browser
 * gates nothing at all. This is the check.
 *
 * ⚠️ IT IS SINGLE-USE, ENFORCED IN A TRANSACTION. Read-then-write outside one lets two callers with
 * the same code both see it unused and both redeem it, which is precisely the hole a beta invite is
 * supposed to close.
 *
 * ⚠️ ONE ANSWER FOR TWO FAILURES. Unknown and already-used return the SAME error. Telling them
 * apart turns this endpoint into an oracle: feed it codes and it reports which ones exist.
 *
 * ⚠️ IT IS CALLED BEFORE THE ACCOUNT EXISTS, so the caller is unauthenticated by necessity and the
 * code is marked used against the EMAIL given. A caller can therefore burn a code without finishing
 * signup — self-limiting (they had the code) and the honest trade for a gate that cannot be
 * bypassed. Binding to a uid instead would need the account to exist first, which is the thing
 * being gated.
 *
 * Seeding a code (Nick, from the console or the Admin SDK):
 *   inviteCodes/{CODE} = { issuedToEmail: "…", createdAt: <ts> }   // usedAt/usedBy absent = unused
 *
 * NOT DEPLOYED. Deploy with:
 *   firebase deploy --only functions:redeemInviteCode --project scriptally-dev
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const MAX_CODE = 64;

/** The one message both failures get. Kept identical to INVITE_REJECTED in src/lib/inviteCode.ts. */
const REJECTED =
  "That code isn't one of ours, or it's already been used. Check the email we sent, or ask us to " +
  "look it up.";

const normalise = (raw: unknown): string =>
  typeof raw === "string"
    ? raw.trim().toUpperCase().replace(/\s+/g, "").replace(/[‐-―−]/g, "-")
    : "";

export const redeemInviteCode = onCall(
  { region: "europe-west2", timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    const data = (request.data ?? {}) as Record<string, unknown>;
    const code = normalise(data.code);
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase().slice(0, 254) : "";

    // A malformed code is refused with the SAME message — the length of a real code is a hint too.
    if (!code || code.length > MAX_CODE) throw new HttpsError("permission-denied", REJECTED);

    try {
      await db.runTransaction(async (tx) => {
        const ref = db.doc(`inviteCodes/${code}`);
        const snap = await tx.get(ref);
        // Unknown and spent are indistinguishable from out here, on purpose.
        if (!snap.exists || snap.get("usedAt")) throw new HttpsError("permission-denied", REJECTED);
        tx.update(ref, {
          usedAt: FieldValue.serverTimestamp(),
          // The account does not exist yet, so the email given is what a code can be bound to.
          usedBy: email || null,
        });
      });
      return { ok: true };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error("redeemInviteCode: transaction failed:", e);
      throw new HttpsError("internal", "Something went wrong. Please try again.");
    }
  },
);
