/**
 * sendBetaFeedback — callable Cloud Function (europe-west2, Blaze plan).
 *
 * Backs the beta feedback dock. Conventions mirror the other callables (v2 import, region pinned,
 * lazy admin init, log the real cause and return a generic message).
 *
 * ⚠️ IT STORES WHAT THE PANEL SAYS IT STORES AND NOTHING ELSE. Kind, message, route, viewport, user
 * agent and the caller's uid — the fields are taken one at a time rather than spread from the
 * payload, so a client that starts sending more cannot quietly widen what is kept. The panel prints
 * that list to the writer; this is the end that has to honour it.
 *
 * ⚠️ THE UID COMES FROM THE VERIFIED CONTEXT, NEVER FROM THE BODY. A uid a caller can type is a
 * uid a caller can borrow.
 *
 * NOT DEPLOYED. Deploy with:
 *   firebase deploy --only functions:sendBetaFeedback --project scriptally-dev
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const MAX = { message: 4000, route: 200, viewport: 32, browser: 400, kind: 64, version: 64 };

const KINDS = new Set([
  "Something's broken",
  "Something's confusing",
  "An idea",
  "Something I liked",
]);

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export const sendBetaFeedback = onCall(
  { region: "europe-west2", timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    const data = (request.data ?? {}) as Record<string, unknown>;

    const message = str(data.message, MAX.message);
    const kind = str(data.kind, MAX.kind);

    if (!message) throw new HttpsError("invalid-argument", "Please tell us what happened.");
    if (!KINDS.has(kind)) throw new HttpsError("invalid-argument", "Please choose a kind.");

    try {
      await db.collection("betaFeedback").add({
        kind,
        message,
        route: str(data.route, MAX.route),
        viewport: str(data.viewport, MAX.viewport),
        browser: str(data.browser, MAX.browser),
        appVersion: str(data.appVersion, MAX.version),
        // Verified context only — a uid in the body would be one a caller can borrow.
        ...(request.auth?.uid ? { uid: request.auth.uid } : {}),
        createdAt: FieldValue.serverTimestamp(),
      });
      return { ok: true };
    } catch (e) {
      console.error("sendBetaFeedback: write failed:", e);
      throw new HttpsError("internal", "Something went wrong. Please try again.");
    }
  },
);
