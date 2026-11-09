/**
 * addFeedbackNote and markFeedbackSeen — callable Cloud Functions (europe-west2, v2), Your notes v1 Part B.
 *
 * Back the Your notes page's reply box and its "seen" mark. Conventions mirror `sendBetaFeedback` (region pinned, the
 * one Firestore handle, log the real cause and return a generic message). The rules — whose note it is, what is written,
 * the email after the write — live in `feedbackNotesCore`, where they are tested with stubs.
 *
 * ⚠️ NO CLIENT WRITES TO `betaFeedback` OR ANYTHING UNDER IT: these two are the writer's only way in, and each touches
 *    only its named fields on the caller's own note.
 *
 * Deployed to DEV. Prod is Nick's. Deploy with:
 *   firebase deploy --only functions:addFeedbackNote,functions:markFeedbackSeen --project scriptally-dev
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { db } from "./firestore";
import { RESEND_API_KEY, sendEmail } from "./email";
import { FEEDBACK_COLLECTION, FeedbackError } from "./betaFeedbackCore";
import { handleAddNote, handleMarkSeen, type NoteDoc, type NoteTxn } from "./feedbackNotesCore";

const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

/** one transaction: reads first, then the queued writes */
function txn<T>(fn: (t: NoteTxn) => Promise<T>): Promise<T> {
  return db.runTransaction(async (tx) => {
    const note = (id: string) => db.collection(FEEDBACK_COLLECTION).doc(id);
    return fn({
      get: async (id) => { const s = await tx.get(note(id)); return s.exists ? (s.data() as NoteDoc) : null; },
      write: (id, w) => {
        tx.create(note(id).collection("thread").doc(), { from: w.thread.from, text: w.thread.text, at: FieldValue.serverTimestamp() });
        if (w.reopen) {
          tx.update(note(id), {
            status: FieldValue.delete(),
            reopenedAt: FieldValue.serverTimestamp(),
            /* serverTimestamp cannot sit inside an array, so the log's time is the function's own clock */
            statusLog: FieldValue.arrayUnion({ status: w.reopen.logEntry.status, at: Timestamp.now() }),
          });
        }
      },
      markSeen: (id) => { tx.update(note(id), { writerSeenAt: FieldValue.serverTimestamp() }); },
    });
  });
}

const authOf = (request: { auth?: { uid: string; token: unknown } }) => {
  const token = request.auth?.token as { email?: string } | undefined;
  return request.auth ? { uid: request.auth.uid, email: token?.email } : null;
};

const fail = (name: string, e: unknown): never => {
  if (e instanceof FeedbackError) throw new HttpsError(e.code, e.message);
  console.error(`${name}: failed:`, e);
  throw new HttpsError("internal", "Something went wrong. Please try again.");
};

export const addFeedbackNote = onCall(
  { region: "europe-west2", timeoutSeconds: 30, memory: "256MiB", secrets: [RESEND_API_KEY] },
  async (request) => {
    try {
      const out = await handleAddNote((request.data ?? {}) as Record<string, unknown>, authOf(request), {
        txn,
        send: (to, rendered, overrides) => sendEmail(to, "feedback", rendered, process.env, overrides),
        env: process.env,
        log: (msg, e) => console.error(msg, e ?? ""),
      });
      return { ok: true, reopened: out.reopened };
    } catch (e) { return fail("addFeedbackNote", e); }
  },
);

export const markFeedbackSeen = onCall(
  { region: "europe-west2", timeoutSeconds: 15, memory: "256MiB" },
  async (request) => {
    try { return await handleMarkSeen((request.data ?? {}) as Record<string, unknown>, authOf(request), { txn }); }
    catch (e) { return fail("markFeedbackSeen", e); }
  },
);
