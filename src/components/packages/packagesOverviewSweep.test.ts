/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ EVERY CLASS THIS SHEET DRESSES IS A CLASS SOMETHING RENDERS ═══════════════════════════════
 *
 * ⚠️ DEAD CSS IS INVISIBLE TO EVERY OTHER GATE. It does not error, it does not fail a test, and it
 * does not change a pixel — so it accumulates silently and the next reader takes it for a live knob.
 * §4 of the broadsheet pack retired the rail; the re-cut moved the problem statement into the hero.
 * Twenty rules outlived both, and the brief that finally noticed named exactly ONE of them
 * (`.pkgo-rail`). A sweep of the named rule would have left nineteen behind — which is why this
 * asserts the PROPERTY over the whole sheet rather than forbidding a list of retired names.
 *
 * ⚠️ AND IT SWEEPS FOR RENDERS, NOT FOR DECLARATIONS. The two questions look identical and are not:
 * grepping for `--x:` answers "was it written", grepping for `var(--x)` answers "is it read". The
 * same split applies to a class. `shellV2Tokens.test.ts` asserts the token half of this for the
 * shell sheets; this is the class half for the packages overview.
 *
 * ⚠️ THE MATCHER MUST SEE `className={`pkgo-num${…}`}`. A quote-and-space-bounded token match — the
 * house form, and the right one when the question is "is this exact class forbidden" — correctly
 * declines a token followed by an interpolation, because the rendered class is a concatenation and
 * not the token. Here the question is the opposite one ("is this class ever produced"), so the
 * backtick-then-`${` form has to count. Three live classes read as dead until it did:
 * `pkgo-num`, `pkgo-step` and `pkgo-tick` are all rendered that way and nothing else renders them.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");

const sheet = read("packagesOverview.css");
const onboarding = read("PackagesOnboarding.tsx");

/** Strip comments before asserting — this sheet's prose NAMES the classes it just retired. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** Every `.pkgo-…` class the sheet declares, base names only (modifiers resolve to their base). */
const declared = [...new Set(
  (decls(sheet).match(/\.pkgo-[a-z0-9-]+/g) ?? []).map((c) => c.slice(1)),
)].sort();

/**
 * Is `cls` ever produced by this component? Three forms count:
 *   class="pkgo-x"  ·  className={`a pkgo-x b`}  ·  className={`pkgo-x${cond ? " …" : ""}`}
 * The last is the one a bounded matcher misses.
 */
const rendered = (cls: string, src: string) =>
  new RegExp(`["\`\\s]${cls}(?=["\`\\s]|\\$\\{)`).test(src);

describe("packagesOverview.css declares nothing that has stopped rendering", () => {
  it("found a real population to check", () => {
    // ⚠️ A NEGATIVE CHECK OVER AN EMPTY SET PASSES. Assert the population before the property.
    expect(declared.length, "no .pkgo- selectors found — the matcher, not the sheet, is wrong")
      .toBeGreaterThanOrEqual(8);
    expect(onboarding).toContain("pkgo-");
  });

  it("every declared class is rendered by PackagesOnboarding, the sheet's only consumer", () => {
    const dead = declared.filter((c) => !rendered(c, onboarding));
    expect(dead, `dead rules in packagesOverview.css: ${dead.join(", ")}`).toEqual([]);
  });

  it("the retired layout is gone — rail, panels, registers, ghosts, back, problem statement", () => {
    const d = decls(sheet);
    for (const gone of [
      "pkgo-grid", "pkgo-rail", "pkgo-stage", "pkgo-panel", "pkgo-lbl", "pkgo-chip",
      "pkgo-add", "pkgo-body", "pkgo-back", "pkgo-ghost", "pkgo-gtitle", "pkgo-gsub",
      "pkgo-reg", "pkgo-row", "pkgo-type", "pkgo-comp", "pkgo-detail",
      "pkgo-prob", "pkgo-probsub", "pkgo-hand", "pkgo-hiwhead", "pkgo-hiwtag",
    ]) {
      expect(d, `${gone} is declared again`).not.toMatch(new RegExp(`\\.${gone}[\\s{,:]`));
    }
  });

  it("packagesFlow.css no longer modifies a base this sheet has stopped declaring", () => {
    // ⚠️ A MODIFIER ON A DELETED BASE IS DEAD TWICE OVER, and it lives in a DIFFERENT file — which
    // is how it survives a sweep of the file the brief named.
    const flow = decls(read("packagesFlow.css"));
    expect(flow).not.toMatch(/\.pkgo-/);
  });
});
