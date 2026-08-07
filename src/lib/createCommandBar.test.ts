/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode · THE COMMAND-BAR TAKEOVER (ref design-refs/qdb-focus-spotlight.html).
 *
 * While a draft is open the record actions are REPLACED, not disabled: none of them applies to a
 * query that doesn't exist yet, and a row of dead buttons reads as breakage rather than as
 * context. Save and Cancel keep the exact handlers the retired pane footer called — a relocation,
 * not a rewire, which is the part a refactor could silently get wrong.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const pane = read("../components/queries/QueryCreatePane.tsx");
const css = read("../components/shell/f12.css");

const rule = (selector: string): string => {
  const at = css.indexOf("\n" + selector + " {");
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};
/** The create branch of the command bar. */
const bar = (): string => {
  // Re-anchored (Query Centre P3): the bar moved INTO the pane, so it is indented deeper and the
  // old closing anchor over-ran into the normal toolbar. End at the branch's own return instead.
  const at = queries.indexOf('className="f12-ctl f12-ctl-create"');
  if (at < 0) return "";
  // Bounded by the NORMAL toolbar that follows it — indentation moved when the bar went into
  // the pane, so an indentation-based anchor over-ran into the rest of the page.
  const end = queries.indexOf('className="f12-ctl"', at);
  return queries.slice(at, end > at ? end : at + 4000);
};

describe("the pane footer is GONE — one home per action", () => {
  it("no footer markup, no footer rule", () => {
    expect(pane, "the footer bar came back").not.toContain("qc-foot");
    expect(css, "the footer rule is still in the sheet").not.toContain(".qc-foot {");
  });

  it("the props that served it went too, so nothing can quietly re-render them", () => {
    for (const prop of ["onSave", "onCancel", "saving: boolean", "error: string | null"]) {
      expect(pane, `${prop} survives on the pane`).not.toContain(prop);
    }
    expect(queries, "the call site still passes footer props").not.toMatch(/<QueryCreatePane[\s\S]{0,400}onSave=/);
  });
});

describe("the bar swaps rather than disables", () => {
  it("create mode returns EARLY, before the record actions are built", () => {
    const branch = queries.indexOf("if (creating) {");
    const normal = queries.indexOf('<div className="f12-ctl">');
    expect(branch, "the create branch is missing").toBeGreaterThan(-1);
    expect(branch, "the branch must precede the normal bar, or both would render").toBeLessThan(normal);
  });

  it("none of the record actions is in the create bar", () => {
    const b = bar();
    expect(b, "the create bar markup is missing — every check below would be vacuous").not.toBe("");
    for (const verb of ["View tasks", "Mark closed", "Nudge", "Delete"]) {
      expect(b, `${verb} leaked into the create bar`).not.toContain(verb);
    }
  });

  it("carries the ref's anatomy: dot + title, requirement, Esc hint, Cancel, Save", () => {
    const b = bar();
    expect(b).toContain('className="qcb-ctx"');
    expect(b).toContain('className="qcb-dot"');
    expect(b).toContain("New query");
    expect(b).toContain("Needs an agent, a manuscript and a date");
    expect(b).toContain("Esc to cancel");
    expect(b).toContain("Cancel");
    expect(b).toContain("Save query");
  });
});

describe("the handlers are the SAME ones — relocation, not rewire", () => {
  it("Cancel still runs closeCreate (which owns the dirty-discard confirm)", () => {
    expect(bar()).toContain("onClick={() => closeCreate()}");
    // and closeCreate still asks before destroying work
    expect(queries).toContain('title: "Discard this query?"');
  });

  it("Save still runs saveCreate, still gated on the same readiness rule", () => {
    expect(bar()).toContain("onClick={saveCreate}");
    expect(bar()).toContain("disabled={!ready || createSaving}");
    expect(queries).toContain("const ready = createDraft ? draftReady(createDraft) : false;");
  });

  /* SUPERSEDED TWICE, and the second time removed the subject. Query Centre P3 moved the bar
     into the reading pane, so the buttons' own z-raise became dead weight carried by the lit
     pane. Create-mode v2 Phase 1 then deleted the scrim entirely — create mode focuses by
     collapsing the list to a rail, not by dimming the page — so there is nothing to be raised
     above at all. The assertion survives as the simplest form of itself: no raise, anywhere. */
  it("no z-raise anywhere — the scrim it ranked against is gone", () => {
    // Comments stripped: an assertion about the code must not be able to match prose about it.
    const code = bar().replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toContain("qh-lit");
    expect(code).not.toContain("z-index");
    expect(queries, "a dead raise came back").not.toContain("qh-lit");
  });
});

describe("the error state kept a home", () => {
  it("it takes the requirement line's slot rather than disappearing with the footer", () => {
    const b = bar();
    expect(b).toContain("createError ??");
    expect(b).toContain('createError ? " qcb-err" : ""');
    expect(rule(".qcb-err"), "the error styling is missing").toContain("var(--pink-i)");
  });
});

describe("at narrow widths the advisory copy yields, never the buttons", () => {
  it("the requirement line truncates, and hides below 1100px", () => {
    const req = rule(".qcb-req");
    expect(req, "the .qcb-req rule is missing").not.toBe("");
    expect(req).toContain("text-overflow: ellipsis");
    expect(req).toContain("min-width: 0");
    expect(css).toContain("@media (max-width: 1100px) { .qcb-req { display: none; } }");
  });

  it("Cancel and Save can neither shrink nor wrap", () => {
    const btns = rule(".f12-ctl-create .f12-btn-sec, .f12-ctl-create .f12-btn-pri");
    expect(btns, "the button rule is missing").not.toBe("");
    expect(btns).toContain("flex: none");
    expect(btns).toContain("white-space: nowrap");
  });
});
