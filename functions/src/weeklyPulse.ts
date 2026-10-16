/**
 * sendWeeklyPulse — callable Cloud Function (europe-west2, Blaze plan).
 *
 * Backs the founding writer panel's four faces on the Dashboard (v59): one answer per writer per ISO
 * week, changeable within the week. Conventions mirror `sendBetaFeedback` (v2 import, region pinned,
 * lazy admin, the real cause logged and a generic message returned).
 *
 * ⚠️ IT STORES `uid`, `week`, `mood` AND THE TWO TIMES, AND NOTHING ELSE. The fields are taken one at
 * a time (`validatePulse`), never spread from the payload.
 *
 * ⚠️ THE UID COMES FROM THE VERIFIED CONTEXT, NEVER FROM THE BODY. A uid a caller can type is a uid a
 * caller can borrow.
 *
 * ⚠️ IT SETS `betaPulse/{uid}_{week}`, SO A CHANGE OVERWRITES. `createdAt` is written only when the
 * document is new.
 *
 * NOT DEPLOYED. Deploy with:
 *   firebase deploy --only functions:sendWeeklyPulse --project scriptally-dev
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { db } from "./firestore";
import { validatePulse } from "./weeklyPulseCore";

const FieldValue = admin.firestore.FieldValue;

export const sendWeeklyPulse = onCall(
  { region: "europe-west2", timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Please sign in.");
    const v = validatePulse(request.data, new Date());
    if (!v.ok) throw new HttpsError("invalid-argument", v.reason);
    const { mood, week } = v.value;
    try {
      const ref = db.collection("betaPulse").doc(`${uid}_${week}`);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        tx.set(ref, {
          uid, week, mood,
          updatedAt: FieldValue.serverTimestamp(),
          ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        }, { merge: true });
      });
      return { ok: true };
    } catch (e) {
      console.error("sendWeeklyPulse: write failed:", e);
      throw new HttpsError("internal", "Something went wrong. Please try again.");
    }
  },
);
