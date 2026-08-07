/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode v2 · P3 — THE ILLUSTRATED HEADER (ref design-refs/qc-create-v2.html).
 *
 * Replaces the create-mode command bar. That bar squeezed the job, the requirement, an Esc hint
 * and two buttons into one 48px pane row, where the advisory copy had to truncate and then
 * vanish entirely below 1100px to protect the buttons — the line that also carried save errors.
 * The band gives the same information room and keeps the error visible at every width.
 *
 * ⚠️ THE PANE TOOLBAR IS HIDDEN, NOT DISABLED. None of the record verbs (View tasks, Edit,
 * Nudge, Mark closed…) applies to a query that does not exist yet, and a row of greyed buttons
 * is chrome that states nothing. The header IS the create view's action surface; two surfaces
 * would be two homes for one job.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");

const rule = (selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
  if (!m) return "";
  const open = css.indexOf("{", m.index);
  return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
};

/* ⚠️ INHERITED from createCommandBar.test.ts, which this file supersedes and replaces. The
   footer retirement is a SEPARATE and still-live decision: the create pane had its own Save /
   Cancel footer before the bar existed, and it must not grow one back now that the header is
   the single action surface. Two retirements, one rule — one home per action. */
describe("the pane footer is GONE — one home per action", () => {
  const paneSrc = read("../components/queries/QueryCreatePane.tsx");

  it("no footer markup, no footer rule", () => {
    expect(paneSrc, "the footer bar came back").not.toContain("qc-foot");
    expect(css, "the footer rule is still in the sheet").not.toContain(".qc-foot {");
  });

  it("the props that served it went too, so nothing can quietly re-render them", () => {
    for (const prop of ["onSave", "onCancel", "saving: boolean", "error: string | null"]) {
      expect(paneSrc, `${prop} survives on the pane`).not.toContain(prop);
    }
    expect(queries, "the call site still passes footer props").not.toMatch(/<QueryCreatePane[\s\S]{0,400}onSave=/);
  });
});

describe("the command bar is retired, not restyled", () => {
  it("create mode returns no toolbar at all", () => {
    expect(queries).toContain("if (creating) return null;");
  });

  for (const dead of [".f12-ctl-create", ".qcb-ctx", ".qcb-req", ".qcb-esc", ".qcb-err", ".qcb-dot"]) {
    it(`${dead} is gone from the stylesheet`, () => {
      // The retirement note names the classes in prose; strip comments before asserting, or the
      // test matches its own explanation.
      const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
      expect(bare, `${dead} outlived the bar`).not.toContain(dead);
    });
  }

  it("and from the page", () => {
    expect(queries).not.toContain("qcb-");
    expect(queries).not.toContain("f12-ctl-create");
  });
});

describe("the header band", () => {
  it("carries the committed icon at 64px, decoratively", () => {
    expect(queries).toContain('src="/Log_Query_Icon.png"');
    expect(queries, "the icon must be alt-empty — the title beside it is the label").toContain('alt=""');
    expect(rule(".qch-ill")).toContain("width: 64px");
    expect(rule(".qch-ill"), "a non-square source must not stretch").toContain("object-fit: contain");
  });

  it("title is Playfair, subtitle is the italic serif", () => {
    expect(queries).toContain("Logging new query");
    expect(rule(".qch-title")).toContain("font-family: var(--f12-serif)");
    expect(rule(".qch-sub")).toContain("font-style: italic");
  });

  it("the four actions, in the ref's order and weights", () => {
    const at = queries.indexOf('<div className="qch-acts">');
    expect(at, "the action cluster is missing").toBeGreaterThan(-1);
    const acts = queries.slice(at, queries.indexOf("</div>", queries.indexOf("Save query")));
    expect(acts.indexOf("qch-esc")).toBeLessThan(acts.indexOf("Cancel"));
    expect(acts.indexOf("Cancel")).toBeLessThan(acts.indexOf("Save &amp; log another"));
    expect(acts.indexOf("Save &amp; log another")).toBeLessThan(acts.indexOf("Save query"));
    // Save & log another is the QUIET one — a continuation, not a peer of the ordinary ending.
    expect(acts).toContain('className="qch-tert"');
    expect(rule(".qch-tert"), "the tertiary grew a fill or a border").toContain("background: none");
    expect(acts, "the primary is the soft-pink house button").toContain('className="f12-btn-pri"');
  });

  /* ⚠️ ONE GATE, READ TWICE. Both saves must agree about readiness; a second inline
     draftReady(createDraft) beside one of them is how they would stop agreeing. */
  it("both saves read the same readiness derivation", () => {
    expect(queries).toContain("const createReady = createDraft ? draftReady(createDraft) : false;");
    expect(queries.match(/disabled=\{!createReady \|\| createSaving\}/g)?.length).toBe(2);
  });

  /* onClick={saveCreate} would hand the click event in as `logAnother` — truthy, so every
     ordinary save would silently become a batch save. tsc caught it once; this keeps it caught. */
  it("the saves are wrapped, never passed as the handler itself", () => {
    expect(queries).toContain("onClick={() => saveCreate()}");
    expect(queries).toContain("onClick={() => saveCreate(true)}");
    expect(queries, "the event would arrive as the batch flag").not.toContain("onClick={saveCreate}");
  });
});

describe("the error rehomes to the subtitle", () => {
  it("one line does both jobs, and the error is burgundy", () => {
    expect(queries).toContain("{createError ?? \"Needs an agent, a manuscript and a date — everything else can wait.\"}");
    expect(queries).toContain("`qch-sub${createError ? \" qch-err\" : \"\"}`");
    expect(rule(".qch-err")).toContain("color: var(--pink-i)");
  });

  /* ⚠️ THE LIVE REGION IS PERMANENT, not a role switched on when the error arrives. A live
     region announces CHANGES after first render — so the static subtitle is NOT read on mount,
     but the swap to an error is. Adding role="alert" to an element already in the tree is
     unreliably announced across screen readers, which is the failure mode this avoids. */
  it("the swap is announced — a replaced line is otherwise silent", () => {
    expect(queries).toContain('aria-live="assertive"');
    expect(queries, "the line replaces its text rather than appending, so it must be atomic")
      .toContain('aria-atomic="true"');
  });

  it("the subtitle survives every width, because it is also the error slot", () => {
    const narrow = css.slice(css.indexOf("@media (max-width: 1100px) { .qch"));
    expect(narrow, "the old bar hid its requirement line below 1100px; this must not").toContain(".qch-sub { display: none; }");
    const mobile = css.slice(css.indexOf("@media (max-width: 767.98px) {"));
    expect(mobile, "below md the error must come back — it is the only report of a failed save")
      .toContain(".f12-root .qch-sub { display: block; }");
  });
});
