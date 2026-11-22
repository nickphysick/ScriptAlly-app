/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 — the edit drawer's pure half.
 *
 * Part C — THE WORD-COUNT HINT SAYS NOTHING UNLESS THE COUNT IS WAY OFF: below 75% of the main genre's range minimum or
 * above 125% of its maximum. Inside that band there is no line at all (no "typical for…"). The range is the genre's own
 * (`wordCountRangeForGenre`, which a sub-genre inherits from its parent), or the generic range for a genre the taxonomy
 * does not know. With no genre, or no count, there is no hint.
 */
import {
  CANONICAL_GENRES, GENERIC_WORD_COUNT_RANGE, canonicalGenreById, canonicalIdOf, genreAndAncestors, genreDisplay, genreLabel, matchKey, wordCountRangeForGenre,
} from "./genres";
import { storedGenre } from "./onboardingGenres";

export const WC_UNDER = 0.75;
export const WC_OVER = 1.25;

export interface WordCountHint { side: "under" | "over"; lead: string; rest: string }

const nums = (range: string): [number, number] | null => {
  const m = range.match(/[\d,]+/g);
  if (!m || m.length < 2) return null;
  const [lo, hi] = m.map((x) => Number(x.replace(/,/g, "")));
  return lo > 0 && hi > 0 ? [lo, hi] : null;
};

/** The hint for a typed count against the stored main genre (a label or an id), or null. */
export function wordCountHint(words: number | null, genre: string | null | undefined): WordCountHint | null {
  const g = (genre ?? "").trim();
  if (!words || words <= 0 || !g) return null;
  const id = canonicalIdOf(g);
  const range = id ? wordCountRangeForGenre(id) : GENERIC_WORD_COUNT_RANGE;
  const r = nums(range);
  if (!r) return null;
  const side = words < r[0] * WC_UNDER ? "under" : words > r[1] * WC_OVER ? "over" : null;
  if (!side) return null;
  return {
    side,
    lead: side === "under" ? "That’s well under" : "That’s well over",
    rest: ` the usual range for ${genreDisplay(g).toLowerCase()} (${range} words). Some agents pass on length alone.`,
  };
}

/* ══ Part D1 — the genre picker's pure half ════════════════════════════════════════════════════ */


/** The also-fits cap. */
export const MAX_ALSO = 3;
/** Popular quick-adds, in order; the first five not already picked are offered. */
export const POPULAR_GENRES = ["crime", "thriller", "literary-fiction", "fantasy", "romance", "historical-fiction", "science-fiction", "mystery", "horror"] as const;

/**
 * A picked genre. `id` is a canonical id, or null for a value the taxonomy does not know (a personal genre, a legacy
 * label, or one typed in this drawer as the writer's own). `label` is what shows; `own` marks a typed-in genre that is
 * registered (db.addPersonalGenre) only when the drawer saves.
 */
export interface PickedGenre { id: string | null; label: string; own?: boolean }

/** A stored value (a label, an id, or a personal id) as a picked genre. */
export function pickedOf(stored: string): PickedGenre {
  const id = canonicalIdOf(stored);
  return id ? { id, label: genreLabel(id) } : { id: null, label: genreDisplay(stored) };
}
/** The manuscript's stored genres, main first, as picked genres (deduplicated by key). */
export function pickedFromStored(genre: string | null | undefined, subGenres: readonly string[] | null | undefined): { main: PickedGenre | null; also: PickedGenre[] } {
  const out: PickedGenre[] = [];
  for (const v of [genre ?? "", ...(subGenres ?? [])]) {
    const t = String(v ?? "").trim();
    if (!t) continue;
    const p = pickedOf(t);
    if (!out.some((o) => pickKey(o) === pickKey(p))) out.push(p);
  }
  return { main: out[0] ?? null, also: out.slice(1, 1 + MAX_ALSO) };
}
export const pickKey = (p: PickedGenre): string => p.id ?? `label:${matchKey(p.label)}`;
/**
 * What is stored for a picked genre — the house convention (onboardingGenres): a canonical genre as its label (the
 * PREDEFINED_GENRES spelling where that list has it), anything else as its label.
 */
export const storedOf = (p: PickedGenre): string => (p.id ? storedGenre(p.id) : p.label);

export interface GenreHit { id: string; label: string; parent: string | null; via: string | null; range: string; score: number }

/**
 * Predictive search: exact label 100, label prefix 80, word prefix 60, alias prefix 50, substring 30; a main genre beats a
 * sub-genre at equal rank (+5). Seven at most. `exclude` are ids already picked.
 *
 * ⚠️ AT EQUAL RANK, A GENRE RELATED TO ONE ALREADY PICKED COMES FIRST, then alphabetical. The prompt's lock wants
 *    "psych" to list Psychological thriller first; the mock (Thriller picked) lists Psychological horror first, because
 *    it breaks the tie alphabetically. Relatedness (sharing a main genre with a pick) satisfies the lock without
 *    favouring one family for everyone.
 */
export function searchGenres(q: string, exclude: readonly string[] = [], max = 7): GenreHit[] {
  const k = matchKey(q);
  if (!k) return [];
  const out: GenreHit[] = [];
  for (const g of CANONICAL_GENRES) {
    if (exclude.includes(g.id)) continue;
    const L = matchKey(g.label);
    let s = -1;
    let via: string | null = null;
    if (L === k) s = 100;
    else if (L.startsWith(k)) s = 80;
    else if (L.split(" ").some((w) => w.startsWith(k))) s = 60;
    else {
      const a = g.aliases.find((x) => matchKey(x).startsWith(k));
      if (a) { s = 50; via = a; }
      else if (L.includes(k)) s = 30;
    }
    if (s < 0) continue;
    out.push({ id: g.id, label: g.label, parent: g.parent ?? null, via, range: wordCountRangeForGenre(g.id), score: s + (g.parent ? 0 : 5) });
  }
  const family = new Set(exclude.flatMap((id) => genreAndAncestors(id)));
  const related = (h: GenreHit) => (genreAndAncestors(h.id).some((x) => family.has(x)) ? 1 : 0);
  return out.sort((a, b) => b.score - a.score || related(b) - related(a) || a.label.localeCompare(b.label)).slice(0, max);
}
/** True when the text names a genre exactly (its label or an alias) — then no "add your own" row is offered. */
export const isExactGenre = (q: string): boolean => {
  const id = canonicalIdOf(q);
  return !!id && !!canonicalGenreById(id);
};
/** The popular quick-adds not already picked, first five. */
export const popularFor = (picked: readonly string[]): string[] => POPULAR_GENRES.filter((id) => !picked.includes(id)).slice(0, 5);
/** "in Thriller" for a sub-genre. */
export const parentLabel = (id: string | null): string | null => {
  const p = id ? canonicalGenreById(id)?.parent : undefined;
  return p ? genreLabel(p) : null;
};
