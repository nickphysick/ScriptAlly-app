/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BAR'S OWN GRAMMAR, read out of the stylesheet (Porcelain; ref design-refs/timeline-v35.html).
 *
 * ⚠️ THIS FILE IS A SOURCE LOCK AND KNOWS WHAT THAT IS WORTH. It proves a rule was WRITTEN, never
 * that it reached an element — so every claim here is about the sheet's own shape (a token exists,
 * a selector is not restated, a literal is absent) and every claim about what a bar ENDS UP
 * looking like is made in `tests/e2e/calRowWords55.measure.ts`, against a rendered page. The two are not
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






describe("⚠️ the marker's clearance is a halo, and it costs the bar nothing", () => {
  /**
   * ⚠️ `box-shadow` PAINTS OUTSIDE THE BOX AND TAKES NO LAYOUT. A marker sits ON a card, so
   * without a ring behind it the two inks touch and neither is legible — and a clearance made of
   * margin or padding would move the card instead.
   */
  it("every marker carries a ring of the surface it sits on", () => {
    const r = rulesFor(".tl-mk2");
    /* ⚠️ WHITE SINCE v40, AND THE BACKDROP IS WHY — not a retuned value. Marks used to sit in the
       gap between two cut pieces, on the panel's own ground, so the halo read `--ws-window` to BE
       that ground. Nothing cuts the bar now: every mark rides ON a card, and what it has to
       separate itself from is the card. A `--ws-window` ring on a white card would paint a band of
       the panel colour across the thing the mark is riding on. */
    expect(r).toMatch(/box-shadow\s*:\s*0 0 0 2px #fff/);
    expect(r).toMatch(/width\s*:\s*var\(--mk\)/);
    expect(r).toMatch(/border-radius\s*:\s*999px/);
  });

  it("⚠️ ONE RING, THREE INKS — the ring stopped carrying meaning", () => {
    /* Four per-kind line tokens are retired. A tinted ring said the same thing as the glyph inside
       it, and at 22px a hairline is not something a hue is read off; keeping both meant two places
       to change one fact. The ring is one token; only the glyph differs. */
    expect(decls, "--mk-line missing").toContain("--mk-line:");
    for (const face of ["in", "out", "clock"]) {
      expect(decls, `--mk-${face}-ink missing`).toContain(`--mk-${face}-ink:`);
    }
    for (const face of ["in", "out", "bang", "clock"]) {
      expect(decls, `--mk-${face}-line survives`).not.toContain(`--mk-${face}-line:`);
    }
    /* and the rule reads the one ring rather than restating a hex */
    expect(rulesFor(".tl-mk2")).toMatch(/border\s*:\s*1\.5px solid var\(--mk-line\)/);
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
   * ⚠️ THE STEM IS RETIRED, AND THE LOCK STATES THE RETIREMENT RATHER THAN LAPSING (v63, run 2).
   *
   * It was a 1.5px tick hanging below the today circle, and the case here pinned its declared
   * width because a sub-pixel border's USED value rounds to 1px at DPR 1 — a real reason, for a
   * real element. The element is gone: the date bar's numeral tier is the last thing in it, and a
   * mark below the numerals was a second today marker beside the circle that already is one.
   *
   * The claim survives INVERTED. A lock whose subject has been deleted is not "passing" and is not
   * "obsolete" — it is unproved, and the only honest thing it can assert is that the subject stayed
   * deleted. `rulesFor` returns `""` for a selector with no rule, so the emptiness IS the check.
   */
  it("the today stem is retired — no rule, and nothing renders the class", () => {
    expect(rulesFor(".tl-todaystem"), "the today stem's rule came back").toBe("");
    /* ⚠️ AND THE OTHER HALF, because a rule and a renderer die separately. A class the component
       still emits with no rule left is invisible chrome nobody can style; a rule with no renderer
       is the fault this file already records. Both directions, or the retirement is half done. */
    const page = readFileSync(join(here, "TodoCalendarPage.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(page, "the today stem is rendered again").not.toMatch(/["\s`]tl-todaystem["\s`]/);
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
