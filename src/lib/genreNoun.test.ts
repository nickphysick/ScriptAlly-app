/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The genre-noun table (Contact list v14 §2, accepted 7 Oct) and the book-genre helpers (ruling Q5).
 */
import { describe, it, expect } from "vitest";
import { CANONICAL_GENRES } from "./genres";
import { GENRE_NOUN, genreNoun, joinGenres } from "./genreNoun";
import { bookGenreHit, bookGenres, genreKey, takesBook, takesMain } from "./genreMatch";

describe("the genre-noun table", () => {
  it("names a noun for every canonical genre, and nothing else", () => {
    expect(Object.keys(GENRE_NOUN).sort()).toEqual(CANONICAL_GENRES.map((g) => g.id).sort());
  });
  it("never pluralises crime", () => {
    expect(genreNoun("Crime")).toBe("crime");
    expect(genreNoun("crime")).toBe("crime");
    expect(genreNoun("Cosy crime")).toBe("cosy crime");
    expect(genreNoun("noir")).toBe("crime");
  });
  it("says each genre the way a sentence does, from a label, an id or an alias", () => {
    expect(genreNoun("Thriller")).toBe("thrillers");
    expect(genreNoun("thriller")).toBe("thrillers");
    expect(genreNoun("psychological thriller")).toBe("thrillers");
    expect(genreNoun("Mystery")).toBe("mysteries");
    expect(genreNoun("Contemporary")).toBe("contemporary fiction");
    expect(genreNoun("Dystopian")).toBe("dystopian fiction");
    expect(genreNoun("Action & adventure")).toBe("action and adventure");
    expect(genreNoun("Children's")).toBe("children's books");
    expect(genreNoun("science-fiction")).toBe("science fiction");
  });
  it("says a genre it does not know as stored, lower-cased, never pluralised", () => {
    expect(genreNoun("Cli-fi")).toBe("cli-fi");
    expect(genreNoun("  Folk   Horror Revival ")).toBe("folk horror revival");
  });
  it("joins with 'or'", () => {
    expect(joinGenres([])).toBe("");
    expect(joinGenres(["Thriller"])).toBe("thrillers");
    expect(joinGenres(["Thriller", "Crime"])).toBe("thrillers or crime");
    expect(joinGenres(["Thriller", "Crime", "Mystery"])).toBe("thrillers, crime or mysteries");
  });
});

describe("the book's genres (ruling Q5)", () => {
  it("main first, then subGenres, deduplicated by canonical key", () => {
    expect(bookGenres({ genre: "Thriller", subGenres: ["Crime", "thriller", "crime fiction"] })).toEqual(["Thriller", "Crime"]);
    expect(bookGenres({ genre: "", subGenres: ["Crime"] })).toEqual(["Crime"]);
    expect(bookGenres(null)).toEqual([]);
  });
  it("a stored id, its label and its aliases share one key", () => {
    expect(genreKey("science-fiction")).toBe(genreKey("Science fiction"));
    expect(genreKey("sci-fi")).toBe("science-fiction");
  });
  it("takes the book on the main genre or any subGenre; the main genre on its own", () => {
    const book = ["Thriller", "Crime"];
    expect(takesBook(["crime"], book)).toBe(true);
    expect(takesBook(["Romance"], book)).toBe(false);
    expect(takesBook(["crime"], [])).toBe(false);
    expect(takesMain(["crime"], book)).toBe(false);
    expect(takesMain(["thriller"], book)).toBe(true);
    expect(bookGenreHit(book)("Crime")).toBe(true);
    expect(bookGenreHit([])("Crime")).toBe(false);
  });
});
