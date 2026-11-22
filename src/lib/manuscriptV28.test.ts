/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 — the pure halves of MSV28.
 */
import { describe, it, expect } from "vitest";
import { wordCountHint } from "./manuscriptV28";

describe("C1 — the word-count hint is silent unless the count is way off", () => {
  /* thriller is 70,000 – 90,000: under below 52,500, over above 112,500 */
  it.each([[80_000, null], [55_000, null], [52_500, null], [112_500, null], [50_000, "under"], [115_000, "over"]] as const)("%i words → %s", (w, side) => {
    expect(wordCountHint(w, "Thriller")?.side ?? null).toBe(side);
  });
  it("the words are the prompt's", () => {
    const h = wordCountHint(50_000, "thriller")!;
    expect(h.lead + h.rest).toBe("That’s well under the usual range for thriller (70,000 – 90,000 words). Some agents pass on length alone.");
    expect(wordCountHint(115_000, "Thriller")!.lead).toBe("That’s well over");
  });
  it("no count, no genre: no hint", () => {
    expect(wordCountHint(null, "Thriller")).toBeNull();
    expect(wordCountHint(10, "")).toBeNull();
  });
});

import { isExactGenre, pickedFromStored, popularFor, searchGenres, storedOf } from "./manuscriptV28";

describe("D1 — the genre search and the stored form", () => {
  it("ranks exact, then prefix, then word prefix, then alias, then substring; seven at most", () => {
    expect(searchGenres("thriller")[0].id).toBe("thriller");
    expect(searchGenres("fan")[0].id).toBe("fantasy");
    const lit = searchGenres("litfic");
    expect(lit[0].id).toBe("literary-fiction");
    expect(lit[0].via).toBe("litfic");
    expect(searchGenres("e").length).toBeLessThanOrEqual(7);
    expect(searchGenres("thriller", ["thriller"]).some((h) => h.id === "thriller")).toBe(false);
  });
  it("an exact label or alias offers no own-genre row; anything else does", () => {
    expect(isExactGenre("Thriller")).toBe(true);
    expect(isExactGenre("litfic")).toBe(true);
    expect(isExactGenre("northern gothic")).toBe(false);
  });
  it("popular: the first five not already picked", () => {
    expect(popularFor([])).toEqual(["crime", "thriller", "literary-fiction", "fantasy", "romance"]);
    expect(popularFor(["crime", "thriller"])).toEqual(["literary-fiction", "fantasy", "romance", "historical-fiction", "science-fiction"]);
  });
  it("reads stored labels or ids and writes the house label form", () => {
    const g = pickedFromStored("Thriller", ["crime", "Northern gothic"]);
    expect(g.main).toEqual({ id: "thriller", label: "Thriller" });
    expect(g.also.map((a) => a.label)).toEqual(["Crime", "Northern gothic"]);
    expect([g.main!, ...g.also].map(storedOf)).toEqual(["Thriller", "Crime", "Northern gothic"]);
  });
});

import { CANONICAL_GENRES, MAIN_GENRES, canonicalIdOf, genreAndAncestors, wordCountRangeForGenre } from "./genres";
import { GENRE_NOUN } from "./genreNoun";
import { bookGenreHit, isGenreMatch, matchGenre, takesBook } from "./genreMatch";
import { calculateCommunityAgentMatch } from "./communityMatch";
import type { CommunityAgent, Manuscript } from "../types";

describe("D4 — the sub-genre list", () => {
  const subs = CANONICAL_GENRES.filter((g) => g.parent);
  it("67 sub-genres; every parent is a canonical MAIN genre; ids unique; every id has a noun", () => {
    expect(subs.length).toBe(67);
    const mains = new Set(MAIN_GENRES.map((g) => g.id));
    for (const g of subs) expect(mains.has(g.parent!), `${g.id} → ${g.parent}`).toBe(true);
    const ids = CANONICAL_GENRES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(GENRE_NOUN[id], id).toBeTruthy();
  });
  it("a sub-genre inherits its parent's range, and counts as its parent", () => {
    expect(wordCountRangeForGenre("psychological-thriller")).toBe(wordCountRangeForGenre("thriller"));
    expect(genreAndAncestors("psychological-thriller")).toEqual(["psychological-thriller", "thriller"]);
    expect(genreAndAncestors("thriller")).toEqual(["thriller"]);
  });
  it("the moved aliases resolve to their sub-genres", () => {
    for (const [alias, id] of [["epic fantasy", "epic-fantasy"], ["noir", "noir"], ["gothic horror", "gothic"], ["gothic", "gothic"], ["rom-com", "romcom"], ["romantic comedy", "romcom"], ["whodunit", "whodunnit"], ["cozy mystery", "cosy-mystery"], ["psychological thriller", "psychological-thriller"], ["domestic thriller", "domestic-thriller"]]) {
      expect(canonicalIdOf(alias), alias).toBe(id);
    }
  });
});

describe("D3 — a sub-genre matches an agent who lists its parent", () => {
  const book = ["Psychological thriller"];
  it("genreMatch: takesBook, bookGenreHit and the tint's isGenreMatch", () => {
    expect(takesBook(["Thriller"], book)).toBe(true);
    expect(takesBook(["thriller"], book)).toBe(true);
    expect(bookGenreHit(book)("Thriller")).toBe(true);
    expect(isGenreMatch("Thriller", matchGenre("Psychological thriller"))).toBe(true);
    expect(takesBook(["Romance"], book)).toBe(false);
  });
  it("the Discover score counts the parent as fully as the sub-genre", () => {
    const agent = { id: "a", name: "A", agency: "B", email: "", website: "", genres: ["Thriller"], mswl: "" } as unknown as CommunityAgent;
    const ms = { id: "m", title: "T", genre: "Psychological thriller", subGenres: [], ageCategory: "Adult", wordCount: 80000, logline: "", comps: [] } as unknown as Manuscript;
    expect(calculateCommunityAgentMatch(agent, ms).genreScore).toBe(20);
  });
});

describe("D1 with the sub-genres", () => {
  it("'psych' lists Psychological thriller first (Thriller picked), in Thriller, with its range", () => {
    const h = searchGenres("psych", ["thriller"]);
    expect(h[0].id).toBe("psychological-thriller");
    expect(h[0].parent).toBe("thriller");
    expect(h[0].range).toBe("70,000 – 90,000");
    /* with nothing picked the tie is alphabetical, as the mock draws it */
    expect(searchGenres("psych")[0].id).toBe("psychological-horror");
  });
});
