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

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

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

    let msg;
    try {
      msg = await client.messages.create({
        model: "claude-haiku-4-5", // pin to a dated snapshot for prod once chosen
        max_tokens: 8000,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: sheetText }],
      });
    } catch (e) {
      // Log the underlying cause (status, message) — the client only ever sees the generic error.
      console.error("Anthropic mapping call failed:", e);
      throw new HttpsError("unavailable", "Couldn't read the file right now.");
    }

    const text = msg.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    let result;
    try {
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      throw new HttpsError("internal", "The mapping came back malformed. Try again.");
    }
    return result; // SmartImportResult — validated again on the client before commit
  }
);
