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
 * LIVE (P5 re-issue, 16 Jul — Nick's pack asserts Blaze + the API key are in place, superseding the
 * earlier hold): ASSIST_LIVE defaults ON and Pro clicks call the real `assistAgentData` callable.
 * The function code ships in functions/src/assistAgentData.ts but ITS DEPLOY IS NICK'S
 * (`firebase deploy --only functions:assistAgentData`) — until it lands, calls fail fast into the
 * graceful "couldn't reach" state (the manual path is never blocked). A hang can't block either:
 * the call races a timeout. `window.__SA_ASSIST_LIVE = false` force-disables;
 * `__SA_ASSIST_FILL_MOCK` supplies canned results for a dev walk-through.
 */
import { getFunctions, httpsCallable } from "firebase/functions";
import { Agent } from "../types";
import { HkRule } from "./todoHousekeeping";

// Re-export the single Pro predicate so callers import Pro-gating from one obvious place.
export { isProUser } from "./suggestComps";

/** Live by default (see header). The window override wins in both directions. */
export const ASSIST_LIVE = true;

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

/** Default look-up deadline — partial results are fine, a hang is not (never blocks the manual path). */
export const ASSIST_TIMEOUT_MS = 25_000;

/** Race a promise against a deadline; on expiry throw the typed error the UI's quiet state understands. */
export async function raceTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AssistFillError("deadline-exceeded", "Assisted fill took too long — enter the rest manually.")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Attach provenance to an agent patch — ONLY when a found value is being saved (the caller checks
 * the draft still equals the found value; an edited value is the writer's, not the look-up's).
 * Merges into the agent's existing fieldSources map so other fields' provenance survives.
 */
export function withProvenance(
  patch: Partial<Agent>,
  field: string,
  found: AssistFound | undefined,
  existingSources: Agent["fieldSources"],
  nowIso: string,
): Partial<Agent> {
  if (!found) return patch;
  return { ...patch, fieldSources: { ...(existingSources ?? {}), [field]: { source: found.source, foundAt: nowIso } } };
}

export async function fetchAssistedFill(input: AssistFillInput, opts?: { timeoutMs?: number }): Promise<AssistFound[]> {
  const mock = (globalThis as { __SA_ASSIST_FILL_MOCK?: unknown }).__SA_ASSIST_FILL_MOCK;
  if (mock) return validateAssistPayload(mock);
  if (!assistLive()) throw new AssistFillError("unavailable", "Assisted fill isn’t switched on right now.");
  const fn = httpsCallable(getFunctions(undefined, "europe-west2"), "assistAgentData");
  try {
    const res = await raceTimeout(fn(input), opts?.timeoutMs ?? ASSIST_TIMEOUT_MS);
    return validateAssistPayload(res.data);
  } catch (e: unknown) {
    if (e instanceof AssistFillError) throw e; // the timeout, already typed
    const err = e as { code?: string; message?: string };
    const code = String(err?.code || "").replace(/^functions\//, "") || "unknown";
    throw new AssistFillError(code, err?.message || "Couldn’t reach assisted fill.");
  }
}
