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
