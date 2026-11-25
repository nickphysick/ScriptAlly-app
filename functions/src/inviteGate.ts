/**
 * inviteGate — a `beforeUserCreated` blocking function (App site v1, Phase 1): only invited emails may create an
 * account. Identity Platform calls it before EVERY new account, whatever the door — email and password, Google, or
 * an email sign-in link — so this is the lock; the founder's code screen is only the way to it.
 *
 * The rule and its reasons are in `inviteGateCore.ts`. A refusal carries `NOT_INVITED`, which the client turns into
 * the plain "join the waitlist" message (src/lib/notInvited.ts, `isNotInvited`).
 *
 * ⚠️ IT NEEDS IDENTITY PLATFORM. Blocking functions exist only on a project upgraded from Firebase Auth; deploying
 *    this registers it in the project's Auth config. Accounts made with the Admin SDK (scripts) never pass through it.
 */
import { beforeUserCreated, HttpsError } from "firebase-functions/v2/identity";
import { db } from "./firestore";
import { gateDecision, NOT_INVITED, type InviteStore } from "./inviteGateCore";

export const inviteGate = beforeUserCreated({ region: "europe-west2", timeoutSeconds: 7, memory: "256MiB" }, async (event) => {
  const decision = await gateDecision(db as unknown as InviteStore, event.data?.email ?? null);
  if (decision.allow) return;
  switch (decision.reason) {
    case NOT_INVITED:
      throw new HttpsError("permission-denied", NOT_INVITED);
    case "unavailable":
      throw new HttpsError("unavailable", "We couldn't check your invitation just now. Please try again.");
    default: {
      const unhandled: never = decision.reason;
      throw new HttpsError("internal", `unknown refusal ${String(unhandled)}`);
    }
  }
});
