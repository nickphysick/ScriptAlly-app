/**
 * waitlist — HTTP Cloud Function (europe-west2, Blaze plan).
 *
 * Backs the founding-writer signup form on the prod holding page (holding/index.html),
 * reached same-origin via the Firebase Hosting rewrite  /api/waitlist → this function
 * (see firebase.holding.json). The static page only does plain fetch() — no Firebase SDK,
 * no exposed config, no CORS. This function writes via the Admin SDK, which bypasses
 * Firestore rules (the waitlist/ and counters/ paths are explicitly denied to all clients).
 *
 * Unlike the repo's other functions (smartImportMap / extractFromEmail) this is an HTTP
 * `onRequest`, not a callable `onCall` — required because the holding page has no SDK and
 * must hit it over a same-origin rewrite. Conventions otherwise mirror those functions
 * (v2 import, europe-west2 pinning, lazy admin init, log-internals/return-generic errors).
 *
 *   GET            → { count, cap }
 *   POST { email } → { ok, position, count, cap, alreadyJoined? }
 *
 * Setup (one-off, run by Nick):
 *   cd functions && npm install && npm run build
 *   firebase deploy --only functions:waitlist -P prod
 *
 * Follow-up (NOT built here — recommended next defence): App Check + rate-limiting to harden
 * this public endpoint against abuse/inflation.
 */
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { createHash } from "crypto";

if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const DEFAULT_CAP = 100;
const MAX_EMAIL_CHARS = 254; // RFC 5321 practical maximum
// Pragmatic single-line email check — server-side gate, not a deliverability guarantee.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const counterRef = () => db.doc("counters/waitlist");
const signupRef = (hash: string) => db.doc(`waitlist/${hash}`);

/** Deterministic doc id from a normalised email, so the same address can't double-insert. */
function emailHash(normalisedEmail: string): string {
  return createHash("sha256").update(normalisedEmail).digest("hex");
}

export const waitlist = onRequest(
  { region: "europe-west2", timeoutSeconds: 30, memory: "256MiB" },
  async (req, res) => {
    try {
      if (req.method === "GET") {
        const snap = await counterRef().get();
        const count = snap.exists ? (snap.get("count") as number) ?? 0 : 0;
        const cap = snap.exists ? (snap.get("cap") as number) ?? DEFAULT_CAP : DEFAULT_CAP;
        res.status(200).json({ count, cap });
        return;
      }

      if (req.method === "POST") {
        // onRequest auto-parses JSON bodies; tolerate a raw string body too.
        let body: any = req.body;
        if (typeof body === "string") {
          try { body = JSON.parse(body); } catch { body = {}; }
        }
        const raw = body?.email;
        const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

        if (!email || email.length > MAX_EMAIL_CHARS || !EMAIL_RE.test(email)) {
          res.status(400).json({ ok: false, error: "Please enter a valid email address." });
          return;
        }

        const hash = emailHash(email);

        const result = await db.runTransaction(async (tx) => {
          // All reads before any writes (Firestore transaction rule).
          const cRef = counterRef();
          const sRef = signupRef(hash);
          const [cSnap, sSnap] = await Promise.all([tx.get(cRef), tx.get(sRef)]);

          const cap = cSnap.exists ? (cSnap.get("cap") as number) ?? DEFAULT_CAP : DEFAULT_CAP;
          const count = cSnap.exists ? (cSnap.get("count") as number) ?? 0 : 0;

          if (sSnap.exists) {
            const position = (sSnap.get("position") as number) ?? count;
            return { alreadyJoined: true, position, count, cap };
          }

          const position = count + 1;
          tx.set(sRef, {
            email,
            createdAt: FieldValue.serverTimestamp(),
            source: "holding-page",
            position,
          });
          if (cSnap.exists) {
            tx.update(cRef, { count: FieldValue.increment(1), cap });
          } else {
            // Lazily initialise the counter doc, single source of truth for the cap.
            tx.set(cRef, { count: 1, cap: DEFAULT_CAP });
          }
          return { alreadyJoined: false, position, count: position, cap };
        });

        res.status(200).json({ ok: true, ...result });
        return;
      }

      res.status(405).json({ ok: false, error: "Method not allowed." });
    } catch (e) {
      // Log the real cause; never leak internals to the caller.
      console.error("waitlist: request failed:", e);
      res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
    }
  }
);
