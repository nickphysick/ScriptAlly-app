/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The wiring guard, applied to Comparable titles.
 *
 * ⚠️ WRITTEN BEFORE THE FIXES AND VERIFIED RED AGAINST THEM (v3). At the moment it landed it failed
 * on `--ct-scout-band-a` / `-b` / `-tile` (defined, read by nothing) and on `.ct-kbd` (rendered,
 * swept from the stylesheet). Both had passed a green value-assertion — see styleWiring.ts.
 *
 * ⚠️ RETARGETED (comps v2, 27 Sep): the page is rebuilt on `compsV2.css` with the `cpv-` prefix and
 * split across six components, so the guard reads THAT sheet against ALL of them — a class rendered
 * by the card or the form with no rule is exactly as silent as one rendered by the page. The v3
 * `ct-` sheet (comps.css) now serves only the unmounted ScoutPanel and the unmounted marketing blocks.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { definedTokens, readTokens, renderedClasses, styledClasses } from "../../lib/styleWiring";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "compsV2.css"), "utf8");
const FILES = ["ComparableTitlesPage.tsx", "CompCard.tsx", "CompForm.tsx", "CompsQueryLine.tsx"];
const tsx = FILES.map((f) => readFileSync(join(here, f), "utf8")).join("\n");

describe("compsV2.css — every token it defines is read", () => {
  it("defines no token that nothing consumes", () => {
    const defined = definedTokens(css, "cpv-");
    const read = new Set(readTokens([css, tsx], "cpv-"));
    const orphans = defined.filter((t) => !read.has(t));
    expect(orphans, `defined and never read: ${orphans.join(", ")}`).toEqual([]);
  });
});

describe("compsV2.css — every class the page renders has a rule", () => {
  it("renders no cpv- class the stylesheet does not style", () => {
    const styled = new Set(styledClasses(css, "cpv-"));
    const unstyled = renderedClasses(tsx, "cpv-").filter((c) => !styled.has(c));
    expect(unstyled, `rendered with no rule: ${unstyled.join(", ")}`).toEqual([]);
  });

  /** ⚠️ AND THE GUARD MUST BE READING SOMETHING — both halves above pass on empty extractions. */
  it("is actually extracting classes and tokens, not passing on empty sets", () => {
    expect(renderedClasses(tsx, "cpv-").length).toBeGreaterThan(30);
    expect(definedTokens(css, "cpv-").length).toBeGreaterThan(10);
    expect(styledClasses(css, "cpv-").length).toBeGreaterThan(30);
  });

  /** an `id` is not a class — the form's inputs carry `id="cpv-f-title"` and friends */
  it("does not mistake an id for a class", () => {
    expect(tsx).toContain('id="cpv-f-title"');
    expect(renderedClasses(tsx, "cpv-")).not.toContain("cpv-f-title");
  });
});
