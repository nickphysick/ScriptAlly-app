/**
 * sendContactMessage — callable Cloud Function (europe-west2, Blaze plan).
 *
 * Backs the public contact form at /contact. A callable rather than the `onRequest` the waitlist
 * uses, because this caller IS the app and already carries the Firebase SDK; conventions otherwise
 * mirror the other functions (v2 import, region pinned, lazy admin init, log the real cause and
 * return a generic message).
 *
 * ⚠️ IT ACCEPTS UNAUTHENTICATED CALLERS, DELIBERATELY. /contact is public and has to be: a person
 * locked out of their account, or asking for it to be deleted, cannot sign in to ask. That is
 * exactly why the abuse defences below are not optional.
 *
 * ⚠️ NOTHING IT WRITES IS CLIENT-READABLE. `contactMessages` is denied to every client in
 * firestore.rules except the admin UID, and this function writes through the Admin SDK, which
 * bypasses rules entirely. A message is between the sender and the desk.
 *
 * ⚠️ THE HONEYPOT REPORTS SUCCESS AND WRITES NOTHING. Telling a bot it was caught teaches it to
 * try again without the field.
 *
 * NOT DEPLOYED (13 Nov). Deploy with:
 *   firebase deploy --only functions:sendContactMessage --project scriptally-dev
 * The client already calls it first (src/lib/contactTransport.ts `sendContact`) and offers the
 * writer's mail app whenever the call fails — so until it is deployed every send falls back.
 *
 * ⚠️ THE CORE IS `handleContactMessage`, WITH THE DELIVERY INJECTED. The callable below is a thin
 * wrapper; `contactMessage.emulator.spec.ts` drives the core against the Firestore emulator with
 * `deliver` stubbed, so the honeypot, the checks and the rate limit are proved without a write to
 * the desk. The default `deliver` is the `contactMessages` write, unchanged.
 *
 * Follow-up, NOT built here: App Check on this endpoint. The rate limit below is per-sender and
 * server-side, but a determined caller can still rotate addresses.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { db } from "./firestore";
import { createHash } from "crypto";

const FieldValue = admin.firestore.FieldValue;

const MAX = { name: 120, email: 254, message: 4000, topic: 64 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The five the form offers (contact redesign v1, 12 Nov). Anything else is rejected rather than stored as free text.
 * ⚠️ `functions/` cannot import `src/`, so this is a COPY of `CONTACT_TOPICS` in
 * src/marketing/contactCopy.ts — and `contactCopy.test.ts` reads this file and fails if the two
 * differ. Without that, a topic added to the form alone would be refused here with "Please choose
 * a topic" the day the form started sending through this function.
 */
const TOPICS = new Set([
  "A question or an idea",
  "Something's broken",
  "Founding writer access",
  "Your data",
  "Something else",
]);

/** Server-side floor, independent of whatever the browser believes about its own last send. */
const MIN_INTERVAL_MS = 30_000;

const senderRef = (hash: string) => db.doc(`contactSenders/${hash}`);

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** One accepted message, as the desk receives it. `uid` only when the sender was signed in. */
export interface ContactRecord {
  name: string;
  email: string;
  topic: string;
  message: string;
  uid?: string;
}

/** The real delivery: the message lands in `contactMessages`, read by the admin UID alone. */
export const storeContactMessage = async (m: ContactRecord): Promise<void> => {
  await db.collection("contactMessages").add({
    name: m.name,
    email: m.email,
    topic: m.topic,
    message: m.message,
    // Present when the sender happened to be signed in; absent otherwise, never faked.
    ...(m.uid ? { uid: m.uid } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });
};

export interface ContactDeps {
  /** The clock the rate limit reads. */
  now?: () => number;
  /** Where an accepted message goes. Default `storeContactMessage`. */
  deliver?: (m: ContactRecord) => Promise<void>;
}

/**
 * The whole of `sendContactMessage`, minus the transport: the honeypot, the checks, the per-address
 * rate limit, then one delivery. Throws the same `HttpsError`s the callable always has.
 */
export async function handleContactMessage(
  raw: unknown,
  uid: string | undefined,
  deps: ContactDeps = {},
): Promise<{ ok: true }> {
  const now = (deps.now ?? Date.now)();
  const deliver = deps.deliver ?? storeContactMessage;
  const data = (raw ?? {}) as Record<string, unknown>;

  /* The honeypot, first: a filled hidden field means nothing else about this call is worth
     reading. Success is reported and nothing is written. */
  if (str(data.website, 200).length > 0) return { ok: true };

  const email = str(data.email, MAX.email).toLowerCase();
  const message = str(data.message, MAX.message);
  const name = str(data.name, MAX.name);
  const topic = str(data.topic, MAX.topic);

  if (!email || !EMAIL_RE.test(email)) {
    throw new HttpsError("invalid-argument", "Please enter a valid email address.");
  }
  if (!message) {
    throw new HttpsError("invalid-argument", "Please include a message.");
  }
  if (!TOPICS.has(topic)) {
    throw new HttpsError("invalid-argument", "Please choose a topic.");
  }

  /* Rate limit keyed on the address rather than on the caller, because the caller is usually
     anonymous. Hashed so the throttle collection is not a mailing list. */
  const hash = createHash("sha256").update(email).digest("hex");

  try {
    const allowed = await db.runTransaction(async (tx) => {
      const ref = senderRef(hash);
      const snap = await tx.get(ref);
      const last = snap.exists ? (snap.get("lastSentMs") as number) ?? 0 : 0;
      if (last && now - last < MIN_INTERVAL_MS) return false;
      tx.set(ref, { lastSentMs: now }, { merge: true });
      return true;
    });

    if (!allowed) {
      throw new HttpsError("resource-exhausted", "That's already on its way — give it a moment.");
    }

    await deliver({ name, email, topic, message, ...(uid ? { uid } : {}) });

    return { ok: true };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    // Log the real cause; never leak internals to the caller.
    console.error("sendContactMessage: write failed:", e);
    throw new HttpsError("internal", "Something went wrong. Please try again.");
  }
}

export const sendContactMessage = onCall(
  { region: "europe-west2", timeoutSeconds: 30, memory: "256MiB" },
  async (request) => handleContactMessage(request.data, request.auth?.uid),
);
