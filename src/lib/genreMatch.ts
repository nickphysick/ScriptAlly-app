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
