/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * discoverAgents — pure derivations for the Discover new agents page (Agents › Discover).
 *
 * Everything here is CLIENT-SIDE presentation logic layered over the one shared scorer in
 * `communityMatch.ts` — the match maths is consumed, never changed. Lenses re-rank the already-
 * scored candidate set by signals that exist on the record (scorer total, MSWL sub-score,
 * responseTimeWeeks, submissionStatus); a lens is offered only when its backing field is
 * actually populated across the catalogue, so no control is ever inert.
 *
 * Trust rule carried over from the retired suggestions panel: nothing is fabricated. Fit bands
 * keep its /75 cutoffs (Strong ≥62 / Good ≥52 / Possible ≥ MATCH_THRESHOLD); the /100 display
 * score is a pure presentation normalisation of the engine total.
 */
import { CommunityAgent, Manuscript, SubmissionStatus } from "../types";
import {
  calculateCommunityAgentMatch,
  totalScore,
  MATCH_THRESHOLD,
  MatchBreakdown,
} from "./communityMatch";
import { PREDEFINED_GENRES, AGE_CATEGORIES } from "./manuscripts";
import { manuscriptComps } from "./comps";
import { normaliseCountry, isHomeMarket } from "./territory";

/* ── Fit band + display score ─────────────────────────────────────────────── */

export type FitTier = "strong" | "good" | "possible";

/** Band cutoffs on the /75 engine score (Strong ≥62, Good ≥52, else Possible; candidates below
 *  MATCH_THRESHOLD never surface). Inherited from the retired ManuscriptAgentSuggestions panel —
 *  this is now their single home. */
export function fitTier(score: number): FitTier {
  if (score >= 62) return "strong";
  if (score >= 52) return "good";
  return "possible";
}

/** The engine maximum (MSWL 40 + genre 20 + age 15). Display normalisation only. */
export const ENGINE_MAX = 75;

/** Display score out of 100 — presentation only, never fed back into matching. */
export const score100 = (score: number): number =>
  Math.round((Math.max(0, Math.min(score, ENGINE_MAX)) / ENGINE_MAX) * 100);

/* ── Candidate set ────────────────────────────────────────────────────────── */

export interface DiscoverEntry {
  agent: CommunityAgent;
  /** Raw engine total, /75. */
  score: number;
  breakdown: MatchBreakdown;
  tier: FitTier;
}

/** Score the catalogue against a manuscript and keep everything over the shared suggestion
 *  threshold. Unsorted — ordering belongs to the active lens. Closed/held filtering is the
 *  caller's concern (they're user-facing toggles, not part of the candidate definition). */
export function buildDiscoverEntries(
  catalogue: CommunityAgent[],
  manuscript: Manuscript,
): DiscoverEntry[] {
  return (catalogue || [])
    .map((agent) => {
      const breakdown = calculateCommunityAgentMatch(agent, manuscript);
      const score = totalScore(breakdown);
      return { agent, score, breakdown, tier: fitTier(score) };
    })
    .filter((e) => e.score >= MATCH_THRESHOLD);
}

/* ── Lenses ───────────────────────────────────────────────────────────────── */

export type DiscoverLens = "best" | "mswl" | "fast" | "open" | "local";

export const LENS_META: Record<DiscoverLens, { label: string; caption: string }> = {
  best: { label: "Best overall fit", caption: "ranked by overall fit" },
  mswl: { label: "Wish-list match", caption: "ranked by wish-list overlap" },
  fast: { label: "Fast responders", caption: "ranked by reply speed" },
  open: { label: "Open to queries", caption: "open agents first, then fit" },
  local: { label: "Local first", caption: "agents in your home market first" },
};

/** Share of the catalogue with a usable responseTimeWeeks (>0). */
export function responseTimeCoverage(catalogue: CommunityAgent[]): number {
  if (!catalogue || catalogue.length === 0) return 0;
  const populated = catalogue.filter((a) => (a.responseTimeWeeks || 0) > 0).length;
  return populated / catalogue.length;
}

