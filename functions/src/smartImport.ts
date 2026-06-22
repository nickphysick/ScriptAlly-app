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

/** Cap on the mapping output. Sonnet 4.6 allows far more; 16k is a generous truncation guard for the
 *  largest realistic pipeline (one agent + one query object per row, plus per-row flags). */
const MAX_OUTPUT_TOKENS = 16000;

/** Concatenate the text blocks of an Anthropic message into one string. */
function extractText(msg: { content: any[] }): string {
  return msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text ?? "").join("");
}

/** Best-effort repair before parsing: drop markdown code fences and any prose either side of the
 *  object by taking from the first "{" to the last "}", then JSON.parse. Throws if still unparseable. */
function repairAndParse(text: string): any {
  let s = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s);
}

export const smartImportMap = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: "europe-west2", timeoutSeconds: 60, memory: "512MiB" },
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

    let msg;
    try {
      msg = await callModel(false);
    } catch (e) {
      // Log the underlying cause (status, message) — the client only ever sees the generic error.
      console.error("Anthropic mapping call failed:", e);
      throw new HttpsError("unavailable", "Couldn't read the file right now.");
    }

    // Layered recovery so one stumble isn't a hard 500: repair-and-parse the reply; on a parse
    // failure make ONE stricter retry; only if THAT also fails to parse do we surface the malformed
    // error. At most one retry — never a loop. (An Anthropic transport error stays the 'unavailable'
    // path, kept distinct from this 'malformed output' path.)
    try {
      return repairAndParse(extractText(msg)); // SmartImportResult — re-validated on the client
    } catch {
      let retryMsg;
      try {
        retryMsg = await callModel(true);
      } catch (e) {
        console.error("Anthropic mapping retry call failed:", e);
        throw new HttpsError("unavailable", "Couldn't read the file right now.");
      }
      const retryText = extractText(retryMsg);
      try {
        return repairAndParse(retryText); // SmartImportResult — re-validated on the client
      } catch (e) {
        // Privacy-conscious: log the cause, reply length, and a short head/tail snippet only — the
        // full reply contains the user's agent names, so never log the whole payload.
        const head = retryText.slice(0, 200);
        const tail = retryText.length > 400 ? retryText.slice(-200) : "";
        console.error(
          `smartImportMap: mapping unparseable after retry: ${(e as Error).message} | len=${retryText.length} | head=${JSON.stringify(head)}${tail ? ` | tail=${JSON.stringify(tail)}` : ""}`
        );
        throw new HttpsError("internal", "The mapping came back malformed. Try again.");
      }
    }
  }
);
