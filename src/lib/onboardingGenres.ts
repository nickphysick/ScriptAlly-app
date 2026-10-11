/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Onboarding v9 — the bridge between the genre pills (which work in the taxonomy's ids) and what
 * a manuscript stores.
 *
 * ⚠️ SET-UP STORES A GENRE AS ITS LABEL, AS IT ALWAYS HAS. Two conventions live in the app: the
 * taxonomy says "store ids", and the Add-a-manuscript form does; set-up, the Manuscripts page's
 * dialogs and the sidebar's subline (`msMeta`, which prints `genre` as it is) work in labels.
 * Every reader that matches on genre resolves either form (`canonicalIdOf`). So the primary stays
 * readable wherever a manuscript's genre is read today, set-up goes on storing the label: the
 * `PREDEFINED_GENRES` spelling where that list has the genre, else the taxonomy's own label.
 */
import { CANONICAL_GENRES, canonicalIdOf, genreLabel } from "./genres";
import { PREDEFINED_GENRES } from "./manuscripts";

const PREDEFINED_BY_ID = new Map<string, string>();
for (const label of PREDEFINED_GENRES) {
  const id = canonicalIdOf(label);
  if (id && !PREDEFINED_BY_ID.has(id)) PREDEFINED_BY_ID.set(id, label);
}

/** The fixed list the search offers: every genre in the taxonomy. */
export const GENRE_LIST: readonly { id: string; label: string }[] = CANONICAL_GENRES.map((g) => ({ id: g.id, label: g.label }));
/** A pill's words. */
export const pillLabel = (id: string): string => genreLabel(id);
/** What is stored for a genre id. */
export const storedGenre = (id: string): string => PREDEFINED_BY_ID.get(id) ?? genreLabel(id);
/** The id of a stored value, or null when it is not in the list. */
export const genreIdOf = (stored: string | null | undefined): string | null => (stored ? canonicalIdOf(stored) : null);

/** Picked ids → the manuscript's `genre` (the primary) and `subGenres` (the rest, in order). */
export function toStoredGenres(picked: readonly string[]): { genre: string; subGenres: string[] } {
  return { genre: picked.length ? storedGenre(picked[0]) : "", subGenres: picked.slice(1).map(storedGenre) };
}
/** A manuscript's stored genres → picked ids (values not in the list are left out). */
export function fromStoredGenres(genre: string | null | undefined, subGenres: readonly string[] | null | undefined): string[] {
  const out: string[] = [];
  for (const v of [genre, ...(subGenres ?? [])]) {
    const id = genreIdOf(v);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}
