/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles: the row model's small helpers. (Comps v28 retired v25's list cases — the three-click sort, the
 * one filter, the grouping, the next move and the glance — with the list; the shelf's are lib/compsShelf.test.ts.)
 */
import { describe, expect, it } from "vitest";
import { kindOf, letterShort } from "./compsLibrary";


describe("the small things", () => {
  it("a kind is an icon's name, and a letter's short name", () => {
    expect([kindOf({}), kindOf({ media: "tv" }), kindOf({ media: "film" }), kindOf({ media: "other" })]).toEqual(["book", "tv", "film", "film"]);
    expect([letterShort("Query letter v2"), letterShort("Agent-specific opener")]).toEqual(["QL v2", "Agent-specific opener"]);
  });
});
