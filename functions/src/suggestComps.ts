/**
 * suggestComps — callable Cloud Function (europe-west2, Blaze, Pro-gated).
 *
 * Takes ONE argument — `{ manuscriptId }` — and reads everything else server-side. Asks Claude for
 * candidate comps with web search, then checks each against a real catalogue and returns only what
 * the catalogue confirms. It WRITES NOTHING to the user's data: accepting a suggestion is a
 * client-side manuscript update.
 *
 * ⚠️ THE CLIENT NO LONGER SENDS THE MANUSCRIPT'S FACTS, and that is a security change rather than
 * tidying. It used to pass `manuscriptTitle`, `genre`, `ageCategory`, `logline` and `shelfTitles`,
 * so a caller could describe any manuscript they liked — including one they do not own — and spend
 * a Pro run against it. Reading the document server-side means the ownership check and the prompt
 * inputs come from the same place, and the id is the only thing the caller controls.
 *
 * The Anthropic API key lives ONLY here (Functions secret ANTHROPIC_API_KEY), never in the browser.
 *
 * ⚠️ NOT DEPLOYED, AND THREE THINGS GATE IT: the ANTHROPIC_API_KEY rotation must be confirmed
 * (flagged in CLAUDE.md and never closed out), the SDK pin wants a bump (see the report), and the
 * Blaze/API-key gate. Nick deploys; this file never does.
 *
 * Setup (one-off, Nick):
 *   firebase functions:secrets:set ANTHROPIC_API_KEY
 *   cd functions && npm install && npm run build
 *   firebase deploy --only functions:suggestComps --project <named target>
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { db } from "./firestore";
import Anthropic from "@anthropic-ai/sdk";
import {
  MalformedSuggestionsError,
  ScoutRefusedError,
  SuggestInput,
  proposeCandidates,
  verifyCandidates,
} from "./suggestCompsCore";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

/* Master switch — must never ship ungated. */
const SUGGESTIONS_REQUIRE_PRO = true;
const PRO_PLAN = "Pro"; // mirrors UserPlan.PRO

/** Runs per user per calendar day (UTC). A cap the writer cannot reach in ordinary use. */
const RUNS_PER_DAY = 10;

const MAX_ID_CHARS = 128;
const MAX_SHELF_TITLES = 24;
const MAX_TITLE_CHARS = 512;

/**
 * ⚠️ ADMIN WRITES BYPASS SECURITY RULES, which is why this collection needs no rules block and is
 * invisible to the client. A limit the browser could read would tell a caller exactly how many runs
 * they had left; a limit the browser could WRITE would not be a limit.
 *
 * ⚠️ AND IT IS A TRANSACTION, not a read-then-write. Two runs fired together would otherwise both
 * read the same count and both pass.
 */
async function claimRun(uid: string, today: string): Promise<boolean> {
  const ref = db.doc(`scoutRateLimits/${uid}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const sameDay = snap.exists && snap.get("day") === today;
    const used = sameDay ? Number(snap.get("count") ?? 0) : 0;
    if (used >= RUNS_PER_DAY) return false;
    tx.set(ref, { day: today, count: used + 1 }, { merge: true });
    return true;
  });
}

export const suggestComps = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: "europe-west2", timeoutSeconds: 300, memory: "512MiB" },
  async (req) => {
    // 1. Auth
    if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in.");
    const uid = req.auth.uid;

    // 2. The only client-supplied value
    const manuscriptId = String(req.data?.manuscriptId ?? "").trim();
    if (!manuscriptId) throw new HttpsError("invalid-argument", "Missing manuscript.");
    if (manuscriptId.length > MAX_ID_CHARS || manuscriptId.includes("/")) {
      throw new HttpsError("invalid-argument", "Bad manuscript id.");
    }

    // 3. Plan gate — server-side, because client gating is not a gate on a paid API
    const userSnap = await db.doc(`users/${uid}`).get();
    if (SUGGESTIONS_REQUIRE_PRO && userSnap.get("plan") !== PRO_PLAN) {
      throw new HttpsError("permission-denied", "The Scout is a Pro feature.");
    }

    /* 4. The manuscript, read under the caller's own uid — a path that cannot address
          someone else's document, so ownership is structural rather than checked. */
    const msSnap = await db.doc(`users/${uid}/manuscripts/${manuscriptId}`).get();
    if (!msSnap.exists) throw new HttpsError("not-found", "Manuscript not found.");

    const manuscriptTitle = String(msSnap.get("title") ?? "").trim();
    const genre = String(msSnap.get("genre") ?? "").trim();
    const ageCategory = String(msSnap.get("ageCategory") ?? "").trim();
    const logline = String(msSnap.get("logline") ?? "").trim();
    if (!manuscriptTitle || !genre || !ageCategory) {
      throw new HttpsError("failed-precondition", "This manuscript needs a title, genre and age category first.");
    }

    /* the comps array is the shelf; titles only, which is all the prompt needs */
    const compsRaw = msSnap.get("comps");
    const shelfTitles: string[] = (Array.isArray(compsRaw) ? compsRaw : [])
      .map((c) => (c && typeof c === "object" ? (c as { title?: unknown }).title : undefined))
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, MAX_SHELF_TITLES)
      .map((t) => t.slice(0, MAX_TITLE_CHARS));

    // 5. Rate limit — claimed BEFORE the model call, so a failed run still costs its slot
    const today = new Date().toISOString().slice(0, 10);
    if (!(await claimRun(uid, today))) {
      throw new HttpsError(
        "resource-exhausted",
        `The Scout has been out ${RUNS_PER_DAY} times today. It can go again tomorrow.`
      );
    }

    // 6. Propose, then verify
    const input: SuggestInput = { manuscriptTitle, ageCategory, genre, logline, shelfTitles };
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    try {
      const candidates = await proposeCandidates(client, input);
      const suggestions = await verifyCandidates(fetch, candidates, () => new Date());
      /* runAt is the SERVER's clock — the strip states when the Scout went out, not when the
         reader's device thinks it did. */
      return { runAt: new Date().toISOString(), suggestions };
    } catch (e: unknown) {
      if (e instanceof ScoutRefusedError) {
        console.error("suggestComps: declined");
        throw new HttpsError("invalid-argument", "The Scout couldn't work with this manuscript's details.");
      }
      if (e instanceof MalformedSuggestionsError) {
        console.error("suggestComps: malformed model output:", e.message);
        throw new HttpsError("internal", "The Scout's results came back scrambled. Try again.");
      }
      console.error("suggestComps: call failed:", e);
      throw new HttpsError("unavailable", "The Scout isn't available right now.");
    }
  }
);
