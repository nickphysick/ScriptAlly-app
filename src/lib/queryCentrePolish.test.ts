/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre — the polish pass (ref design-refs/104-query-centre-final.html).
 *
 * ⚠️ THE MEASURED HALF LIVES IN `tests/e2e/qcControlRow.measure.ts`, NOT HERE. This repo's vitest
 * runs in `environment: 'node'` and reads SOURCE — it can prove a rule was written, never that it
 * rendered. "The row fits at four widths" is a question about a laid-out page and is asked of the
 * real app; what belongs here is the rule the measurement is a check ON, so that changing the rule
 * fails immediately rather than at the next deploy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");
const code = queries.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");

/** The FULL rule for a selector — every block, joined. A first-match slice reads whichever block
 *  comes first, which in this stylesheet has silently repointed a lock twice. */
const rule = (sel: string): string => {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf("\n" + sel + " {", from);
    if (at < 0) break;
    const end = css.indexOf("}", at) + 1;
    out.push(css.slice(at, end));
    from = end;
  }
  return out.join("\n");
};
const declValue = (r: string, prop: string): string => {
  const body = r.replace(/\/\*[\s\S]*?\*\//g, "");
  const m = new RegExp("(?:^|;|\\{)\\s*" + prop + "\\s*:\\s*([^;}]+)").exec(body);
  return m ? m[1].trim() : "";
};

describe("§3 · one button rule, app-wide on this page", () => {
  it("the three values are TOKENS, declared once", () => {
    /* ⚠️ TOKENS RATHER THAN THREE MATCHED NUMBERS. §1's control cells read `--btn-h` for their
       min-height, so the heads stay on one line whatever the height becomes; a literal here would
       agree today and drift the first time anyone tuned the button. */
    expect(css, "the button tokens are gone").toContain("--btn-h: 32px; --btn-r: 8px; --btn-line: #e2d8ca;");
  });

  it("the base button reads them, and states one rim and one hover", () => {
    const r = rule(".qc-btn");
    expect(r, "the button rule is missing").not.toBe("");
    expect(declValue(r, "height"), "the height stopped being the token").toBe("var(--btn-h)");
    expect(declValue(r, "border-radius"), "the radius stopped being the token").toBe("var(--btn-r)");
    expect(declValue(r, "font-size"), "the type size moved off 12px").toBe("12px");
    expect(declValue(r, "font-weight"), "the weight moved off 500").toBe("500");
    expect(declValue(r, "gap"), "the icon gap moved off 7px").toBe("7px");
    expect(declValue(r, "border"), "the rim is not the single border colour").toContain("var(--btn-line)");
    expect(declValue(rule(".qc-btn svg"), "width"), "the icon moved off 13px").toBe("13px");
  });

  /**
   * ⚠️ ONE EXCEPTION, AND IT IS NOT BURGUNDY. Burgundy means OUTGOING in the StatusDot system — it
   * is on this very page, on every waiting row's dot — so a primary wearing it would borrow a
   * colour that already says something else, and the two meanings would be told apart by position.
   */
  it("Record response is the only filled control, in pink with black ink", () => {
    const r = rule(".qc-btn-pri");
    expect(r, "the primary rule is missing").not.toBe("");
    expect(declValue(r, "background"), "the primary is not on the page's pink").toBe("var(--pink-t)");
    expect(declValue(r, "border-color"), "the primary's rim is not the pink's own darker step").toBe("var(--pink-b)");
    expect(declValue(r, "color"), "the primary's ink is not full-strength — the pack says black").toBe("var(--ink)");
    expect(declValue(r, "background"), "the primary went burgundy").not.toContain("--burg");
    /* and nothing else on the page is filled: the quiet buttons are white with a rim */
    expect(declValue(rule(".qc-btn"), "background"), "the base button grew a fill").toBe("var(--white)");
  });

  it("the header's Export and Log query follow it, and only on this page", () => {
    const r = rule(".qc-wpg .svh-btn");
    expect(r, "the header override is missing — the two would stay at 38px/13px").not.toBe("");
    expect(declValue(r, "height"), "the header buttons are not on the shared height").toBe("var(--btn-h)");
    expect(declValue(r, "border-radius"), "the header buttons are not on the shared radius").toBe("var(--btn-r)");
    /* ⚠️ SCOPED. `.svh-btn` is ten pages; retuning it to satisfy one would move the other nine. */
    const shell = read("../components/shell/pageHeader.css");
    expect(shell, "the shell's own button height was changed — that is every page, not this one").toContain("height: 38px");
  });

  /**
   * ⚠️ THE PRIMARY NEVER SHEDS ITS LABEL. The three secondaries are recognisable as icons and give
   * the width back; the one that names what you are about to do keeps its words at every size.
   */
  it("below ~1300 the three secondaries shed their labels, and the primary is not among them", () => {
    expect(css, "the narrow rule is gone").toMatch(/@media \(max-width: 1299\.98px\) \{[\s\S]*?\.qc-phead \.qc-btn-shrink span \{ display: none; \}/);
    const cell = code.indexOf('className="qc-phead"');
    const row = code.slice(cell, code.indexOf("})() : null}", cell));
    expect(row, "the slice is empty — this case is testing nothing").toContain("qc-btn");
    /* the primary does not carry the shrinking modifier … */
    expect(row, "the primary was given the shrinking modifier — it would lose its label at 1280")
      .not.toMatch(/qc-btn qc-btn-pri[^"]*qc-btn-shrink/);
    /* … and exactly three controls do */
    expect((row.match(/qc-btn-shrink/g) || []).length, "the shrinking set is not the three secondaries").toBe(3);
  });
});
