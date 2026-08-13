/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The wiring guard, applied to Comparable titles.
 *
 * ⚠️ WRITTEN BEFORE THE FIXES AND VERIFIED RED AGAINST THEM. At the moment this file landed it
 * failed on `--ct-scout-band-a` / `-b` / `-tile` (defined in three themes, read by nothing, so both
 * cards drew the sage band) and on `.ct-kbd` (rendered by the add row, swept from the stylesheet, so
 * the key hint drew as bare text). Both had passed a green value-assertion — see styleWiring.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  definedTokens,
  readTokens,
  renderedClasses,
  styledClasses,
} from "../../lib/styleWiring";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "comps.css"), "utf8");
const tsx = readFileSync(join(here, "ComparableTitlesPage.tsx"), "utf8");

describe("comps.css — every token it defines is read", () => {
  /**
   * ⚠️ THE DIRECTION THE EXISTING GUARD DOES NOT COVER. `compsTokens.test.ts` already asserts that
   * no rule reads a token that does not exist. This is the other way round, and neither implies the
   * other: a token can be defined, correct, asserted, and wired to nothing.
   */
  it("defines no token that nothing consumes", () => {
    const defined = definedTokens(css, "ct-");
    /* the TSX is scanned too — a token may legitimately be read from an inline style */
    const read = new Set(readTokens([css, tsx], "ct-"));
    const orphans = defined.filter((t) => !read.has(t));
    expect(orphans, `defined and never read: ${orphans.join(", ")}`).toEqual([]);
  });
});

describe("comps.css — every class the page renders has a rule", () => {
  /**
   * ⚠️ A CLASS WITH NO RULE FAILS SILENTLY AND LOOKS LIKE A DESIGN CHOICE. `.ct-kbd` drew the `N`
   * hint as bare text for a whole review cycle; nothing errors, nothing logs, and the element is
   * present in the DOM exactly as the lock expected.
   */
  it("renders no ct- class the stylesheet does not style", () => {
    const styled = new Set(styledClasses(css, "ct-"));
    const unstyled = renderedClasses(tsx, "ct-").filter((c) => !styled.has(c));
    expect(unstyled, `rendered with no rule: ${unstyled.join(", ")}`).toEqual([]);
  });

  /**
   * ⚠️ AND THE GUARD MUST BE READING SOMETHING. Both halves above pass trivially against an empty
   * extraction, which is how a lock that has quietly stopped matching goes on reporting success —
   * the failure mode the string-spec audit is about. These pin the extractors to real counts.
   */
  it("is actually extracting classes and tokens, not passing on empty sets", () => {
    expect(renderedClasses(tsx, "ct-").length).toBeGreaterThan(30);
    expect(definedTokens(css, "ct-").length).toBeGreaterThan(20);
    expect(styledClasses(css, "ct-").length).toBeGreaterThan(30);
  });

  /** an `id` is not a class — the form's inputs carry `id="ct-comp-title"` and friends */
  it("does not mistake an id for a class", () => {
    expect(tsx).toContain('id="ct-f-title"');
    expect(renderedClasses(tsx, "ct-")).not.toContain("ct-f-title");
  });
});
