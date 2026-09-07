/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The five tiles, and the genre-match tint they share a comparison with.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { activeTile, agentTiles, scopedManuscript } from "./agentTiles";
import { GENRE_MATCH_TINT, isGenreMatch, matchGenre } from "./genreMatch";
import { emptyFilters, matchesFilters } from "./agentFilters";
import {
  CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_MANUSCRIPTS, CONTACT_FIXTURE_QUERIES, FIXTURE_GENRE,
} from "../components/agents/contactFixture";
import { Manuscript } from "../types";

const A = CONTACT_FIXTURE_AGENTS;
const Q = CONTACT_FIXTURE_QUERIES;
const MS = CONTACT_FIXTURE_MANUSCRIPTS[0];
const tiles = agentTiles(A, Q, MS);

describe("the five tiles", () => {
  it("are the ref's five, with the genre tile named from the manuscript", () => {
    expect(tiles.map((t) => t.key)).toEqual(["all", "open", "shut", "genre", "fresh"]);
    expect(tiles.map((t) => t.label)).toEqual([
      "All contacts", "Open to queries", "Closed to queries", `Seeking ${FIXTURE_GENRE.toLowerCase()}`, "Not yet queried",
    ]);
  });

  /* ⚠️ TOTALS. A tile counting what it would show after clicking reads 0 for every section you
     are not in, which is the one number nobody needs. */
  it("count the WHOLE list — the door tiles partition it exactly", () => {
    const by = (k: string) => tiles.find((t) => t.key === k)!.count;
    expect(by("all")).toBe(A.length);
    expect(by("open") + by("shut"), "the door tiles do not partition the list").toBe(A.length);
    expect(by("fresh")).toBeGreaterThan(0);
  });

  /* ⚠️ ABSENT, NOT EMPTY. "Seeking —" is a question with no subject. */
  it("the genre tile is absent when no manuscript is in scope, or it records no genre", () => {
    expect(agentTiles(A, Q, null).map((t) => t.key)).toEqual(["all", "open", "shut", "fresh"]);
    const noGenre = { ...MS, genre: "  " } as Manuscript;
    expect(agentTiles(A, Q, noGenre).some((t) => t.key === "genre"), "a genre tile appeared for a manuscript with no genre").toBe(false);
  });

  it("never hard-codes a genre — the label follows the manuscript", () => {
    const other = { ...MS, genre: "Historical fiction" } as Manuscript;
    const t = agentTiles(A, Q, other).find((x) => x.key === "genre")!;
    expect(t.label).toBe("Seeking historical fiction");
    expect(t.count, "the count did not follow the label").toBe(A.filter((a) => a.genres.includes("Historical fiction")).length);
    const src = readFileSync(new URL("./agentTiles.ts", import.meta.url), "utf8");
    expect(src, "a genre literal reached the tile model").not.toMatch(/"(Thriller|Crime|Romance|Literary fiction)"/);
  });

  /* ⚠️ EVERY TILE IS A FILTER THE POPOVER CAN ALREADY EXPRESS — a shortcut, never a second
     filtering mechanism, which is what stops the row disagreeing with the applied tags. */
  it("each tile's filter yields exactly the count it states", () => {
    for (const t of tiles) {
      const n = A.filter((a) => matchesFilters(a, Q, t.filters)).length;
      expect(n, `the ${t.label} tile states ${t.count} and its filter yields ${n}`).toBe(t.count);
    }
  });

  /* ⚠️ DERIVED, NOT REMEMBERED. A remembered tile stays lit while the reader edits the filter
     underneath it, and then lies about what is on screen. */
  it("the lit tile is derived from the filter set, and nothing is lit for a set no tile states", () => {
    expect(activeTile(tiles, emptyFilters())).toBe("all");
    expect(activeTile(tiles, { ...emptyFilters(), door: ["Closed to queries"] })).toBe("shut");
    expect(activeTile(tiles, { ...emptyFilters(), reply: ["Within 4 weeks"] }), "a tile lit for a filter no tile states").toBeNull();
    expect(activeTile(tiles, { ...emptyFilters(), door: ["Open to queries"], history: ["Active queries"] })).toBeNull();
  });

  it("scopedManuscript falls back to the only one, and to nothing when there are several", () => {
    expect(scopedManuscript([MS], null)?.id).toBe(MS.id);
    expect(scopedManuscript([MS, { ...MS, id: "other" } as Manuscript], null)).toBeNull();
    expect(scopedManuscript([MS, { ...MS, id: "other" } as Manuscript], "other")?.id).toBe("other");
  });
});

/**
 * ⚠️ THE TINT FIRES ON AN EXACT MATCH AND NOTHING ELSE — asked for by name, and the negative case
 * has to be IN THE POPULATION or the claim measures nothing. A fixture whose agents all match
 * would light every chip and pass any check that only looked for a tinted one.
 */
describe("the genre-match tint", () => {
  const match = matchGenre(FIXTURE_GENRE);

  it("the fixture carries a card with a matching AND a non-matching chip, side by side", () => {
    const mixed = A.filter((a) => a.genres.some((g) => isGenreMatch(g, match)) && a.genres.some((g) => !isGenreMatch(g, match)));
    expect(mixed.length, "no agent seeks the manuscript's genre AND something else — the tint has no negative case on a single card").toBeGreaterThan(0);
    /* and the split within that one card is real: some tinted, some not */
    const a = mixed[0];
    expect(a.genres.filter((g) => isGenreMatch(g, match)).length).toBe(1);
    expect(a.genres.filter((g) => !isGenreMatch(g, match)).length).toBeGreaterThan(0);
  });

  it("…and an agent who matches NOTHING, so a whole card can be untinted", () => {
    expect(A.some((a) => a.genres.length > 0 && !a.genres.some((g) => isGenreMatch(g, match)))).toBe(true);
  });

  /* ⚠️ EXACT, not a prefix, a substring or a family. "Thriller" must not light "Psychological
     thriller": they are different shelves, and a tint that means "sort of" means nothing. */
  it("is exact — never a substring, a prefix or a plural", () => {
    expect(isGenreMatch(FIXTURE_GENRE, match)).toBe(true);
    for (const near of ["Thrillers", "Psychological thriller", "Thrill", "Historical thriller"]) {
      expect(isGenreMatch(near, match), `"${near}" was tinted as if it were "${FIXTURE_GENRE}"`).toBe(false);
    }
  });

  /* the two sides come from different keyboards — one is typed into the manuscript form, one is
     picked from a list — so case and edge whitespace are the same answer */
  it("is case-insensitive and trimmed, because the two sides are typed in different places", () => {
    expect(isGenreMatch("  thriller ", match)).toBe(true);
    expect(isGenreMatch("THRILLER", match)).toBe(true);
  });

  it("null means no claim — nothing tints at all", () => {
    expect(matchGenre("")).toBeNull();
    expect(matchGenre(undefined)).toBeNull();
    expect(isGenreMatch(FIXTURE_GENRE, null)).toBe(false);
  });

  /* ⚠️ ONE SWITCH FOR THE WHOLE PAGE — chips, list, board columns and the tile together. A flag
     at three call sites is three flags that will eventually disagree. */
  it("ships on, behind a single named constant", () => {
    expect(GENRE_MATCH_TINT).toBe(true);
    const src = readFileSync(new URL("./genreMatch.ts", import.meta.url), "utf8");
    expect((src.match(/GENRE_MATCH_TINT/g) ?? []).length, "the switch is read in more than one place inside its own module").toBeLessThan(4);
  });
});
