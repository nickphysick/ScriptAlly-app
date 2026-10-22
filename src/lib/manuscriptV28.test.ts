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
