/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * assistFill — client side of the Pro "Find these for me" callable that powers assisted housekeeping
 * fill. Given a rule (reply window / materials / wish list) and a set of agents, it asks the
 * `assistAgentData` Cloud Function to look up each agent's public submission facts and returns found
 * values WITH PROVENANCE (a source string + confidence) — the writer reviews every value before it's
 * saved. The function WRITES NOTHING; accepting a value is a client-side `updateAgent`.
 *
 * Mirrors suggestComps.ts exactly: europe-west2 binding, a window mock hook for dev/preview, a typed
 * error the quiet "unavailable" state understands, and client-side re-validation (drop malformed,
 * never throw). `isProUser` is REUSED from suggestComps — one Pro predicate, never re-defined.
 *
 * ⚠️ The callable is BUILT (functions/src/assistAgentData.ts) but NOT DEPLOYED — a new function can't
 * exist server-side until Nick deploys it (prod is Nick-only), and the ANTHROPIC_API_KEY rotation is
 * unverified. So ASSIST_LIVE defaults OFF: a Pro user's click reaches a graceful "not switched on
 * yet" state, never a fabricated value. Flip ASSIST_LIVE (or set window.__SA_ASSIST_LIVE) once the
 * function is deployed; `__SA_ASSIST_FILL_MOCK` supplies canned results for a dev walk-through.
 */
import { getFunctions, httpsCallable } from "firebase/functions";
import { HkRule } from "./todoHousekeeping";

// Re-export the single Pro predicate so callers import Pro-gating from one obvious place.
export { isProUser } from "./suggestComps";

/** Live discovery stays dark until `assistAgentData` is deployed. Default OFF. */
export const ASSIST_LIVE = false;

/** Effective flag: the window/global override wins (dev/preview), else the compile-time default.
 *  Reads globalThis (not `window`) so it's safe in the node test env too. */
export function assistLive(): boolean {
  const o = (globalThis as { __SA_ASSIST_LIVE?: boolean }).__SA_ASSIST_LIVE;
  return typeof o === "boolean" ? o : ASSIST_LIVE;
}

export type AssistConfidence = "high" | "medium" | "low";

/** One found value for one agent. `value` is a rule-shaped string the drawer parses:
 *  reply window → weeks ("6"); materials → comma list; wish list → free text. `source` is the
 *  provenance shown to the writer ("agency site", a URL, "MSWL"); never save without it. */
export interface AssistFound {
  agentId: string;
  value: string;
  source: string;
  confidence?: AssistConfidence;
}

export interface AssistFillInput {
  rule: HkRule;
  agents: { agentId: string; name: string; agency?: string }[];
}

export class AssistFillError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AssistFillError";
    this.code = code;
  }
}

const CONFIDENCE_VALUES: readonly AssistConfidence[] = ["high", "medium", "low"];

/** Validate `{ found: [...] }` from the callable; drop malformed items silently (version-skew safe). */
export function validateAssistPayload(data: unknown): AssistFound[] {
  const list = (data as { found?: unknown })?.found;
  if (!Array.isArray(list)) return [];
  const out: AssistFound[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const agentId = typeof rec.agentId === "string" ? rec.agentId.trim() : "";
    const value = typeof rec.value === "string" ? rec.value.trim() : "";
    const source = typeof rec.source === "string" ? rec.source.trim() : "";
    // A value with no provenance is unusable — provenance is the whole point of assisted fill.
    if (!agentId || !value || !source) continue;
    const confidence = CONFIDENCE_VALUES.includes(rec.confidence as AssistConfidence)
      ? (rec.confidence as AssistConfidence)
      : undefined;
    out.push({ agentId, value, source, ...(confidence ? { confidence } : {}) });
  }
  return out;
}

export async function fetchAssistedFill(input: AssistFillInput): Promise<AssistFound[]> {
  const mock = (globalThis as { __SA_ASSIST_FILL_MOCK?: unknown }).__SA_ASSIST_FILL_MOCK;
  if (mock) return validateAssistPayload(mock);
  if (!assistLive()) throw new AssistFillError("unavailable", "Assisted fill isn’t switched on yet.");
  const fn = httpsCallable(getFunctions(undefined, "europe-west2"), "assistAgentData");
  try {
    const res = await fn(input);
    return validateAssistPayload(res.data);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const code = String(err?.code || "").replace(/^functions\//, "") || "unknown";
    throw new AssistFillError(code, err?.message || "Couldn’t reach assisted fill.");
  }
}
