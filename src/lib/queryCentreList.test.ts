/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · P2 — the editorial query list (ref design-refs/query-centre-final.html).
 *
 * The head REUSES To-do's values rather than approximating them, and that distinction is the
 * lock: Playfair 17/700 + a mono count over a 1px #ece5d9 warm hairline, exactly as todo.css
 * draws its section heads. The ref shows a 2px ink rule — that is the AGENT LIST's grouping
 * treatment, and the live To-do grammar wins here.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const todoCss = read("../components/todo/todo.css");
const queries = read("../components/Queries.tsx");

const rule = (sheet: string, selector: string): string => {
  const at = sheet.indexOf("\n" + selector + " {");
  return at < 0 ? "" : sheet.slice(at, sheet.indexOf("}", at) + 1);
};

describe("the head reuses To-do's values, it does not approximate them", () => {
  it("Playfair 17/700 — the same numbers todo.css uses", () => {
    const mine = rule(css, ".f12-lhtitle h2");
    const theirs = rule(todoCss, ".tdb-sec h2");
    expect(mine, "the head rule is missing").not.toBe("");
    for (const v of ["var(--f12-serif)", "font-size: 17px", "font-weight: 700"]) {
      expect(mine, `head lost ${v}`).toContain(v);
      expect(theirs, `To-do no longer uses ${v} — the two have drifted apart`).toContain(v);
    }
  });

  it("the rule is To-do's 1px warm hairline, NOT the agent list's 2px ink rule", () => {
    const head = rule(css, ".f12-lhtitle");
    expect(head).toContain("border-bottom: 1px solid #ece5d9");
    expect(todoCss, "To-do's hairline moved — reuse means these track each other").toContain("#ece5d9");
    expect(head, "the ref's 2px ink rule must not arrive here").not.toContain("2px solid var(--ink)");
  });

  /* ⚠️ SUPERSEDED, recorded rather than deleted: the count USED to be a separate mono figure
     beside the title ("Your queries" · 21), reusing To-do's head grammar wholesale. It is now
     part of the sentence — "21 queries" / "Showing 12 of 21 queries" — so there is no trailing
     figure left to style and the mono rule is gone with the span. What survives from To-do is
     the Playfair 17/700 and the warm hairline, asserted above; only the count moved. */
  it("the count is INSIDE the label now — no separate mono figure", () => {
    expect(rule(css, ".f12-lhtitle .f12-lhcount"), "the dead count rule is still in the sheet").toBe("");
    expect(queries, "the count span outlived its rule").not.toContain('className="f12-lhcount"');
    expect(queries, "the head must read the shared label helper, not build a string inline")
      .toContain("listHeadLabel(sortedList.length, queries.length, listNarrowed)");
  });
});

describe("the list is de-carded", () => {
  it("it is no longer a .f12-pane in either branch", () => {
    expect(queries, "the list is still carded").not.toContain('className="f12-pane f12-list"');
    expect(queries.match(/className="f12-list"/g)?.length ?? 0).toBe(2);
  });

  it("and .f12-list paints nothing of its own", () => {
    const list = rule(css, ".f12-list");
    for (const prop of ["background", "border:", "box-shadow"]) {
      expect(list, `.f12-list still carries ${prop} — it should be a bare column`).not.toContain(prop);
    }
    expect(list).toContain("display: flex");
    expect(list).toContain("min-height: 0");
  });
});

describe("the selected row wears a bookmark, not a full-height edge", () => {
  it("3px of ink, inset from top and bottom, with rounded ends", () => {
    const sel = rule(css, ".f12-row.f12-sel");
    const mark = rule(css, ".f12-row.f12-sel::before");
    expect(sel, "the tint stays").toContain("background: var(--blue-t)");
    expect(sel, "the full-height inset edge should be gone").not.toContain("inset 3px 0 0");
    expect(mark, "the bookmark is missing").not.toBe("");
    expect(mark).toContain("width: 3px");
    expect(mark).toContain("top: 9px");
    expect(mark).toContain("bottom: 9px");
    expect(mark).toContain("border-radius: 0 3px 3px 0");
  });
});