/** Share of the catalogue with a resolvable country (ISO code or tolerated legacy name). */
export function locationCoverage(catalogue: CommunityAgent[]): number {
  if (!catalogue || catalogue.length === 0) return 0;
  const populated = catalogue.filter((a) => Boolean(normaliseCountry(a.country))).length;
  return populated / catalogue.length;
}

/** True when a country value resolves to the UK or Ireland — the "UK & Ireland only" filter's
 *  predicate. Unknown/absent is never local (we don't claim what we can't prove). */
export function isUkIreland(country: string | null | undefined): boolean {
  const code = normaliseCountry(country);
  return code === "GB" || code === "IE";
}

/** Lenses offered for this catalogue. "Fast responders" needs responseTimeWeeks populated on a
 *  solid majority (≥60%) of records, so the ranking is meaningful rather than mostly-arbitrary.
 *  "Local first" needs at least SOME location data (a boolean partition stays honest with partial
 *  coverage — known-local agents float, unknowns rank on fit as before) — with none it's inert,
 *  and inert controls don't ship. */
export function availableLenses(catalogue: CommunityAgent[]): DiscoverLens[] {
  const lenses: DiscoverLens[] = ["best", "mswl"];
  if (responseTimeCoverage(catalogue) >= 0.6) lenses.push("fast");
  lenses.push("open");
  if (locationCoverage(catalogue) > 0) lenses.push("local");
  return lenses;
}

const byName = (a: DiscoverEntry, b: DiscoverEntry) =>
  a.agent.name.localeCompare(b.agent.name);

const isOpen = (a: CommunityAgent) => a.submissionStatus === SubmissionStatus.OPEN;

/** Re-rank the candidate set for a lens. Pure — returns a new array, never mutates. All
 *  comparators fall back to the engine total then name, so ordering is deterministic.
 *  `homeCountry` (getHomeCountry(user)) only matters to the "local" lens. */
export function rankEntries(
  entries: DiscoverEntry[],
  lens: DiscoverLens,
  homeCountry?: string,
): DiscoverEntry[] {
  const sorted = entries.slice();
  switch (lens) {
    case "mswl":
      sorted.sort(
        (a, b) =>
          b.breakdown.mswlScore - a.breakdown.mswlScore || b.score - a.score || byName(a, b),
      );
      break;
    case "fast": {
      // Populated reply times rank ascending; unpopulated (0/absent) sink to the bottom.
      const key = (e: DiscoverEntry) =>
        (e.agent.responseTimeWeeks || 0) > 0 ? e.agent.responseTimeWeeks : Infinity;
      sorted.sort((a, b) => key(a) - key(b) || b.score - a.score || byName(a, b));
      break;
    }
    case "open":
      sorted.sort(
        (a, b) =>
          Number(isOpen(b.agent)) - Number(isOpen(a.agent)) || b.score - a.score || byName(a, b),
      );
      break;
    case "local": {
      // Home-market agents first (strict isHomeMarket — unknown country never counts as local),
      // ranked on fit within each partition. Location NEVER feeds the score itself (engine
      // weighting is the deferred phase).
      const local = (e: DiscoverEntry) => isHomeMarket(e.agent.country, homeCountry);
      sorted.sort(
        (a, b) => Number(local(b)) - Number(local(a)) || b.score - a.score || byName(a, b),
      );
      break;
    }
    case "best":
    default:
      sorted.sort(
        (a, b) =>
          b.score - a.score || b.breakdown.mswlScore - a.breakdown.mswlScore || byName(a, b),
      );
      break;
  }
  return sorted;
}

/* ── Readiness (word count vs genre range + materials presence) ───────────── */

export interface WordRange {
  min: number;
  max: number;
}

/** Parse the display string genreWordCountRange() returns ("90,000 – 120,000") into numbers. */
export function parseWordRange(label: string | null): WordRange | null {
  if (!label) return null;
  const m = label.match(/([\d,]+)\s*–\s*([\d,]+)/);
  if (!m) return null;
  const min = Number(m[1].replace(/,/g, ""));
  const max = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) return null;
  return { min, max };
}

