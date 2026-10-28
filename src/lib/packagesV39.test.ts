/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39 — the colour model (Part C). The rules side of L2 is tests/rules/firestore.rules.test.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PACKAGE_COLOUR_KEYS } from "../types";
import { colourOf, firstFreeColour, hexOf, PACKAGE_COLOURS, pcStyle } from "./packagesV39";

describe("Part C · the palette", () => {
  it("is exactly the eight, in the pack's order, with the pack's names and hexes", () => {
    expect(PACKAGE_COLOURS.map((c) => [c.key, c.name, c.hex])).toEqual([
      ["harbour", "Harbour", "#1d4b63"], ["lake", "Lake", "#2c6782"], ["teal", "Teal", "#22595b"], ["pine", "Pine", "#2e5641"],
      ["indigo", "Indigo", "#3b477a"], ["plum", "Plum", "#583a5a"], ["slate", "Slate", "#4a5466"], ["charcoal", "Charcoal", "#34373f"],
    ]);
    expect(PACKAGE_COLOURS.map((c) => c.key)).toEqual([...PACKAGE_COLOUR_KEYS]);
  });
  it("the rules hold the same eight keys, and the update allowlist names the field", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    const m = rules.match(/data\.colour in \[([^\]]+)\]/);
    expect(m, "isValidPackage restricts colour").not.toBeNull();
    expect(m![1].split(",").map((x) => x.trim().replace(/'/g, ""))).toEqual([...PACKAGE_COLOUR_KEYS]);
    expect(rules).toMatch(/'icon', 'colour', 'extraIds'\]/);
  });
});

describe("Part C · reading a package's colour", () => {
  it("a package without the field reads as Harbour; a stored key reads as itself", () => {
    expect(colourOf({})).toBe("harbour");
    expect(colourOf(null)).toBe("harbour");
    expect(colourOf({ colour: "plum" })).toBe("plum");
    expect(hexOf({})).toBe("#1d4b63");
    expect(hexOf({ colour: "pine" })).toBe("#2e5641");
    expect(pcStyle({ colour: "lake" })).toEqual({ "--pc": "#2c6782" });
  });
  it("a value from outside the eight (a stale or hand-edited record) reads as Harbour, never as itself", () => {
    expect(colourOf({ colour: "crimson" as never })).toBe("harbour");
  });
});

describe("Part C · the new-package dialog's first choice", () => {
  const live = (colour?: string) => ({ colour: colour as never, status: "Active" as const });
  it("is the first colour no live package uses", () => {
    expect(firstFreeColour([])).toBe("harbour");
    expect(firstFreeColour([live()])).toBe("lake");
    expect(firstFreeColour([live("harbour"), live("lake"), live("pine")])).toBe("teal");
  });
  it("a retired package's colour is free again", () => {
    expect(firstFreeColour([{ colour: "harbour", status: "Retired" }])).toBe("harbour");
  });
  it("is Harbour when all eight are taken", () => {
    expect(firstFreeColour(PACKAGE_COLOUR_KEYS.map((k) => live(k)))).toBe("harbour");
  });
});
