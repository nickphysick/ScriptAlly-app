/**
 * Smart Import mapping — callable Cloud Function (europe-west2, Blaze plan required).
 *
 * The Anthropic API key lives ONLY here (Functions secret ANTHROPIC_API_KEY), never in the
 * browser. The model proposes a SmartImportResult; nothing is written to Firestore until the
 * user confirms on the review screen, and all writes happen client-side in deterministic code.
 *
 * Setup (one-off, run by Nick):
 *   firebase functions:secrets:set ANTHROPIC_API_KEY
 *   cd functions && npm install && npm run build
 *   firebase deploy --only functions
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { db } from "./firestore";
import Anthropic from "@anthropic-ai/sdk";
// The request itself — model, prompt, temperature, ceiling, parse-and-repair, the one strict retry —
// lives in the pure core so the evaluation harness makes exactly this call (functions/eval/). The
// MODEL is still the single constant shared with the email-import path (emailImportCore.MODEL).
import { mapSheet } from "./smartImportCore";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// Admin SDK — bypasses Firestore rules, so usage is written here and NEVER by the client (the gate
// is tamper-proof: a user editing client state can't grant themselves another import). The handle
// and the one initializeApp() now live in ./firestore, which also names the database explicitly —
// this function calls admin.firestore() nowhere, and neither may any other (locked).

// Pro source of truth — the SAME field extractFromEmail reads: User.plan === "Pro" (UserPlan.PRO).
const PRO_PLAN = "Pro";

/** Current UTC calendar month as "YYYY-MM". */
function utcMonth(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** First day (UTC) of the month AFTER the given "YYYY-MM", as ISO "YYYY-MM-DD" — the next-available
 *  date a Pro user can import again. Date.UTC's month arg is 0-based, so passing the 1-based month
 *  number lands on the first of the following month. */
function firstOfNextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}

export const smartImportMap = onCall(
  // 90s is only a safety margin for an occasional large import — the slimmed output should return in
  // low single-digit seconds. If the normal path ever needs more than this, something else is wrong.
  { secrets: [ANTHROPIC_API_KEY], region: "europe-west2", timeoutSeconds: 90, memory: "512MiB" },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in.");
    const uid = req.auth.uid;

    const sheetText = (req.data?.sheetText ?? "") as string;
    if (!sheetText.trim()) throw new HttpsError("invalid-argument", "No file content.");
    if (sheetText.length > 200_000) throw new HttpsError("invalid-argument", "File too large.");
    if (sheetText.split("\n").length > 600)
      throw new HttpsError("invalid-argument", "Too many rows — split the file or use the Import desk.");

    // ── Entitlement gate (server-enforced, before the costly AI call) ─────────────────────────────
    // Free: 1 lifetime. Pro: 1 per UTC calendar month. The Pro allowance is independent of the
    // free-once, so a free user who has spent their import and upgrades can import immediately.
    // Plan is read from the user doc; usage lives in the ADMIN-ONLY subdoc users/{uid}/private/
    // entitlement (the client can't write OR delete it, and it survives a user-doc delete-recreate —
    // tamper-proof). A blocked attempt throws a structured HttpsError the client branches on.
    const userSnap = await db.doc(`users/${uid}`).get();
    const isPro = userSnap.get("plan") === PRO_PLAN;

    const entRef = db.doc(`users/${uid}/private/entitlement`);
    const entSnap = await entRef.get();
    const month = utcMonth();

    if (isPro) {
      if (entSnap.get("smartImportLastUsedMonth") === month) {
        throw new HttpsError("resource-exhausted", "This month's Smart Import has been used.", {
          reason: "pro_month_used",
          nextAvailable: firstOfNextMonth(month),
        });
      }
    } else if (entSnap.get("smartImportFreeUsed") === true) {
      throw new HttpsError("resource-exhausted", "Your free Smart Import has been used.", {
        reason: "free_used",
      });
    }

    // Consume the entitlement on a genuinely usable AI result — at the costly step, never at commit
    // (the client has already confirmed). Admin SDK write to the subdoc, atomic with the success
    // path: a write failure after a paid call is a cost leak we log loudly but never let block the
    // user's result.
    const consume = async () => {
      try {
        await entRef.set(
          isPro ? { smartImportLastUsedMonth: month } : { smartImportFreeUsed: true },
          { merge: true }
        );
      } catch (e) {
        console.error("smartImportMap: consume write failed (import succeeded):", e);
      }
    };

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const outcome = await mapSheet(client, sheetText, {
      log: (m) => console.log(m),
      logError: (m, cause) => (cause === undefined ? console.error(m) : console.error(m, cause)),
    });
    if (outcome.failure === "api") {
      // The underlying cause was logged by mapSheet — the client only ever sees the generic error.
      throw new HttpsError("unavailable", "Couldn't read the file right now.");
    }
    if (outcome.failure) {
      // badjson (likely truncated — not retried) or still unusable after the one strict retry.
      throw new HttpsError("internal", "The mapping came back malformed. Try again.");
    }
    await consume();
    return outcome.result; // structured shape — re-validated on the client
  }
);
