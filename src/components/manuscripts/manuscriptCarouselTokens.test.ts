/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE CAROUSEL'S TOKENS RESOLVE, AND ITS MOTION RULES ARE ORDERED ═══════════════════════════
 *
 * ⚠️ THIS LAW IS INHERITED, NOT NEW. `manuscriptLibraryTokens.test.ts` held it for the grid this
 * carousel replaces, and the grid is retired in the same commit — so the law follows the sheet
 * rather than lapsing with the file that used to carry it.
 *
 * ⚠️ CHECKED FROM CONSUMPTION TO DEFINITION. `var()` on an UNDEFINED custom property yields nothing
 * and CSS says nothing: the declaration is dropped in silence. Grepping for tokens we ADDED cannot
 * catch one we REFERENCED and never wrote, which is how a shell selector once rendered 0px wide
 * through a green typecheck, a green build and a green suite.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const here = (f: string) => strip(readFileSync(resolve(__dirname, f), "utf8"));

const CAR = here("./manuscriptCarousel.css");
/** Where the tokens this sheet consumes are defined — the same widened set the grid's lock used. */
const DEFINED_IN = [
  CAR,
  here("./manuscriptPlate.css"),
  here("./manuscripts.css"),
  here("./bookProfile.css"),
  here("../shell/workspacePageGrid.css"),
  here("../shell/pageHeader.css"),
  here("../../index.css"),
].join("\n");

describe("every token the carousel READS resolves to a definition", () => {
  /** ⚠️ A zero-length sweep passes against an empty file. Assert the population before the property. */
  it("reads a real number of them", () => {
    expect([...CAR.matchAll(/var\((--[a-z0-9-]+)/gi)].length).toBeGreaterThan(8);
  });

  it("and no rule reads a token that does not exist", () => {
    const read = new Set([...CAR.matchAll(/var\((--[a-z0-9-]+)/gi)].map((m) => m[1]));
    for (const name of read) {
      /* A `var(--x, fallback)` with a real fallback is still a read: if the token is undefined the
         rule paints the fallback, which is a different value from the one the author meant. */
      expect(new RegExp(`${name}\\s*:`).test(DEFINED_IN),
        `${name} is read by manuscriptCarousel.css and defined nowhere`).toBe(true);
    }
  });
});

describe("the motion and focus rules the a11y claims rest on", () => {
  /**
   * ⚠️ THE REDUCED-MOTION BLOCK MUST COME AFTER THE RULE IT OVERRIDES. A media query confers no
   * specificity, so at equal weight the later rule wins — this repo has lost a reduced-motion
   * override to exactly that ordering, measuring a 0.5s transition from a declaration that read
   * perfectly correctly.
   */
  it("reduced motion is declared after the transition it cancels", () => {
    const transition = CAR.indexOf(".mcar-tile {");
    const reduce = CAR.indexOf("prefers-reduced-motion");
    expect(transition).toBeGreaterThan(-1);
    expect(reduce, "the reduced-motion block is gone").toBeGreaterThan(-1);
    expect(reduce, "reduced motion is declared before the rule it overrides — it will lose")
      .toBeGreaterThan(transition);
    /* And it cancels rather than slowing: a swap, not a longer slide. */
    const block = CAR.slice(reduce, CAR.indexOf("}", CAR.indexOf("{", reduce + 40)) + 1);
    expect(block).toContain("transition: none");
  });

  /**
   * ⚠️ `opacity: 0` STILL TAKES TAB FOCUS AND IS STILL READ ALOUD. The renderer sets `tabIndex={-1}`
   * and `aria-hidden`; the sheet adds `visibility: hidden` as the third belt, so an edit that drops
   * one of the three still cannot leave a readable card off the side of the stage.
   */
  it("a hidden tile is hidden three ways, not one", () => {
    const rule = CAR.slice(CAR.indexOf(".mcar-hidden"), CAR.indexOf("}", CAR.indexOf(".mcar-hidden")));
    expect(rule).toContain("opacity: 0");
    expect(rule, "opacity alone leaves the tile tabbable and announced").toContain("visibility: hidden");
    expect(rule).toContain("pointer-events: none");
  });

  /**
   * ⚠️ THE STAGE DOES NOT CLIP. The bookmark ribbon overhangs the tile's top-left corner on two
   * sides, so `overflow: hidden` here would cut the ribbon off — the one thing on the tile that is
   * deliberately outside its own box.
   */
  it("the stage does not clip the overhanging ribbon", () => {
    const stage = CAR.slice(CAR.indexOf(".mcar {"), CAR.indexOf("}", CAR.indexOf(".mcar {")));
    expect(stage).toContain("overflow: visible");
  });
});
