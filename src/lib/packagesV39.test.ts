/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39 — the colour model (Part C). The rules side of L2 is tests/rules/firestore.rules.test.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PACKAGE_COLOUR_KEYS } from "../types";
import { EMPTY_FIG, type Fig } from "./packagesV38";
import { colourOf, countCells, firstFreeColour, fullListOrder, hexOf, PACKAGE_COLOURS, pcStyle, rateCell } from "./packagesV39";

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

const fig = (sent: number, answered: number, more: number, ranked: boolean): Fig =>
  ({ ...EMPTY_FIG, sent, answered, more, replies: answered, pct: sent ? Math.round((more / sent) * 100) : null, ranked });

describe("Part H · the full list's order (sent, then ranked, then rate, then sent)", () => {
  const items = [
    { id: "unsent", f: fig(0, 0, 0, false) },
    { id: "early-big", f: fig(9, 2, 2, false) },
    { id: "ranked-40", f: fig(5, 4, 2, true) },
    { id: "ranked-60", f: fig(5, 5, 3, true) },
    { id: "early-small", f: fig(3, 1, 1, false) },
    { id: "ranked-40-more", f: fig(10, 8, 4, true) },
  ];
  it("puts every ranked item above every too-early one, and unsent last", () => {
    expect(fullListOrder(items).map((i) => i.id)).toEqual(["ranked-60", "ranked-40-more", "ranked-40", "early-big", "early-small", "unsent"]);
  });
  it("an under-threshold item is never above a ranked one, whatever its rate (a property over shuffles)", () => {
    for (let n = 0; n < 50; n++) {
      /* a deterministic shuffle: each item keyed by a hash of (n, its position) */
      const shuffled = items.map((x, i) => ({ x, k: Math.sin((n + 1) * 9301 + i * 49297) })).sort((a, b) => a.k - b.k).map((o) => o.x);
      const out = fullListOrder(shuffled);
      const lastRanked = Math.max(...out.map((x, i) => (x.f.ranked ? i : -1)));
      const firstEarly = out.findIndex((x) => x.f.sent > 0 && !x.f.ranked);
      expect(firstEarly).toBeGreaterThan(lastRanked);
      expect(out.at(-1)!.id).toBe("unsent");
    }
  });
  it("does not reorder its input", () => {
    const before = items.map((i) => i.id);
    fullListOrder(items);
    expect(items.map((i) => i.id)).toEqual(before);
  });
});

describe("Part H · a row's cells", () => {
  it("ranked: the rate as a bar and a figure (a 3% floor for the bar), the counts as numbers", () => {
    expect(rateCell(fig(5, 4, 2, true))).toEqual({ k: "ranked", width: 40, label: "40%" });
    expect(rateCell(fig(50, 40, 1, true))).toEqual({ k: "ranked", width: 3, label: "2%" });
    expect(countCells(fig(5, 4, 2, true))).toEqual(["5", "4", "2"]);
  });
  it("too early: a hatched bar and “Too early”; not sent: dashes and “Not sent”", () => {
    expect(rateCell(fig(3, 1, 1, false))).toEqual({ k: "early", width: 100, label: "Too early" });
    expect(rateCell(fig(0, 0, 0, false))).toEqual({ k: "none", width: 100, label: "Not sent" });
    expect(countCells(fig(0, 0, 0, false))).toEqual(["–", "–", "–"]);
  });
});
