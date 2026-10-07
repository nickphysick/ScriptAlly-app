/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE GENRE MATCH — which of an agent's genres is the one you are actually querying for.
 *
 * ⚠️ IT IS THE MANUSCRIPT'S PRIMARY GENRE, READ AT THE POINT OF USE, NEVER STORED ON THE AGENT.
 * An agent's genres are a fact about them; the match is a fact about the relationship between
 * them and the book on your desk, and it changes the moment you switch manuscripts. Storing it
 * would be a denormalisation that goes stale on a keystroke somewhere else entirely.
 *
 * ⚠️ THE TINT SHIPS ON, BEHIND ONE NAMED CONSTANT (baked decision 2). `GENRE_MATCH_TINT` is the
 * single switch: false and every chip renders plain, on this page and on the board's column
 * heads together. A flag scattered across three call sites is not a flag, it is three flags that
 * will eventually disagree — which is the whole reason this is a constant and not a prop.
 *
 * ⚠️ AND THE COMPARISON IS CASE-INSENSITIVE AND TRIMMED, because the two sides come from
 * different keyboards. A manuscript's genre is typed into the manuscript form and an agent's is
 * picked from a list; "Thriller" and "thriller " are the same answer and a reader who saw one
 * chip fail to tint would learn that the feature is unreliable rather than that a space exists.
 */

import { canonicalIdOf, isPersonalId, matchKey } from "./genres";

/** The one switch. Flip to false and no chip, row or column head tints anywhere. */
export const GENRE_MATCH_TINT = true;

const norm = (s: string | undefined | null): string => (s ?? "").trim().toLowerCase();

/**
 * The genre to tint, or null when there is nothing to compare against — no manuscript in scope,
 * or a manuscript with no genre recorded. Null is a real answer: it means "no claim", and every
 * caller renders plain rather than guessing.
 */
export const matchGenre = (manuscriptGenre: string | undefined | null): string | null => {
  const g = norm(manuscriptGenre);
  return GENRE_MATCH_TINT && g ? g : null;
};

/** Does this agent genre match? Both sides normalised — see the header. */
export const isGenreMatch = (genre: string, match: string | null): boolean =>
  match !== null && norm(genre) === match;

/* ══ Contact list v14 (ruling Q5) — THE BOOK'S GENRES, ONE DEFINITION OF "TAKES THE BOOK" ══════════════════
 * A manuscript has a main `genre` and optional `subGenres`; an agent TAKES THE BOOK when their genres
 * include the main genre or ANY of the subGenres. The strip's "Fit your book", the next-step section, the
 * workspace's pills, "See all" and the tick on a row's genre chips all read `takesBook` / `bookGenreHit`,
 * so no two of them can disagree. Genres compare by canonical id where one resolves (`canonicalIdOf`),
 * otherwise by `matchKey` — never by raw string. `GENRE_MATCH_TINT` still switches every claim off. */

/** a genre's comparison key: its canonical id, or its match key (a personal id compares by its slug) */
export function genreKey(raw: string): string {
  const id = canonicalIdOf(raw);
  if (id) return id;
  const s = String(raw ?? "").trim();
  return matchKey(isPersonalId(s) ? s.slice(s.lastIndexOf(":") + 1).replace(/-/g, " ") : s);
}

/** The book's genres, main first, deduplicated by key; [] when there is no book, no genre, or the switch is off. */
export function bookGenres(ms: { genre?: string | null; subGenres?: readonly string[] | null } | null | undefined): string[] {
  if (!GENRE_MATCH_TINT || !ms) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const g of [ms.genre ?? "", ...(ms.subGenres ?? [])]) {
    const t = String(g ?? "").trim();
    const k = t ? genreKey(t) : "";
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** A chip-tick test over the book's genres: does this one agent genre match any of them? */
export function bookGenreHit(book: readonly string[]): (genre: string) => boolean {
  const keys = new Set(book.map(genreKey));
  return (g) => keys.size > 0 && keys.has(genreKey(g));
}

/** Does the agent take the book — any of their genres matching the main genre or any subGenre. */
export function takesBook(agentGenres: readonly string[] | null | undefined, book: readonly string[]): boolean {
  if (book.length === 0) return false;
  const hit = bookGenreHit(book);
  return (agentGenres ?? []).some(hit);
}

/** Does the agent take the book's MAIN genre (the Ready list puts these first when the book has subGenres). */
export function takesMain(agentGenres: readonly string[] | null | undefined, book: readonly string[]): boolean {
  return book.length > 0 && takesBook(agentGenres, [book[0]]);
}
