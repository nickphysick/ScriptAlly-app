/**
 * sendBetaFeedback — callable Cloud Function (europe-west2, Blaze plan).
 *
 * Backs the feedback panel (Help system v1, Part E). Conventions mirror the other callables (v2, region pinned, the one
 * Firestore handle, log the real cause and return a generic message). The rules — what is kept, where the uid and the
 * email come from, the screenshot's owner, the write before the email — live in `betaFeedbackCore`, where they are
 * tested with stubs.
 *
 * ⚠️ IT EMAILS EACH ONE to `FEEDBACK_TO` (default feedback@queryhawk.net) through the one `sendEmail`, from
 *    `FEEDBACK_FROM` (default "QueryHawk feedback <feedback@queryhawk.net>"), with the writer's verified address as
 *    Reply-To only when they asked for a reply. An email that fails is recorded on the document and never fails the call.
 *
 * Deployed to DEV (Help system v1). Prod is Nick's. Deploy with:
 *   firebase deploy --only functions:sendBetaFeedback --project scriptally-dev
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { db } from "./firestore";
import { RESEND_API_KEY, sendEmail } from "./email";
import { FEEDBACK_COLLECTION, FeedbackError, handleFeedback } from "./betaFeedbackCore";

const FieldValue = admin.firestore.FieldValue;

export const sendBetaFeedback = onCall(
  { region: "europe-west2", timeoutSeconds: 30, memory: "256MiB", secrets: [RESEND_API_KEY] },
  async (request) => {
    const data = (request.data ?? {}) as Record<string, unknown>;
    const token = request.auth?.token as { email?: string; email_verified?: boolean } | undefined;
    try {
      const out = await handleFeedback(data, request.auth ? { uid: request.auth.uid, email: token?.email, emailVerified: token?.email_verified } : null, {
        write: async (record) => {
          const ref = await db.collection(FEEDBACK_COLLECTION).add({ ...record, createdAt: FieldValue.serverTimestamp() });
          return ref.id;
        },
        mark: async (id, patch) => { await db.collection(FEEDBACK_COLLECTION).doc(id).update(patch); },
        send: (to, rendered, overrides) => sendEmail(to, "feedback", rendered, process.env, overrides),
        env: process.env,
        projectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "",
        log: (msg, e) => console.error(msg, e ?? ""),
      });
      return { ok: true, emailed: out.emailed };
    } catch (e) {
      if (e instanceof FeedbackError) throw new HttpsError(e.code, e.message);
      console.error("sendBetaFeedback: write failed:", e);
      throw new HttpsError("internal", "Something went wrong. Please try again.");
    }
  },
);
