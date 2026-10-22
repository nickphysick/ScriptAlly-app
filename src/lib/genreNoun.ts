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
  /* Manuscripts v28 Part D2 — the sub-genres */
  "psychological-thriller": "psychological thrillers",
  "domestic-thriller": "domestic thrillers",
  "legal-thriller": "legal thrillers",
  "political-thriller": "political thrillers",
  "spy-thriller": "spy thrillers",
  "techno-thriller": "techno-thrillers",
  "medical-thriller": "medical thrillers",
  "conspiracy-thriller": "conspiracy thrillers",
  "serial-killer": "serial killer thrillers",
  "police-procedural": "police procedurals",
  noir: "noir",
  "domestic-noir": "domestic noir",
  "historical-crime": "historical crime",
  heist: "heist novels",
  "nordic-noir": "Nordic noir",
  whodunnit: "whodunnits",
  "locked-room": "locked-room mysteries",
  "amateur-sleuth": "amateur sleuth mysteries",
  "cosy-mystery": "cosy mysteries",
  "historical-mystery": "historical mysteries",
  gothic: "gothic fiction",
  "folk-horror": "folk horror",
  supernatural: "supernatural horror",
  "psychological-horror": "psychological horror",
  "haunted-house": "haunted house stories",
  "body-horror": "body horror",
  "urban-fantasy": "urban fantasy",
  "dark-fantasy": "dark fantasy",
  "cosy-fantasy": "cosy fantasy",
  "portal-fantasy": "portal fantasy",
  grimdark: "grimdark",
  "epic-fantasy": "epic fantasy",
  "historical-fantasy": "historical fantasy",
  "fairytale-retelling": "fairytale retellings",
  "myth-retelling": "myth retellings",
  "sword-and-sorcery": "sword and sorcery",
  "space-opera": "space opera",
  cyberpunk: "cyberpunk",
  "climate-fiction": "climate fiction",
  "time-travel": "time-travel stories",
  "hard-sf": "hard science fiction",
  "post-apocalyptic": "post-apocalyptic fiction",
  "first-contact": "first-contact stories",
  "military-sf": "military science fiction",
  romcom: "romantic comedies",
  "historical-romance": "historical romance",
  "contemporary-romance": "contemporary romance",
  "paranormal-romance": "paranormal romance",
  regency: "Regency romance",
  "dark-romance": "dark romance",
  "sports-romance": "sports romance",
  "romantic-suspense": "romantic suspense",
  autofiction: "autofiction",
  "coming-of-age": "coming-of-age stories",
  satire: "satire",
  "campus-novel": "campus novels",
  experimental: "experimental fiction",
  "literary-thriller": "literary thrillers",
  "alternate-history": "alternate history",
  "family-saga": "family sagas",
  "dual-timeline": "dual-timeline novels",
  wartime: "wartime fiction",
  tudor: "Tudor fiction",
  victorian: "Victorian fiction",
  uplit: "up-lit",
  "comic-fiction": "comic fiction",
  "military-fiction": "military fiction",
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
