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
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./smartImportPrompt";
// Single source of truth for the AI model — shared with the email-import path (emailImportCore.MODEL,
// a side-effect-free pure-core constant) so file-import and email-import can't drift, and dev and
// prod always run the same model.
import { MODEL } from "./emailImportCore";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

/** Output ceiling — a runaway guard, NOT the speed lever (the slimmed, omit-empty output contract is).
 *  Sized to a realistic large import: the compact output averages ~45–55 tokens per imported row (a
 *  terse agent + query object with empties omitted), so 12k comfortably covers ~220–250 rows. Beyond
 *  that an import could truncate — surfaced as "malformed" and NOT retried (a second big call won't
 *  help); that's the signal to raise this. Sonnet 4.6 allows far more headroom if ever needed. */
const MAX_OUTPUT_TOKENS = 12000;

/** Concatenate the text blocks of an Anthropic message into one string. */
function extractText(msg: { content: any[] }): string {
  return msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text ?? "").join("");
}

type ParseOutcome =
  | { ok: true; value: any }
  | { ok: false; kind: "nonjson" } // no JSON object at all (prose/refusal) — worth one stricter retry
  | { ok: false; kind: "badjson" }; // an object IS present but won't parse (truncated/malformed) — no retry

/** In-process repair + parse: strip code fences and any prose either side by taking from the first "{"
 *  to the last "}", then JSON.parse. Distinguishes a genuinely non-JSON reply (no object structure —
 *  prose/refusal, worth a stricter retry) from a JSON-shaped-but-unparseable reply (truncated/malformed
 *  — a second large call won't help, so we don't make one). */
function parseReply(text: string): ParseOutcome {
  const s = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last <= first) return { ok: false, kind: "nonjson" };
  try { return { ok: true, value: JSON.parse(s.slice(first, last + 1)) }; }
  catch { return { ok: false, kind: "badjson" }; }
}

export const smartImportMap = onCall(
  // 90s is only a safety margin for an occasional large import — the slimmed output should return in
  // low single-digit seconds. If the normal path ever needs more than this, something else is wrong.
  { secrets: [ANTHROPIC_API_KEY], region: "europe-west2", timeoutSeconds: 90, memory: "512MiB" },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in.");

    const sheetText = (req.data?.sheetText ?? "") as string;
    if (!sheetText.trim()) throw new HttpsError("invalid-argument", "No file content.");
    if (sheetText.length > 200_000) throw new HttpsError("invalid-argument", "File too large.");
    if (sheetText.split("\n").length > 600)
      throw new HttpsError("invalid-argument", "Too many rows — split the file or use the Import desk.");

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    // One mapping call. `strict` appends a terse JSON-only reminder, used only on the retry.
    const callModel = (strict: boolean) =>
      client.messages.create({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0,
        system: strict
          ? SYSTEM_PROMPT + "\n\nReturn ONLY the JSON object — no prose, no explanation, no code fences."
          : SYSTEM_PROMPT,
        messages: [{ role: "user", content: sheetText }],
      });

    // Bracket the call with timing so the speed-up is visible and a future timeout can't be silent
    // (you'd see "started" with no "mapped …ms"). Duration only — never the payload, user data or key.
    const startedMs = Date.now();
    console.log("smartImportMap: mapping call started");

    let msg;
    try {
      msg = await callModel(false);
    } catch (e) {
      // Log the underlying cause (status, message) — the client only ever sees the generic error.
      console.error("Anthropic mapping call failed:", e);
      throw new HttpsError("unavailable", "Couldn't read the file right now.");
    }

    // Repair-and-parse the reply in-process (handles chatty wrappers with no second call).
    const first = parseReply(extractText(msg));
    if (first.ok) {
      console.log(`smartImportMap: mapped in ${Date.now() - startedMs}ms`);
      return first.value; // SmartImportResult — re-validated on the client
    }
    if (first.kind === "badjson") {
      // A JSON object was present but wouldn't parse — almost always truncation at the token ceiling.
      // A second full call won't fix that (raise MAX_OUTPUT_TOKENS instead), so fail fast, no retry.
      console.error(`smartImportMap: reply JSON-shaped but unparseable (likely truncated) after ${Date.now() - startedMs}ms`);
      throw new HttpsError("internal", "The mapping came back malformed. Try again.");
    }

    // first.kind === "nonjson": the reply had no JSON object (prose/refusal) — ONE stricter retry.
    let retryMsg;
    try {
      retryMsg = await callModel(true);
    } catch (e) {
      console.error("Anthropic mapping retry call failed:", e);
      throw new HttpsError("unavailable", "Couldn't read the file right now.");
    }
    const second = parseReply(extractText(retryMsg));
    if (second.ok) {
      console.log(`smartImportMap: mapped on retry in ${Date.now() - startedMs}ms`);
      return second.value; // SmartImportResult — re-validated on the client
    }
    // Still unusable. Log cause + duration only (no payload / user data / key), then surface the error.
    console.error(`smartImportMap: mapping unusable after retry (${second.kind}) after ${Date.now() - startedMs}ms`);
    throw new HttpsError("internal", "The mapping came back malformed. Try again.");
  }
);
