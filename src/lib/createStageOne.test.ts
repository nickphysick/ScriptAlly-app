/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode v3 · P3 — STAGE 1: ONE QUESTION (ref design-refs/qc-create-steps.html).
 *
 * Before an agent is chosen the pane asks exactly one thing, centred, with nothing competing for
 * the answer. The three sections wait beneath as GHOST ROWS — anatomy without interrogation: you
 * can see what will be asked without being asked it yet.
 *
 * Browser-verified against the built CSS: dashed 54px avatar, Playfair 24px question, the picker
 * capped at 420px, and three dimmed rows with hollow ticks.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { STEP_ORDER, STEP_HINT, STEP_SHORT } from "./createSteps";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const pane = read("../components/queries/QueryCreatePane.tsx");
const queries = read("../components/Queries.tsx");

const rule = (selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
  if (!m) return "";
  const open = css.indexOf("{", m.index);
  return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
};

describe("stage 1 asks one question", () => {
  /* ⚠️ SUPERSEDED: a centred single column with a dashed empty avatar above the question. Stage
     1 now uses the SAME two-column geometry as stage 2, so choosing an agent replaces the right
     column's content rather than introducing a column — nothing jumps under the pointer at the
     moment of choosing. The avatar went with the centring; it was decoration for a layout that
     no longer exists. */
  it("the question and the field, in a left column the same width as stage 2's", () => {
    expect(pane, "the dashed empty avatar came back").not.toContain("qc-askav");
    expect(pane).toContain('<div className="qc-form qc-form-ask');
    expect(pane.indexOf("Who are you querying?")).toBeLessThan(pane.indexOf("qc-askfield"));
    expect(rule(".qc-form"), "both stages share the 52% column").toContain("flex: 0 0 52%");
  });

  it("the field is bordered, lifted and takes the caret on arrival", () => {
    expect(pane, "the only thing being asked should already be focused").toContain("autoFocus");
    expect(rule(".qc-askfield .f12-lsearch")).toContain("box-shadow");
  });

  /* ⚠️ REUSED, NEVER REBUILT. AgentSearchField already owns the typeahead, the highlighted-Enter
     selection and the "Agent not listed? Add a new agent now" quick-add. Rebuilding any of it
     here would fork three behaviours at once — and the Enter selection is P5's keyboard flow. */
  it("the picker is the shared field, and the quick-add comes with it", () => {
    expect(pane).toContain("<AgentSearchField");
    expect(read("../components/AgentSearchField.tsx"), "the quick-add line moved or was renamed")
      .toContain("Agent not listed?");
  });

  it("choosing an agent re-derives the materials from what THEY ask for", () => {
    expect(pane).toContain("set({ agentId: a.id, materials: materialRowsForDraft(a) })");
  });
});

describe("the ghost rows show anatomy without asking anything", () => {
  it("all three sections render, from the shared vocabulary", () => {
    expect(pane).toContain("STEP_ORDER.map");
    expect(pane).toContain("STEP_SHORT[id]");
    expect(pane).toContain("STEP_HINT[id]");
    for (const id of STEP_ORDER) {
      expect(STEP_HINT[id], `${id} has no ghost hint`).toBeTruthy();
      expect(STEP_SHORT[id]).toBeTruthy();
    }
  });

  it("they wear the upcoming treatment: dimmed, hollow tick, no Change", () => {
    expect(pane).toContain('className="qc-sec qc-up"');
    expect(rule(".qc-sec.qc-up")).toContain("opacity: 0.45");
    const tick = rule(".qc-sec.qc-up .qc-tick");
    expect(tick).toContain("background: transparent");
    expect(tick, "a hollow tick, not a ticked one").toContain("color: transparent");
  });

  /* They are decoration at this point — a screen reader announcing three sections that ask
     nothing yet would be describing furniture, not offering a choice. */
  it("and they are hidden from assistive tech until they can be answered", () => {
    const at = pane.indexOf('<div className="qc-stack qc-ghosts"');
    expect(at, "the ghost stack is missing").toBeGreaterThan(-1);
    expect(pane.slice(at, at + 80)).toContain('aria-hidden="true"');
  });

  /* They sit where the real stack will sit, so the eye does not have to relearn the column. */
  it("and they sit at the foot of the column, where the real stack will be", () => {
    expect(rule(".qc-ghosts")).toContain("margin-top: auto");
  });
});

describe("the requirement pips", () => {
  it("live in the header and read the draft, not the steps", () => {
    expect(queries).toContain("requirements(createDraft).map");
    expect(queries, "the pips must come from the shared derivation")
      .toContain('import { requirements } from "../lib/createSteps"');
  });

  it("a met requirement is sage; an open one is a hollow ring", () => {
    expect(rule(".qch-rq.qch-on .qch-c")).toContain("#7e9178");
    expect(rule(".qch-c"), "the unmet pip must read as empty").toContain("border: 1.5px solid #cfc3b1");
  });

  /* ⚠️ The tick is the BAND sage. index.css locks --sage / --sageC / --sageD to StatusDots, and
     a requirement pip is not a query status — borrowing that trio would put the status palette
     on a piece of form chrome. */
  it("the tick does not borrow the StatusDot palette", () => {
    const r = rule(".qch-rq.qch-on .qch-c");
    for (const tok of ["var(--sage)", "var(--sageC)", "var(--sageD)"]) {
      expect(r, `the pip borrowed ${tok}, which belongs to StatusDots`).not.toContain(tok);
    }
  });

  /* The subtitle above is already an assertive live region. A second announcer on the same line
     of chrome would talk over it on every keystroke. */
  it("they are not a second live region", () => {
    const at = queries.indexOf('<div className="qch-reqs">');
    expect(at).toBeGreaterThan(-1);
    const pips = queries.slice(at, queries.indexOf("</div>", queries.indexOf("qch-rq")));
    expect(pips).not.toContain("aria-live");
    expect(pips).not.toContain('role="status"');
  });
});

/* ══ QUICK PICKS — stage 1's right column ══════════════════════════════════════════════════ */
describe("quick picks", () => {
  it("the panel names what it is and what it filtered by", () => {
    expect(pane).toContain("From your contact list");
    expect(pane).toContain("Never queried");
  });

  it("each row is a real button — clicking one is the same door as typing a name", () => {
    expect(pane).toContain('className="qc-qrow"');
    expect(pane).toContain("onClick={() => pickAgent(a)}");
  });

  it("monogram, Playfair name, mono agency, mono added-date", () => {
    for (const cls of ["qc-qmg", "qc-qwho", "qc-qag", "qc-qadded"]) {
      expect(pane, `${cls} is missing from the row`).toContain(cls);
    }
    expect(rule(".qc-qwho b")).toContain("var(--f12-serif)");
    expect(rule(".qc-qag")).toContain("var(--f12-mono)");
  });

  /* ⚠️ NEVER AN EMPTY PANEL AND NEVER A "NO RESULTS" LINE. Both empty cases are ordinary — a new
     account, or a writer who has queried everyone — and one of them is an achievement. */
  it("empty falls back to art, holding the column so the geometry survives", () => {
    expect(pane).toContain("picks.length > 0 ? (");
    expect(pane).toContain('<ArtSlot name="no-quick-picks"');
    // Comments stripped: this file EXPLAINS why there is no such message, and an assertion
    // about the code must not be able to match prose about the code.
    const bare = pane.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/\/\/[^\n]*/g, "");
    expect(bare, "a no-results message would report an ordinary state as a failure")
      .not.toMatch(/no results|nothing found|no agents/i);
  });
});