export type WordFit = "in" | "long" | "short";

export interface Readiness {
  /** The genre range label ("90,000 – 120,000"), null when no range applies. */
  rangeLabel: string | null;
  /** How the manuscript's word count sits against the range; null when either side is missing. */
  fit: WordFit | null;
  hasLogline: boolean;
  hasComps: boolean;
}

export function manuscriptReadiness(ms: Manuscript, rangeLabel: string | null): Readiness {
  const range = parseWordRange(rangeLabel);
  const wc = ms.wordCount || 0;
  let fit: WordFit | null = null;
  if (range && wc > 0) {
    fit = wc < range.min ? "short" : wc > range.max ? "long" : "in";
  }
  return {
    rangeLabel: range ? rangeLabel : null,
    fit,
    hasLogline: Boolean((ms.logline || "").trim()),
    // Structured comps (manuscriptComps also parses stray legacy comparableTitles strings).
    hasComps: manuscriptComps(ms).length > 0,
  };
}

/* ── Wish-list highlighting (display-only) ── */

/** Highlight stop-list (DISPLAY ONLY — never affects the match score; the single home now the
 *  suggestions panel is retired). Bare genre/age-category words (already conveyed by the genre
 *  chip) and generic fillers stay unlit so the emphasis lands on distinctive craft/setting/theme
 *  terms. Sourced from the app's own genre vocabulary so it stays in step. */
export const HIGHLIGHT_STOPWORDS = new Set<string>([
  ...PREDEFINED_GENRES.flatMap((g) => g.toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean),
  ...AGE_CATEGORIES.flatMap((a) => a.toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean),
  "fiction", "fictional", "novel", "novels", "story", "stories", "book", "books", "genre", "general",
]);

/** The scorer's overlapping tokens minus the display stop-list, deduped, order preserved. */
export function displayTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of terms || []) {
    const lower = t.toLowerCase();
    if (!lower || HIGHLIGHT_STOPWORDS.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    out.push(t);
  }
  return out;
}

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

/** Split an MSWL excerpt into segments with the matched (display-worthy) terms flagged, for the
 *  caller to style. Case-insensitive; regex metacharacters in terms are escaped. */
export function highlightSegments(notes: string, terms: string[]): HighlightSegment[] {
  if (!notes) return [];
  const shown = displayTerms(terms);
  const escaped = shown.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).filter(Boolean);
  if (escaped.length === 0) return [{ text: notes, hit: false }];
  const termSet = new Set(shown.map((t) => t.toLowerCase()));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  return notes
    .split(re)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, hit: termSet.has(part.toLowerCase()) }));
}

/** The single strongest personalisation hook — the first distinctive matched term (the scorer
 *  pushes overlaps in match order). Null when every overlap is a generic genre word. */
export function topHookTerm(terms: string[]): string | null {
  const shown = displayTerms(terms);
  return shown.length > 0 ? shown[0] : null;
}

/* ── Truthful labels ──────────────────────────────────────────────────────── */

/** Format an ISO date as "Mon YYYY"; null when absent/invalid — a missing date shows nothing,
 *  never a made-up one. */
export function monthYearLabel(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export interface CatalogueMeta {
  count: number;
  /** "Mon YYYY" of the most recent lastCheckedDate across the catalogue; null when none parse. */
  lastCheckedLabel: string | null;
}

/** Derived trust-banner meta — real record dates only. */
export function catalogueMeta(catalogue: CommunityAgent[]): CatalogueMeta {
  let latest = -Infinity;
  for (const a of catalogue || []) {
    const t = a.lastCheckedDate ? new Date(a.lastCheckedDate).getTime() : NaN;
    if (!isNaN(t) && t > latest) latest = t;
  }
  return {
    count: (catalogue || []).length,
    lastCheckedLabel: latest > -Infinity ? monthYearLabel(new Date(latest).toISOString()) : null,
  };
}
