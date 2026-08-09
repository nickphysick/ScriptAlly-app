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
  it("the question, the empty avatar and the field — centred, in that order", () => {
    const at = pane.indexOf('<div className="qc-ask">');
    expect(at, "the stage-1 block is missing").toBeGreaterThan(-1);
    const ask = pane.slice(at, pane.indexOf("</div>", pane.indexOf("qc-askfield")));
    expect(ask.indexOf("qc-askav")).toBeLessThan(ask.indexOf("Who are you querying?"));
    expect(ask.indexOf("Who are you querying?")).toBeLessThan(ask.indexOf("qc-askfield"));
    expect(rule(".qc-ask")).toContain("align-items: center");
    expect(rule(".qc-askav"), "the empty avatar must read as unfilled").toContain("dashed");
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
    const at = pane.indexOf('<div className="qc-stack"');
    expect(at).toBeGreaterThan(-1);
    expect(pane.slice(at, at + 60)).toContain('aria-hidden="true"');
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
