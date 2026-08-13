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

describe("the head band is one height, shared", () => {
  it("both tokens are defined — a var() that resolves to nothing drops the declaration silently", () => {
    expect(indexCss, "--f12-headh is read but never defined").toContain("--f12-headh: 48px");
    expect(indexCss, "--f12-headgap is read but never defined").toContain("--f12-headgap: 20px");
  });

  it("the list head and the pane toolbar take their height from the SAME token", () => {
    const head = rule(css, ".f12-lhtitle");
    const ctl = rule(css, ".f12-ctl");
    expect(head, "the list head rule is missing").not.toBe("");
    expect(ctl, "the toolbar rule is missing").not.toBe("");
    expect(head).toContain("height: var(--f12-headh)");
    expect(ctl).toContain("height: var(--f12-headh)");
    expect(ctl, "the toolbar restated the number instead of reading the token").not.toContain("height: 48px");
  });

  it("the head's height is what holds the rule — padding would let the type move it", () => {
    const head = rule(css, ".f12-lhtitle");
    expect(head, "padding-bottom is back; the rule will drift with the label")
      .not.toContain("padding-bottom");
    expect(head, "the head still closes with To-do's hairline").toContain("border-bottom: 1px solid #ece5d9");
  });
});

describe("the row beneath each head starts on one line", () => {
  it("the head's bottom margin and the hero's top margin are the same token", () => {
    expect(rule(css, ".f12-lhtitle")).toContain("margin-bottom: var(--f12-headgap)");
    expect(queries, "the hero went back to a hand-matched 20px — it must read the token")
      .toContain('margin: "var(--f12-headgap) 20px 0"');
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
