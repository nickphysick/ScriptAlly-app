/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE GENRE NOUN — a genre the way a sentence says it ("takes thrillers or crime"). Contact list v14 §2,
 * the table accepted with the go-ahead (7 Oct).
 *
 * ⚠️ AN EXPLICIT TABLE, NOT A PLURALISER. The rule-based helper it replaces pluralised by spelling, so it
 * gave "contemporaries", "dystopians" and "action & adventures"; and a rule that decides "crime" is a mass
 * noun has to be taught every exception one regex at a time. Each canonical genre names its own noun here.
 * **Never pluralise "crime".** Anything that is not a canonical genre (a personal genre, free text) is said
 * as stored, lower-cased, and never pluralised — a guessed plural is a confident wrong word.
 */
import { canonicalIdOf } from "./genres";

/** canonical id → the noun a sentence uses */
export const GENRE_NOUN: Readonly<Record<string, string>> = {
  "literary-fiction": "literary fiction",
  "commercial-fiction": "commercial fiction",
  "upmarket-fiction": "upmarket fiction",
  "womens-fiction": "women's fiction",
  "historical-fiction": "historical fiction",
  contemporary: "contemporary fiction",
  fantasy: "fantasy",
  "science-fiction": "science fiction",
  "speculative-fiction": "speculative fiction",
  romantasy: "romantasy",
  dystopian: "dystopian fiction",
  "magical-realism": "magical realism",
  horror: "horror",
  romance: "romance",
  thriller: "thrillers",
  mystery: "mysteries",
  crime: "crime",
  "cosy-crime": "cosy crime",
  "action-adventure": "action and adventure",
  "young-adult": "young adult fiction",
  "middle-grade": "middle-grade fiction",
  childrens: "children's books",
  "picture-book": "picture books",
  memoir: "memoirs",
  "non-fiction": "non-fiction",
  "narrative-non-fiction": "narrative non-fiction",
};

/** One genre as a sentence says it: the table's noun, or the stored text lower-cased. */
export function genreNoun(raw: string): string {
  const id = canonicalIdOf(raw);
  if (id && GENRE_NOUN[id]) return GENRE_NOUN[id];
  return String(raw ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** The book's genres joined with "or": "thrillers", "thrillers or crime", "thrillers, crime or mysteries". */
export function joinGenres(genres: readonly string[]): string {
  const nouns = genres.map(genreNoun).filter(Boolean);
  if (nouns.length <= 1) return nouns[0] ?? "";
  return `${nouns.slice(0, -1).join(", ")} or ${nouns[nouns.length - 1]}`;
}
