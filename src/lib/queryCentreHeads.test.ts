/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · the two columns' HEAD BAND — one hairline, one row beneath it.
 *
 * The list head and the pane's toolbar are different components in different columns of the
 * same frame, and the eye reads them as one band: their rules must be collinear, and the first
 * thing under each — the search field, the hero card — must start on one line.
 *
 * ⚠️ THIS IS A GEOMETRY LOCK ON TOKENS, NOT ON NUMBERS. The head used to be content-height
 * plus 8px of padding, so its rule sat wherever the type happened to land (~31px) against the
 * toolbar's fixed 48 — 16px apart, and moving with the label. Both now take --f12-headh, so
 * the alignment is structural: it cannot drift when the copy changes, which is exactly what
 * this file exists to stop anyone undoing.
 *
 * Browser-measured against the built CSS at a 1360px sheet, after the change:
 *   list rule 82 · pane rule 82                       (collinear)
 *   search 103 · Filter 103 · Sort 103 · hero 103     (one line)
 * and the rule holds at 82 for every label the helper can produce — "21 queries",
 * "Showing 12 of 21 queries", "1 query", "Showing 1 of 1 query", "0 queries".
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { listHeadLabel } from "./queryAmbient";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const indexCss = read("../index.css");
const queries = read("../components/Queries.tsx");

const rule = (sheet: string, selector: string): string => {
  const at = sheet.indexOf("\n" + selector + " {");
  return at < 0 ? "" : sheet.slice(at, sheet.indexOf("}", at) + 1);
};

/**
 * ⚠️ THE HEAD BAND HAS NO MEMBERS LEFT, AND THIS DESCRIBE IS RETIRED RATHER THAN LEFT PASSING.
 *
 * It locked the collinearity of two elements: the list column's own `.f12-lhtitle` heading and the
 * pane's `.f12-ctl` toolbar. The toolbar was retired an earlier pack ago (its six verbs went to the
 * hero's kebab); the heading goes with Pack B §1a, because it read "20 queries" directly beneath a
 * masthead stating the same figure. Neither renders anywhere.
 *
 * The CSS for both survives and is REPORTED as dead rather than deleted here — a housekeeping
 * commit's job, and the same call Pack A made about `.qr-ref`'s tokens. What must not survive is a
 * test that keeps passing while describing two elements the app no longer draws: a green assertion
 * about nothing is worse than no assertion, because it reads as coverage.
 *
 * `listHeadLabel` is in the same position — a pure helper with a full suite below and no caller.
 * Its cases are KEPT: they test the function, which is still correct, and they are what makes
 * bringing the heading back cheap if that is ever wanted.
 */
describe("the retired head band stays retired", () => {
  it("neither element renders, so neither rule has anything to align", () => {
    expect(queries, "the list column's own heading came back — the count would be stated twice")
      .not.toContain('className="f12-lhtitle"');
    expect(queries, "the pane toolbar came back — its verbs live in the hero's kebab")
      .not.toMatch(/className="f12-ctl[ "]/);
  });
});

describe("the row beneath each head starts on one line", () => {
  /* ⚠️ THE PAIRING IS GONE BECAUSE BOTH HALVES ARE (§1a, §1h). The head this measured against no
     longer renders. What is left worth asserting is that the header keeps the column's SIDE inset,
     which is what lines it up with the cards beneath it.

     ⚠️ AND THE SIDE INSET IS NOW READ ON ITS OWN, NOT AS A SHORTHAND SUBSTRING. This asserted the
     literal `margin: 0 20px`, which bundled two independent facts: the side inset (load-bearing —
     it is the alignment) and the top margin (incidental — it was 0 only because the band began
     where the masthead's rule ended). Fix pack 2 restored the contained plate, which takes a top
     gap, and the case failed for the one reason that was never its subject. Testing the shorthand
     tested more than the case meant. */
  it("the hero plate shares the pane's side inset", () => {
    expect(queries, "the hero card came back").not.toContain('className="f12-hero"');
    const m = /(?:^|;|\{)\s*margin\s*:\s*([^;}]+)/.exec(rule(css, ".f12-heroband"));
    expect(m, "the plate declares no margin at all").not.toBeNull();
    const parts = m![1].trim().split(/\s+/);
    /* one value = all round; two/three = the second is the side; four = the fourth is the left */
    const side = parts.length === 1 ? parts[0] : parts.length === 4 ? parts[3] : parts[1];
    expect(side, "the plate lost the 20px side inset that lines it up with the cards")
      .toBe("20px");
  });

  /* Tops can only agree if the heights do. Centred in the row, a 34px field sat 1px below the
     36px pills (104 vs 103) — and no margin can fix that while the heights differ: solving
     mt = (34 + 2·mt − 36) / 2 gives 0 = −1. Equal heights align top AND bottom.
     ⚠️ ASSERTED AS THE SAME TOKEN, NOT THE SAME NUMBER (§1c). Both used to restate `36px`, which
     held only while nobody moved either — and §1c moved both, to 34, to match the kebab. Two rules
     matching by literal agree until the day one is edited; two rules reading one token cannot
     disagree at all. So the case now tests the mechanism rather than the current value. */
  it("the search field is the pills' height, by reading the same token rather than the same number", () => {
    const inRow = rule(css, ".f12-lhead .f12-lsearch");
    const pill = rule(css, ".f12-pill");
    expect(inRow, "the in-row search override is missing").not.toBe("");
    expect(pill, "the pill rule is missing").not.toBe("");
    expect(inRow, "the field went back to a hand-matched number").toContain("height: var(--f12-icon-btn)");
    expect(pill, "the pill went back to a hand-matched number").toContain("height: var(--f12-icon-btn)");
  });

  it("the row centres, so a control that ever differs in height fails visibly rather than quietly", () => {
    expect(rule(css, ".f12-lhead")).toContain("align-items: center");
  });
});

describe("listHeadLabel — the count is the label", () => {
  it("states the total at rest", () => {
    expect(listHeadLabel(21, 21, false)).toBe("21 queries");
    expect(listHeadLabel(0, 0, false)).toBe("0 queries");
  });

  it("states both counts while narrowed", () => {
    expect(listHeadLabel(12, 21, true)).toBe("Showing 12 of 21 queries");
  });

  /* ⚠️ The form is keyed on the CONTROLS, never on shown !== total. A filter matching every
     query must still say it is filtering — otherwise the one case where the label could
     mislead you is the one case it goes quiet. */
  it("says 'Showing' even when the filter matched everything", () => {
    expect(listHeadLabel(21, 21, true)).toBe("Showing 21 of 21 queries");
  });

  it("the noun agrees with the total, in both forms", () => {
    expect(listHeadLabel(1, 1, false)).toBe("1 query");
    expect(listHeadLabel(1, 1, true)).toBe("Showing 1 of 1 query");
    expect(listHeadLabel(1, 21, true)).toBe("Showing 1 of 21 queries");
  });

  it("the page derives 'narrowed' from both doors — the popovers AND either search", () => {
    expect(queries).toContain(
      'const listNarrowed = activeFilterCount > 0 || (listSearch || searchQuery || "").trim() !== ""',
    );
  });
});
