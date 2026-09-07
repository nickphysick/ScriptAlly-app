/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dismissedTiles, withTileDismissed, versionsTileShown, visibleTiles, DISMISSABLE } from "./promoTiles";
import { User, ManuscriptVersion } from "../types";

const u = (prefs?: User["todoPrefs"]) => ({ todoPrefs: prefs } as Pick<User, "todoPrefs">);
const v = (manuscriptId: string) => ({ manuscriptId } as ManuscriptVersion);

describe("promo dismissal", () => {
  it("reads nothing from a user who has dismissed nothing", () => {
    expect(dismissedTiles(u())).toEqual([]);
    expect(dismissedTiles(null)).toEqual([]);
    expect(dismissedTiles(u({ staleMonths: 3 }))).toEqual([]);
  });

  /** ⚠️ Only the two dismissable ids are honoured — junk in the field cannot hide a tile. */
  it("ignores ids that are not dismissable", () => {
    expect(dismissedTiles(u({ manuscripts: { dismissedTiles: ["versions", "nonsense", "wordcount"] } })))
      .toEqual(["wordcount"]);
    expect(DISMISSABLE).toEqual(["wordcount", "packages"]);
  });

  /**
   * ⚠️ THE WRITE MERGES. `todoPrefs` also carries the To-do board's settings and the Noteboard's
   * sub-map; a dismissal that replaced the field wholesale would silently delete another page's
   * preferences. This is the assertion that keeps that from happening.
   */
  it("keeps every other preference in the map", () => {
    const before = u({ staleMonths: 3, rollForward: true, noteboard: { dismissedExamples: ["a"] } });
    const after = withTileDismissed(before, "wordcount");
    expect(after.staleMonths).toBe(3);
    expect(after.rollForward).toBe(true);
    expect(after.noteboard, "the Noteboard's sub-map was destroyed").toEqual({ dismissedExamples: ["a"] });
    expect(after.manuscripts?.dismissedTiles).toEqual(["wordcount"]);
  });

  it("adds without duplicating", () => {
    const once = withTileDismissed(u(), "packages");
    const twice = withTileDismissed(u(once), "packages");
    expect(twice.manuscripts?.dismissedTiles).toEqual(["packages"]);
  });
});

describe("the versions tile hides on evidence, not on a click", () => {
  /** ⚠️ A Pro user with three versions does not need the pitch, and should not have to tidy it away. */
  const shelf = [{ id: "ms-1" }, { id: "ms-2" }];

  it("hides once THIS book has a second version", () => {
    expect(versionsTileShown(shelf, [v("ms-1")], "ms-1")).toBe(true);
    expect(versionsTileShown(shelf, [v("ms-1"), v("ms-1")], "ms-1")).toBe(false);
  });

  /**
   * ⚠️ THE FAULT THAT SHIPPED. On the shelf there is no "this manuscript", and the first version
   * read `manuscripts[0]` — so ONE book with nine versions hid the pitch for a whole shelf of books
   * that had none. Measured on the harness account: 9, 0, 0, 0, and the tile the redesign exists to
   * surface was the one tile not on screen.
   */
  it("on the shelf, shows while ANY book is not using versions", () => {
    const many = [{ id: "ms-1" }, { id: "ms-2" }, { id: "ms-3" }];
    const nine = Array.from({ length: 9 }, () => v("ms-1"));
    expect(versionsTileShown(many, nine),
      "one book's versions hid the pitch for the whole shelf").toBe(true);
  });

  /** …and goes only once every book is. */
  it("on the shelf, hides once every book is using versions", () => {
    expect(versionsTileShown(shelf, [v("ms-1"), v("ms-1"), v("ms-2"), v("ms-2")])).toBe(false);
  });

  /** An empty shelf still gets the pitch — there is nobody it could be redundant for. */
  it("shows on an empty shelf", () => {
    expect(versionsTileShown([], [])).toBe(true);
  });

  /** ⚠️ THIS BOOK'S. Counting across the shelf would hide it on a book that has never had one. */
  it("counts only this manuscript's versions when one is named", () => {
    expect(versionsTileShown(shelf, [v("ms-2"), v("ms-2"), v("ms-2")], "ms-1"),
      "another book's versions hid this book's tile").toBe(true);
  });

  it("is not dismissable", () => {
    expect(DISMISSABLE).not.toContain("versions");
    expect(visibleTiles({ user: u({ manuscripts: { dismissedTiles: ["versions"] } }), manuscripts: [{ id: "ms-1" }], versions: [] }))
      .toContain("versions");
  });
});

