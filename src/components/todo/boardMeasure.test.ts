/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The column measure (board-optimise pack, Phase 1; ref design-refs/board-optimised.html §1).
 *
 * ⚠️ WHY THIS IS A RULE-TEXT SUITE AND NOT A MEASURED ONE: there is no jsdom in this repo
 * (`vitest.config.ts` is `environment: 'node'`), so nothing here can compute a used width. What
 * CAN be asserted with certainty is the grammar that produces it — a capped track function plus
 * a start-justified grid is, by the CSS spec, incapable of stretching a column past its cap or
 * of overflowing when the viewport is narrower than the cap. The arithmetic is stated per case
 * so a reader can check the claim without a browser.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "todoBoard.css"), "utf8");
const rule = (sel: string): string => {
  const i = css.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf("}", i));
};

describe("⚠️ columns are CAPPED and the board RAGS LEFT — wide screens get margin, not wider cards", () => {
  const base = rule(".tbd {");

  it("the cap is a token, and the track function is minmax(0, cap) — never 1fr", () => {
    expect(base).toContain("--tbd-col-w: 290px");
    expect(base).toContain("grid-template-columns: repeat(4, minmax(0, var(--tbd-col-w)))");
    expect(base).not.toContain("repeat(4, 1fr)");
  });

  it("⚠️ NO STRETCH AT 2560: the surplus becomes margin because the grid justifies to start", () => {
    expect(base).toContain("justify-content: start");
    /* The arithmetic, stated: four 290px tracks + three 20px gaps = 1220px of content. At a
       2560px viewport the remaining ~1340px is distributed by `justify-content`, and `start`
       puts ALL of it after the last column. A `1fr` track (or a stretch/space-between
       justification) would instead grow the tracks — the exact fault this replaces. */
    expect(base).toContain("gap: 20px");
    for (const stretchy of ["justify-content: stretch", "justify-content: space-between", "justify-content: center"]) {
      expect(base, stretchy).not.toContain(stretchy);
    }
  });

  it("⚠️ NO OVERFLOW WHEN NARROW: the min track is 0, so a column shrinks rather than overrunning", () => {
    /* minmax(0, 290px) — the MIN is zero, not min-content. That is what lets four tracks fit a
       900px viewport (they shrink) and what stops a long unbroken title forcing the grid wider
       than its container. The two breakpoints keep the same function with fewer tracks. */
    expect(base).toContain("minmax(0, var(--tbd-col-w))");
    expect(css).toContain("@media (max-width: 1100px) { .tbd { grid-template-columns: repeat(2, minmax(0, var(--tbd-col-w))); } }");
    expect(css).toContain("@media (max-width: 640px) { .tbd { grid-template-columns: minmax(0, var(--tbd-col-w)); } }");
    // and no breakpoint reintroduces a stretching track
    expect(css).not.toMatch(/@media[^{]*\{\s*\.tbd\s*\{[^}]*1fr/);
  });

  it("the cards themselves declare no width — the track is the only measure", () => {
    const card = rule(".tbd-card {\n  background:");
    expect(card).not.toContain("width:");
    expect(card).not.toContain("max-width");
  });
});
