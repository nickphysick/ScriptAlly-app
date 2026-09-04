/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
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
  it("hides once this book has a second version", () => {
    expect(versionsTileShown("ms-1", [v("ms-1")])).toBe(true);
    expect(versionsTileShown("ms-1", [v("ms-1"), v("ms-1")])).toBe(false);
  });

  /** ⚠️ THIS BOOK'S. Counting across the shelf would hide it on a book that has never had one. */
  it("counts only this manuscript's versions", () => {
    expect(versionsTileShown("ms-1", [v("ms-2"), v("ms-2"), v("ms-2")]),
      "another book's versions hid this book's tile").toBe(true);
  });

  it("is not dismissable", () => {
    expect(DISMISSABLE).not.toContain("versions");
    expect(visibleTiles({ user: u({ manuscripts: { dismissedTiles: ["versions"] } }), manuscriptId: "ms-1", versions: [] }))
      .toContain("versions");
  });
});

describe("which tiles render", () => {
  it("all three by default, in the ref's order", () => {
    expect(visibleTiles({ user: u(), manuscriptId: "ms-1", versions: [] }))
      .toEqual(["versions", "wordcount", "packages"]);
  });

  it("drops what has been dismissed and what has hidden itself", () => {
    expect(visibleTiles({
      user: u({ manuscripts: { dismissedTiles: ["wordcount"] } }),
      manuscriptId: "ms-1",
      versions: [v("ms-1"), v("ms-1")],
    })).toEqual(["packages"]);
  });

  it("can end up showing none", () => {
    expect(visibleTiles({
      user: u({ manuscripts: { dismissedTiles: ["wordcount", "packages"] } }),
      manuscriptId: "ms-1",
      versions: [v("ms-1"), v("ms-1")],
    })).toEqual([]);
  });
});
