/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * suggestComps — client side of the Pro comp-suggestions callable that powers "The Scout".
 *
 * Mirrors src/lib/emailImport.ts: europe-west2 binding, a window mock hook for tests/dev, and a
 * typed error the UI's quiet "unavailable" state understands. Response items are re-validated
 * client-side (defence against function version skew) — malformed items drop, never throw.
 *
 * The callable itself (the LLM web-search + catalogue verification) is NOT built yet — it lands in a
 * later prompt behind the Blaze/API-key/deploy gate. Until then the Scout sits behind SCOUT_LIVE
 * (default OFF): the UI shows a graceful "not yet available" state and never fabricates a result.
 * `__SA_SCOUT_LIVE` (window) force-enables the live path for dev/preview; `__SA_SUGGEST_COMPS_MOCK`
 * supplies canned results without a function.
 */
import { getFunctions, httpsCallable } from "firebase/functions";
import { CompMedia, CompTitle, User, UserPlan } from "../types";

/**
 * Feature flag — the Scout's live discovery stays dark until the suggestComps function is deployed.
 * Flip to true (or set window.__SA_SCOUT_LIVE) once the callable exists. Default OFF.
 */
export const SCOUT_LIVE = false;

/** Effective flag: the window/global override wins (dev/preview), else the compile-time default.
 *  Reads globalThis (not `window`) so it's safe in the node test env too. */
export function scoutLive(): boolean {
  const o = (globalThis as { __SA_SCOUT_LIVE?: boolean }).__SA_SCOUT_LIVE;
  return typeof o === "boolean" ? o : SCOUT_LIVE;
}

const MEDIA_VALUES: readonly CompMedia[] = ["book", "film", "tv", "other"];

export interface CompSuggestionLinks {
  bookshop?: string;
  googleBooks?: string;
}

/** One Scout result. `verified` gates the "Verified · catalogue" badge; `agentMatch` gates the
 *  agent-bridge hook (rendered only when present — the matching logic is a later prompt). */
export interface CompSuggestion {
  title: string;
  author: string;
  publisher?: string;
  year: number;
  media: CompMedia;
  matchAxis?: string;
  /** "Why this fits" — the model's one-liner. */
  why: string;
  /** True only when the title was checked against a real catalogue. */
  verified: boolean;
  links?: CompSuggestionLinks;
  /** How many of the writer's agents wishlist books like this — omitted when unknown. */
  agentMatch?: number;
}

export interface SuggestCompsInput {
  manuscriptId: string;
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

/** The ONE Pro predicate for the Scout gate — the same field every Pro feature reads. */
export function isProUser(user: Pick<User, "plan"> | null | undefined): boolean {
  return user?.plan === UserPlan.PRO;
}

function optString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
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
    const why = typeof rec.why === "string" ? rec.why.trim() : "";
    if (!title || !author || !why || !Number.isFinite(year) || year < 1000 || year > 2100) continue;
    const media = MEDIA_VALUES.includes(rec.media as CompMedia) ? (rec.media as CompMedia) : "book";
    const linksRaw = rec.links as Record<string, unknown> | undefined;
    const bookshop = optString(linksRaw?.bookshop);
    const googleBooks = optString(linksRaw?.googleBooks);
    const links = bookshop || googleBooks ? { ...(bookshop ? { bookshop } : {}), ...(googleBooks ? { googleBooks } : {}) } : undefined;
    const agentMatch =
      typeof rec.agentMatch === "number" && Number.isInteger(rec.agentMatch) && rec.agentMatch > 0
        ? rec.agentMatch
        : undefined;
    out.push({
      title,
      author,
      year,
      media,
      why,
      verified: rec.verified === true,
      ...(optString(rec.publisher) ? { publisher: optString(rec.publisher) } : {}),
      ...(optString(rec.matchAxis) ? { matchAxis: optString(rec.matchAxis) } : {}),
      ...(links ? { links } : {}),
      ...(agentMatch != null ? { agentMatch } : {}),
    });
  }
  return out;
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

/** An accepted suggestion becomes a shelf comp, UNTICKED — empty optionals omitted (Firestore maps
 *  reject undefined); `media` omitted when "book" (the additive default); the writer decides inQuery. */
export function suggestionToComp(s: CompSuggestion): CompTitle {
  return {
    title: s.title,
    source: "suggested",
    author: s.author,
    year: s.year,
    ...(s.publisher ? { publisher: s.publisher } : {}),
    ...(s.matchAxis ? { matchAxis: s.matchAxis } : {}),
    ...(s.media && s.media !== "book" ? { media: s.media } : {}),
  };
}

export async function fetchCompSuggestions(input: SuggestCompsInput): Promise<CompSuggestion[]> {
  const mock = (globalThis as { __SA_SUGGEST_COMPS_MOCK?: unknown }).__SA_SUGGEST_COMPS_MOCK;
  if (mock) return validateSuggestionsPayload(mock);
  const fn = httpsCallable(getFunctions(undefined, "europe-west2"), "suggestComps");
  try {
    const res = await fn(input);
    return validateSuggestionsPayload(res.data);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const code = String(err?.code || "").replace(/^functions\//, "") || "unknown";
    throw new SuggestCompsError(code, err?.message || "Couldn't reach the Scout.");
  }
}
