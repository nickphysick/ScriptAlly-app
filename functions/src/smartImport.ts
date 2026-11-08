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
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firestore";
import Anthropic from "@anthropic-ai/sdk";
// The request itself — model, prompt, temperature, ceiling, parse-and-repair, the one strict retry —
// lives in the pure core so the evaluation harness makes exactly this call (functions/eval/). The
// MODEL is still the single constant shared with the email-import path (emailImportCore.MODEL).
import { mapSheet, mapPages, pickImportInput, streamHooks, MAX_SHEET_CHARS, MAX_SHEET_LINES } from "./smartImportCore";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// Admin SDK — bypasses Firestore rules, so usage is written here and NEVER by the client (the gate
// is tamper-proof: a user editing client state can't grant themselves another import). The handle
// and the one initializeApp() now live in ./firestore, which also names the database explicitly —
// this function calls admin.firestore() nowhere, and neither may any other (locked).

// Pro source of truth — the SAME field extractFromEmail reads: User.plan === "Pro" (UserPlan.PRO).
const PRO_PLAN = "Pro";

/**
 * How long a claim (`smartImportPending`) holds before it is treated as abandoned. Longer than the
 * function's 300s timeout, so a live read is never mistaken for a dead one; short enough that a
 * crashed instance — whose `finally` never ran — locks nobody out for long.
 */
export const PENDING_CLAIM_MS = 6 * 60 * 1000;

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
  // 300s, measured rather than guessed (reports/smart-import-quickfixes/): a 150-row sheet took 88–104s
  // and a 50-row messy one 43s, so the old 90s failed real files. The client's callable timeout is set
  // just above this (src/lib/smartImport.ts, 310s) so the writer sees the server's error, not the
  // browser's; the reading screen's loader ceiling is just above that again (315s).
  { secrets: [ANTHROPIC_API_KEY], region: "europe-west2", timeoutSeconds: 300, memory: "512MiB" },
  async (req, response) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in.");
    const uid = req.auth.uid;

    // ── What to read: a sheet's text, OR photos of a list (smart-import-photos-v1), never both ──────
    // Checked before anything is read from Firestore, so a malformed request never touches the
    // entitlement. A photo request's pages are validated in full here (count, type, base64, size).
    const input = pickImportInput(req.data);
    if (input.kind === "error") throw new HttpsError("invalid-argument", input.message);
    const pages = input.kind === "pages" ? input.pages : null;
    const sheetText = input.kind === "sheet" ? input.sheetText : "";
    if (!pages) {
      if (!sheetText.trim()) throw new HttpsError("invalid-argument", "No file content.");
      if (sheetText.length > MAX_SHEET_CHARS) throw new HttpsError("invalid-argument", "File too large.");
      if (sheetText.split("\n").length > MAX_SHEET_LINES)
        throw new HttpsError("invalid-argument", "Too many rows — split the file or use the Import desk.");
    }

    // ── Entitlement gate (server-enforced, before the costly AI call) ─────────────────────────────
    // Free: 1 lifetime. Pro: 1 per UTC calendar month. The Pro allowance is independent of the
    // free-once, so a free user who has spent their import and upgrades can import immediately.
    // Plan is read from the user doc; usage lives in the ADMIN-ONLY subdoc users/{uid}/private/
    // entitlement (the client can't write OR delete it, and it survives a user-doc delete-recreate —
    // tamper-proof). A blocked attempt throws a structured HttpsError the client branches on.
    const userSnap = await db.doc(`users/${uid}`).get();
    const isPro = userSnap.get("plan") === PRO_PLAN;

    const entRef = db.doc(`users/${uid}/private/entitlement`);
    const month = utcMonth();

    /* ⚠️ CLAIM, THEN CALL — IN ONE TRANSACTION, BEFORE THE MODEL IS REACHED. The old shape read the
       entitlement, called the model, and only then wrote the used flag, so five calls fired together
       all read "unused" and all reached the paid call. The transaction re-reads the entitlement and
       writes `smartImportPending`; any call that finds a live claim is refused as `in_progress`.
       The allowance itself is still spent only on a usable result (below), so a failed import does
       not use up the writer's one free read. */
    const blocked = await db.runTransaction(async (tx) => {
      const snap = await tx.get(entRef);
      if (isPro) {
        if (snap.get("smartImportLastUsedMonth") === month) return "pro_month_used" as const;
      } else if (snap.get("smartImportFreeUsed") === true) {
        return "free_used" as const;
      }
      const pending = snap.get("smartImportPending");
      if (typeof pending?.toMillis === "function" && Date.now() - pending.toMillis() < PENDING_CLAIM_MS) {
        return "in_progress" as const;
      }
      tx.set(entRef, { smartImportPending: FieldValue.serverTimestamp() }, { merge: true });
      return null;
    });
    if (blocked === "pro_month_used") {
      throw new HttpsError("resource-exhausted", "This month's Smart Import has been used.", {
        reason: "pro_month_used",
        nextAvailable: firstOfNextMonth(month),
      });
    }
    if (blocked === "free_used") {
      throw new HttpsError("resource-exhausted", "Your free Smart Import has been used.", {
        reason: "free_used",
      });
    }
    if (blocked === "in_progress") {
      throw new HttpsError("resource-exhausted", "Your import is already being read.", {
        reason: "in_progress",
      });
    }

    /* From here the claim is held. Exactly one of two writes releases it: the consume on a usable
       result (used flag set, claim deleted, one write), or the `finally` on anything else — an api
       error, bad JSON, an unusable mapping, a throw. A write failure after a paid call is logged
       loudly but never blocks the writer's result. */
    let consumed = false;
    // Consume the allowance on a genuinely usable AI result — at the costly step, never at commit
    // (the client has already confirmed) — and release the claim in the same write.
    const consume = async () => {
      try {
        await entRef.set(
          {
            ...(isPro ? { smartImportLastUsedMonth: month } : { smartImportFreeUsed: true }),
            smartImportPending: FieldValue.delete(),
          },
          { merge: true }
        );
        consumed = true;
      } catch (e) {
        console.error("smartImportMap: consume write failed (import succeeded):", e);
      }
    };
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

      // Progress travels beside the answer, never instead of it: when the browser streams, the row
      // count goes out as the reply is read; when it does not, streamHooks adds nothing at all.
      const hooks = {
        log: (m: string) => console.log(m),
        logError: (m: string, cause?: unknown) => (cause === undefined ? console.error(m) : console.error(m, cause)),
        ...streamHooks(req.acceptsStreaming, (chunk) => response?.sendChunk(chunk)),
      };
      // One gate, one consume, one stream for both inputs: only the request differs.
      const outcome = pages ? await mapPages(client, pages, hooks) : await mapSheet(client, sheetText, hooks);
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
    } finally {
      if (!consumed) {
        try {
          await entRef.set({ smartImportPending: FieldValue.delete() }, { merge: true });
        } catch (e) {
          console.error("smartImportMap: could not release the claim (it expires on its own):", e);
        }
      }
    }
  }
);
