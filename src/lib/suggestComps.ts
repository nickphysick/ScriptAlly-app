/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * suggestComps — client side of the Pro comp-suggestions callable.
 *
 * Mirrors src/lib/emailImport.ts: europe-west2 binding, a window mock hook for tests/dev, and a
 * typed error the UI's quiet "unavailable" state understands. Response items are re-validated
 * client-side (defence against function version skew) — malformed items drop, never throw.
 * The age caution is DERIVED here from the returned year via the shelf's isOlderComp rule —
 * one derivation for the gold chips on both surfaces.
 */
import { getFunctions, httpsCallable } from "firebase/functions";
import { CompTitle, User, UserPlan } from "../types";
import { isOlderComp } from "./comps";

/** The model may only flag scale cautions from this set; anything else is dropped. */
export const SUGGESTION_CAUTIONS = ["MEGA-BESTSELLER", "FRANCHISE-SCALE"] as const;

export interface CompSuggestion {
  title: string;
  author: string;
  year: number;
  rationale: string;
  cautions: string[];
}

export interface SuggestCompsInput {
  manuscriptTitle: string;
  ageCategory: string;
  genre: string;
  logline: string;
  synopsis?: string;
  /** Current shelf titles — the function excludes these server-side. */
  shelfTitles: string[];
}

export class SuggestCompsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "SuggestCompsError";
    this.code = code;
  }
}

/** The ONE Pro predicate for the Suggestions gate — the same field every Pro feature reads. */
export function isProUser(user: Pick<User, "plan"> | null | undefined): boolean {
  return user?.plan === UserPlan.PRO;
}

/** Validate `{ suggestions: [...] }` from the callable; drop malformed items silently. */
export function validateSuggestionsPayload(data: unknown): CompSuggestion[] {
  const list = (data as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) return [];
  const out: CompSuggestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const title = typeof rec.title === "string" ? rec.title.trim() : "";
    const author = typeof rec.author === "string" ? rec.author.trim() : "";
    const year = typeof rec.year === "number" && Number.isInteger(rec.year) ? rec.year : NaN;
    const rationale = typeof rec.rationale === "string" ? rec.rationale.trim() : "";
    if (!title || !author || !Number.isFinite(year) || year < 1000 || year > 2100) continue;
    const cautions = Array.isArray(rec.cautions)
      ? rec.cautions.filter(
          (c): c is string =>
            typeof c === "string" && (SUGGESTION_CAUTIONS as readonly string[]).includes(c)
        )
      : [];
    out.push({ title, author, year, rationale, cautions });
  }
  return out;
}

/** Scale flags from the model plus the client-derived age flag ("{N} YEARS OLD" past five). */
export function suggestionCautions(s: CompSuggestion, currentYear: number): string[] {
  const flags = [...s.cautions];
  if (isOlderComp(s.year, currentYear)) flags.push(`${currentYear - s.year} YEARS OLD`);
  return flags;
}

/** Rows still showable: not already on the shelf and not dismissed this session (both case-insensitive). */
export function visibleSuggestions(
  suggestions: CompSuggestion[],
  shelfTitles: string[],
  dismissed: string[]
): CompSuggestion[] {
  const shelf = new Set(shelfTitles.map((t) => t.trim().toLowerCase()));
  const gone = new Set(dismissed.map((t) => t.trim().toLowerCase()));
  return suggestions.filter((s) => {
    const key = s.title.trim().toLowerCase();
    return !shelf.has(key) && !gone.has(key);
  });
}

/** An accepted suggestion becomes a shelf comp — empty optionals omitted (Firestore maps reject undefined). */
export function suggestionToComp(s: CompSuggestion): CompTitle {
  return {
    title: s.title,
    source: "suggested",
    ...(s.author ? { author: s.author } : {}),
    ...(s.year ? { year: s.year } : {}),
  };
}

export async function fetchCompSuggestions(input: SuggestCompsInput): Promise<CompSuggestion[]> {
  const mock = (window as { __SA_SUGGEST_COMPS_MOCK?: unknown }).__SA_SUGGEST_COMPS_MOCK;
  if (mock) return validateSuggestionsPayload(mock);
  const fn = httpsCallable(getFunctions(undefined, "europe-west2"), "suggestComps");
  try {
    const res = await fn(input);
    return validateSuggestionsPayload(res.data);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const code = String(err?.code || "").replace(/^functions\//, "") || "unknown";
    throw new SuggestCompsError(code, err?.message || "Couldn't reach suggestions.");
  }
}
