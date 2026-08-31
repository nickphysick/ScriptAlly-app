/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BAR'S OWN GRAMMAR, read out of the stylesheet (Porcelain; ref design-refs/timeline-v35.html).
 *
 * ⚠️ THIS FILE IS A SOURCE LOCK AND KNOWS WHAT THAT IS WORTH. It proves a rule was WRITTEN, never
 * that it reached an element — so every claim here is about the sheet's own shape (a token exists,
 * a selector is not restated, a literal is absent) and every claim about what a bar ENDS UP
 * looking like is made in `tests/e2e/calLook.measure.ts`, against a rendered page. The two are not
 * interchangeable and this repo has been caught assuming they were.
 *
 * ⚠️ COMMENTS ARE STRIPPED BEFORE ANYTHING IS ASSERTED. Every retirement in this repo is
 * documented by quoting what it retired, so a sweep for hexes over raw source reads the prose
 * explaining the hexes it removed and reports them as offences.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = new URL(".", import.meta.url).pathname;
const css = readFileSync(join(here, "todoCalendar.css"), "utf8");
const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** the five live families plus the two that have no fill of their own */
const FAMILIES = ["out", "req", "decide", "remind"] as const;

/** every base rule for a selector, joined — a grouped rule must not make a read ambiguous */
const rulesFor = (sel: string): string => {
  /* ⚠️ WHITESPACE IN A SELECTOR IS NOT SIGNIFICANT TO CSS AND MUST NOT BE TO THE READER EITHER.
     Escaping the string literally made `.tl-p.quiet  .tl-fl` (two spaces, as it happened to be
     typed) unfindable, and the lock reported that the rule did not exist — the vacuous-read
     failure this repo already records against first-match slicing, arriving through a space bar.
     ⚠️ AND IT IS ANCHORED AT A LINE START, so `.tl-fl` cannot match the tail of `.tl-p.out .tl-fl`
     and hand back a descendant rule as though it were the base one. */
  const esc = sel.trim().split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const re = new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`, "g");
  return [...decls.matchAll(re)].map((m) => m[1]).join(" ");
};

describe("⚠️ PILLS ARE DATA, CONTROLS ARE NOT PILLS", () => {
  /**
   * ⚠️ THE ONE RULE A READER CANNOT RECOVER FROM IF IT BREAKS. A pill-shaped button beside
   * pill-shaped bars reads as another piece of data — the reader learns the shape means "a fact
   * about this row" and then finds one of them is a control. Square corners make the two
   * categories unmistakable, and it costs nothing.
   */
  it("no control carries a bar's radius, and no bar carries a control's", () => {
    const CONTROLS = [".tl-abtn", ".tl-gtbtn"];
    for (const c of CONTROLS) {
      const r = rulesFor(c);
      expect(r, `${c} has no rule at all`).not.toBe("");
      expect(r, `${c} is drawn as a pill`).not.toMatch(/border-radius\s*:\s*999px/);
    }
    /* and the bar is a pill, which is the other half of the same claim */
    expect(rulesFor(".tl-p"), "the bar stopped being a pill").toMatch(/border-radius\s*:\s*999px/);
  });

  it("the action button states its ground, its line and its ink rather than inheriting them", () => {
    const r = rulesFor(".tl-abtn");
    expect(r).toMatch(/background\s*:\s*#fff/);
    expect(r).toContain("--tl-btn-line");
    expect(r).toContain("--tl-btn-ink");
  });
});





describe("⚠️ the marker's clearance is a halo, and it costs the bar nothing", () => {
  /**
   * ⚠️ `box-shadow` PAINTS OUTSIDE THE BOX AND TAKES NO LAYOUT. A marker sits ON a bar, so
   * without a ring of the row's own colour behind it the two inks touch and neither is legible —
   * and a clearance made of margin or padding would move the bar instead.
   */
  it("every marker carries a ring of the row's colour", () => {
    const r = rulesFor(".tl-mk2");
    expect(r).toMatch(/box-shadow\s*:\s*0 0 0 3px var\(--tl-row\)/);
    expect(r).toMatch(/width\s*:\s*var\(--mk\)/);
    expect(r).toMatch(/border-radius\s*:\s*999px/);
  });

  it("the four faces are four tokens, and none of them is a status colour", () => {
    for (const face of ["in", "out", "bang", "clock"]) {
      expect(decls, `--mk-${face}-line missing`).toContain(`--mk-${face}-line:`);
      expect(decls, `--mk-${face}-ink missing`).toContain(`--mk-${face}-ink:`);
    }
  });
});

describe("⚠️ the retired values are gone from the DECLARATIONS, not merely from the comments", () => {
  /**
   * ⚠️ THE YELLOW AND THE BLUE ARE THE REASON THE COLOUR RULE WAS SUSPENDED FOR THIS PACK. Neither
   * had a code token, so "read the colour out of the code" meant "invent one" — and what got
   * invented was a yellow reminder band and a blue decide bar on a board with no other yellow and
   * no other blue. They are named here so that re-typing one fails rather than merely looking odd.
   */
  const RETIRED = [
    "#cbd9e8", "#fff8e5", "#8e5252", "#787878", "#e0e0e0", "#d6d6d6",
    "#9db6cf", "#a3a3a3", "#c9a89e", "#eae2d6", "#c6d2e0", "#f6ecd2",
  ];
  it("none of them survives anywhere a rule can read it", () => {
    const found = RETIRED.filter((h) => decls.toLowerCase().includes(h));
    expect(found, `${found.length} retired values are still painted`).toEqual([]);
  });
});

describe("⚠️ the rail's pinned values, where a source lock is the right instrument", () => {
  /**
   * ⚠️ THE STEM IS DECLARED AT 1.5px AND CHROMIUM REPORTS 1px. A sub-pixel border's USED value
   * rounds at DPR 1, so the rendered check can only say it is painted and painted burgundy — the
   * declared width is a fact about the sheet and belongs here. This is the one place in this pack
   * where a source lock is stronger than a painted one, and it is stated so nobody "fixes" the
   * rendered assertion by pinning 1px.
   */
  it("the today stem is 1.5px in the sheet, whatever the used value rounds to", () => {
    expect(rulesFor(".tl-todaystem")).toMatch(/border-left:\s*1\.5px solid var\(--tl-nearblack\)/);
  });

  it("the rail's height is a token, and the columns it shares with a row are the same two", () => {
    const board = css.slice(css.indexOf(".tl-board {"), css.indexOf(".tl-grp"));
    expect(board).toContain("--tl-rail-h:");
    expect(rulesFor(".tl-rail")).toMatch(/height\s*:\s*var\(--tl-rail-h\)/);
    /* ⚠️ ONE RULE GIVES THE RAIL AND EVERY ROW THEIR FLEX, so the two cannot be given different
       column models by an edit to one of them. */
    expect(decls).toMatch(/\.tl-hrow,\s*\.tl-rrow,\s*\.tl-rail\s*\{[^}]*display:\s*flex/);
  });
});
