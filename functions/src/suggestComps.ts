/**
 * suggestComps — callable Cloud Function (europe-west2, Blaze plan, Pro-gated).
 *
 * Takes a manuscript's pitch facts + the current comp shelf and asks Claude for 4–6 real,
 * recent comparable titles. It WRITES NOTHING to Firestore — accepting a suggestion onto the
 * shelf is a client-side manuscript update.
 *
 * The Anthropic API key lives ONLY here (Functions secret ANTHROPIC_API_KEY), never in the
 * browser. Mirrors the extractFromEmail setup, including the server-side Pro check — client
 * gating alone is not a gate on a paid API.
 *
 * Rate limiting beyond auth + the Pro gate is deliberately deferred (documented in the build
 * report).
 *
 * Setup (one-off, run by Nick — same secret as Smart Import / email import):
 *   firebase functions:secrets:set ANTHROPIC_API_KEY     # already set if Smart Import is live
 *   cd functions && npm install && npm run build
 *   firebase deploy --only functions:suggestComps
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { suggestFromModel, MalformedSuggestionsError, SuggestInput } from "./suggestCompsCore";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

/* Master switch, mirroring extractFromEmail — must never ship ungated. */
const SUGGESTIONS_REQUIRE_PRO = true;
const PRO_PLAN = "Pro"; // mirrors UserPlan.PRO

/* Input caps — keep the model payload small and reject junk. */
const MAX_TITLE_CHARS = 512;
const MAX_FIELD_CHARS = 256;
const MAX_LOGLINE_CHARS = 2_048;
const MAX_SYNOPSIS_CHARS = 20_000;
const MAX_SHELF_TITLES = 24;

export const suggestComps = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: "europe-west2", timeoutSeconds: 60, memory: "512MiB" },
  async (req) => {
    // 1. Auth
    if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in.");
    const uid = req.auth.uid;

    // 2. Validate input
    const manuscriptTitle = String(req.data?.manuscriptTitle ?? "").trim();
    const ageCategory = String(req.data?.ageCategory ?? "").trim();
    const genre = String(req.data?.genre ?? "").trim();
    const logline = String(req.data?.logline ?? "").trim();
    const synopsisRaw = req.data?.synopsis;
    const synopsis = typeof synopsisRaw === "string" ? synopsisRaw.trim() : "";
    const shelfRaw = req.data?.shelfTitles;

    if (!manuscriptTitle) throw new HttpsError("invalid-argument", "Missing manuscript title.");
    if (!ageCategory) throw new HttpsError("invalid-argument", "Missing age category.");
    if (!genre) throw new HttpsError("invalid-argument", "Missing genre.");
    if (manuscriptTitle.length > MAX_TITLE_CHARS) throw new HttpsError("invalid-argument", "Title too long.");
    if (ageCategory.length > MAX_FIELD_CHARS || genre.length > MAX_FIELD_CHARS) {
      throw new HttpsError("invalid-argument", "Field too long.");
    }
    if (logline.length > MAX_LOGLINE_CHARS) throw new HttpsError("invalid-argument", "Logline too long.");
    if (synopsis.length > MAX_SYNOPSIS_CHARS) throw new HttpsError("invalid-argument", "Synopsis too long.");
    if (shelfRaw !== undefined && !Array.isArray(shelfRaw)) {
      throw new HttpsError("invalid-argument", "shelfTitles must be a list.");
    }
    const shelfTitles: string[] = (Array.isArray(shelfRaw) ? shelfRaw : [])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, MAX_SHELF_TITLES)
      .map((t) => t.slice(0, MAX_TITLE_CHARS));

    // 3. Plan gate (server-side, not just the UI)
    const userSnap = await db.doc(`users/${uid}`).get();
    const plan = userSnap.get("plan");
    if (SUGGESTIONS_REQUIRE_PRO && plan !== PRO_PLAN) {
      throw new HttpsError("permission-denied", "Comp suggestions are a Pro feature.");
    }

    // 4. Call Claude + parse/validate (inside suggestFromModel)
    const input: SuggestInput = {
      manuscriptTitle,
      ageCategory,
      genre,
      logline,
      ...(synopsis ? { synopsis } : {}),
      shelfTitles,
    };
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    try {
      const suggestions = await suggestFromModel(client, input);
      return { suggestions };
    } catch (e: unknown) {
      if (e instanceof MalformedSuggestionsError) {
        console.error("suggestComps: malformed model output:", e.message);
        throw new HttpsError("internal", "Suggestions came back scrambled. Try again.");
      }
      console.error("suggestComps: Anthropic call failed:", e);
      throw new HttpsError("unavailable", "Suggestions aren't available right now.");
    }
  }
);
