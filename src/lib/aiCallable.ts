/**
 * aiCallable — the one door to the four paid AI callables.
 *
 * Each of `smartImportMap`, `extractFromEmail`, `assistAgentData` and `suggestComps` sets
 * `enforceAppCheck: true` (AI spend guard v1, Phase 3), so a request without an App Check token is
 * refused before the function runs. This awaits App Check's (lazy, shared) initialisation first, so
 * the Functions SDK attaches the token itself. If App Check cannot initialise — no site key in this
 * build, a blocked reCAPTCHA script — the call still goes out, and the server refuses it.
 *
 * Locked: no other file builds a callable for these four names (aiCallable.test.ts).
 */
import { getFunctions, httpsCallable, type HttpsCallableOptions } from "firebase/functions";
import { ensureAppCheck } from "../marketing/appCheck";

export type AiCallableName = "smartImportMap" | "extractFromEmail" | "assistAgentData" | "suggestComps";

export async function aiCallable<Req = unknown, Res = unknown>(name: AiCallableName, options?: HttpsCallableOptions) {
  await ensureAppCheck();
  return httpsCallable<Req, Res>(getFunctions(undefined, "europe-west2"), name, options);
}