describe("which tiles render", () => {
  it("all three by default, in the ref's order", () => {
    expect(visibleTiles({ user: u(), manuscripts: [{ id: "ms-1" }], versions: [] }))
      .toEqual(["versions", "wordcount", "packages"]);
  });

  it("drops what has been dismissed and what has hidden itself", () => {
    expect(visibleTiles({ user: u({ manuscripts: { dismissedTiles: ["wordcount"] } }), manuscripts: [{ id: "ms-1" }], versions: [v("ms-1"), v("ms-1")] })).toEqual(["packages"]);
  });

  it("can end up showing none", () => {
    expect(visibleTiles({
      user: u({ manuscripts: { dismissedTiles: ["wordcount", "packages"] } }),
      manuscripts: [{ id: "ms-1" }],
      versions: [v("ms-1"), v("ms-1")],
    })).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   AND THE GRID FILLS — a hole where a tile is not is worse than the tile being absent.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
describe("the promo row sizes to its tiles", () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const tsx = strip(readFileSync(join(__dirname, "../components/manuscripts/ManuscriptPromos.tsx"), "utf8"));
  const css = strip(readFileSync(join(__dirname, "../components/manuscripts/manuscriptPromos.css"), "utf8"));

  /**
   * ⚠️ `repeat(3, 1fr)` LEFT A HOLE WHENEVER FEWER THAN THREE RENDERED — and for a Pro user using
   * versions that is the PERMANENT state: two tiles and a gap, for good.
   */
  it("takes its column count from the tiles actually rendered", () => {
    expect(css).toContain("repeat(var(--mpr-count, 3), 1fr)");
    expect(css, "the fixed three-column grid came back").not.toMatch(/grid-template-columns:\s*repeat\(3,/);
    expect(tsx).toContain('"--mpr-count": tiles.length');
  });

  /** ⚠️ Nothing renders at all when every tile is gone — an empty row is still a hole. */
  it("renders nothing when no tile survives", () => {
    expect(tsx).toContain("if (!tiles.length) return null;");
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   THE HERO'S ID IS THE ARGUMENT — the Versions fix, stated as the three counts that matter.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
describe("the Versions card, keyed on the hero", () => {
  const shelf = [{ id: "hero" }, { id: "other" }];
  const at = (n: number) => Array.from({ length: n }, () => v("hero"));
  const tiles = (n: number) =>
    visibleTiles({ user: u(), manuscripts: shelf, versions: at(n), manuscriptId: "hero" });

  /**
   * ⚠️ THE THRESHOLD WAS NEVER THE FAULT. It shows at nought and one and hides at two — which is
   * what "hide only when a second version exists" means, and what it has always said. What was
   * wrong was the ARGUMENT: with no focal book the page passed `ordered[0]`, so one book's nine
   * versions hid the pitch for three books with none. The page has a hero now.
   */
  it("renders at zero versions", () => { expect(tiles(0)).toContain("versions"); });
  it("renders at one version", () => { expect(tiles(1)).toContain("versions"); });
  it("hides at two", () => { expect(tiles(2)).not.toContain("versions"); });
  it("stays hidden at nine", () => { expect(tiles(9)).not.toContain("versions"); });

  /** ⚠️ ANOTHER BOOK'S VERSIONS CANNOT HIDE THE HERO'S CARD — the fault, stated directly. */
  it("ignores versions belonging to another book", () => {
    const others = Array.from({ length: 9 }, () => v("other"));
    expect(visibleTiles({ user: u(), manuscripts: shelf, versions: others, manuscriptId: "hero" }),
      "another book's versions hid the hero's card").toContain("versions");
  });

  /**
   * ⚠️ AND THE GRID SIZES TO THE COUNT. Three cards when Versions renders, two when it does not —
   * a fixed column count leaves a hole, and for a Pro user using versions that hole is permanent.
   */
  it("gives three cards at zero versions and two at two", () => {
    expect(tiles(0)).toHaveLength(3);
    expect(tiles(2)).toHaveLength(2);
  });
});

describe("and the component passes the hero's id", () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const tsx = strip(readFileSync(join(__dirname, "../components/manuscripts/ManuscriptPromos.tsx"), "utf8"));
  const page = strip(readFileSync(join(__dirname, "../components/AllManuscripts.tsx"), "utf8"));

  /**
   * ⚠️ THE PURE CASES ABOVE CANNOT SEE THIS. Drop `manuscriptId` at the call site and every one of
   * them still passes, because they pass it themselves — the component would silently fall back to
   * the shelf-wide rule and the card would go missing again, exactly as it did on dev. The
   * composition is the half a pure test cannot make.
   */
  it("keys the tiles on the hero, not the shelf", () => {
    expect(tsx, "the component stopped passing the hero's id")
      .toContain("visibleTiles({ user, manuscripts, versions, manuscriptId: heroId })");
  });

  /** ⚠️ AND THE PAGE HANDS IT THE HERO — never `ordered[0]`, which is the argument that caused it. */
  it("the page passes the derived hero", () => {
    expect(page).toContain("heroId={hero?.id ?? null}");
    expect(page, "the page went back to the first book on the shelf")
      .not.toMatch(/heroId=\{ordered\[0\]/);
  });
});
