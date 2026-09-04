/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ ONE NAME, ONE RULE — the sweep, not the fix.
 *
 * The panel's top bar rendered as a 7px pill in the progress track's colour because `.qpn-bar` was
 * declared TWICE in one file, 135 lines apart, and the cascade takes the last. Renaming the second
 * fixes that instance; this fails on the next one, which is the only version of the guard worth
 * having. This repo has an audit about the same shape in `workspacePageGrid.css`, where it bit
 * twice — once as a real duplicate and once inside the very commit that was fixing it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HERE = join(process.cwd(), "src/components/queries");
const SHEETS = ["queryPanel.css", "queryCard.css", "queryCentreGrid.css"];

/** ⚠️ COMMENTS FIRST. Every one of these files DISCUSSES the selectors it retired. */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

describe("⚠️ no base selector is declared twice in one sheet", () => {
  for (const file of SHEETS) {
    it(`${file}`, () => {
      let src = decls(readFileSync(join(HERE, file), "utf8"));
      /**
       * ⚠️ AT-RULE BLOCKS COME OUT FIRST, and this was a false positive before it was a guard: the
       * sweep flagged `.qcc-grid` and `.qcc--enter` as duplicated when the second declaration of
       * each is inside `@media (max-width: 980px)` and `@media (prefers-reduced-motion)`. Those are
       * VARIANTS — the whole point of a media query is to restate a rule under a condition — and a
       * check that calls them duplicates is one people learn to rebaseline instead of read.
       */
      src = src.replace(/@[a-z-]+[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, "");
      /* base rules only — a `:hover` or a descendant selector is a different rule. */
      const bases = [...src.matchAll(/^\s*(\.[a-zA-Z0-9_-]+)\s*\{/gm)].map((m) => m[1]);
      const seen = new Map<string, number>();
      for (const b of bases) seen.set(b, (seen.get(b) ?? 0) + 1);
      const dupes = [...seen].filter(([, n]) => n > 1).map(([sel, n]) => `${sel} ×${n}`);
      expect(bases.length, `${file} parsed no rules — the sweep is vacuous`).toBeGreaterThan(10);
      expect(dupes, `${file} declares a base selector more than once: ${dupes.join(", ")}`).toEqual([]);
    });
  }
});

describe("⚠️ the panel's chrome is not tinted, and the ladder starts below it", () => {
  const css = decls(readFileSync(join(HERE, "queryPanel.css"), "utf8"));
  const rule = (sel: string) => {
    const m = new RegExp(`(?:^|\\n)\\s*\\${sel}\\s*\\{([^}]*)\\}`).exec(css);
    return m ? m[1] : "";
  };

  it("the top bar states parchment and reads no band token", () => {
    const bar = rule(".qpn-bar");
    expect(bar, ".qpn-bar is missing").not.toBe("");
    expect(bar).toContain("#fdfaf5");
    /* ⚠️ THE BAR MAY NOT READ `--band-a`. That is the seam: the tint is set on the panel root so
       the BAND can paint it, and any other element reading it takes the query's colour. */
    expect(bar, "the top bar reads the ladder token").not.toContain("--band-a");
  });

  it("the band is the only thing that paints the ladder", () => {
    const readers = [...css.matchAll(/^\s*(\.[a-zA-Z0-9_.\s-]+?)\s*\{[^}]*var\(--band-a/gm)].map((m) => m[1].trim());
    expect(readers, `--band-a is read by ${readers.join(", ")}`).toEqual([".qpn-band"]);
  });

  it("⚠️ the progress track has its own name, and it is not the bar's", () => {
    expect(css, "the progress track is back on the top bar's class").not.toMatch(/(?:^|\n)\s*\.qpn-bar\s*\{[^}]*height:\s*7px/);
    expect(rule(".qpn-progbar"), "the progress track has no rule").toContain("7px");
  });
});
