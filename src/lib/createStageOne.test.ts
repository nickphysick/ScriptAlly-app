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
    /* ⚠️ AMENDED: `.qc-askfield` was the legacy field's wrapper and went with it. The question now
       sits above the PICKER, which is the only search on the page. */
    expect(pane.indexOf("Who are you querying?")).toBeLessThan(pane.indexOf("<AgentPicker"));
    /* ⚠️ STAGE 1 TAKES THE WHOLE WIDTH — it has no panel beside it, and the grid needs the room.
       Stage 2's flow takes the remainder beside a fixed 322px panel. */
    expect(rule(".qc-two-solo > .qc-form"), "stage 1 must not be held at half width")
      .toContain("flex: 1 1 0");
    expect(rule(".qc-form"), "stage 2's flow must take the remainder").toContain("flex: 1 1 0");
  });

  it("the field is bordered, lifted and takes the caret on arrival", () => {
    expect(pane, "the only thing being asked should already be focused").toContain("autoFocus");
    expect(rule(".qc-askfield .f12-lsearch")).toContain("box-shadow");
  });

  /* ⚠️ REUSED, NEVER REBUILT. AgentSearchField already owns the typeahead, the highlighted-Enter
     selection and the "Agent not listed? Add a new agent now" quick-add. Rebuilding any of it
     here would fork three behaviours at once — and the Enter selection is P5's keyboard flow. */
  it("the picker is the shared field, and the quick-add comes with it", () => {
    expect(read("../components/queries/AgentPicker.tsx")).toContain("<AgentQuickAdd");
    expect(read("../components/queries/AgentQuickAdd.tsx"), "the quick-add form moved or was renamed")
      .toContain("Add and select");
  });

  /* ⚠️ EVERYTHING SEEDED FROM THE AGENT IS RE-DERIVED TOGETHER — the materials checklist, the
     nudge interval and the send method all come from their record, so leaving any one of them on
     the previous agent's figure would attribute it to the new one. A CUSTOM nudge date survives:
     the writer chose an absolute day, and swapping agent is not a reason to overwrite it. */
  it("choosing an agent re-derives everything seeded from them", () => {
    expect(pane).toContain("materials: materialRowsForDraft(a)");
    expect(pane).toContain("sendMethod: a.submissionMethod ?? draft.sendMethod");
    expect(pane).toContain('reminder: draft.reminder.kind === "custom" ? draft.reminder : initialReminder(a)');
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
    expect(queries).toContain("requirements(");
    expect(queries, "the pips must come from the shared derivation")
      .toContain('import { requirements } from "../lib/createSteps"');
    expect(queries, "the baseline is what tells pre-filled from answered").toContain("createBase,");
  });

  /* ⚠️ THREE MARKS, NOT TWO. A solid green tick beside Manuscript and Date claimed the writer had
     completed what openCreate merely pre-filled — so the one item that genuinely needed them read
     as one open thing among three settled ones. Outlined = answered FOR you and still editable;
     solid = answered BY you; an open ring = nothing recorded. */
  it("pre-filled is outlined, answered is solid, and empty is a hollow ring", () => {
    const pre = rule(".qch-rq.qch-prefilled .qch-c");
    expect(pre, "pre-filled must not be a filled tick").toContain("background: transparent");
    expect(pre, "but it is still sage — it IS answered").toContain("#7e9178");
    expect(rule(".qch-rq.qch-answered .qch-c")).toContain("background: #7e9178");
    expect(rule(".qch-c"), "the unmet pip must read as empty").toContain("border: 1.5px solid #cfc3b1");
    expect(rule(".qch-rq.qch-on .qch-c"), "the old one-tick rule must be gone").toBe("");
  });

  /* A tick with no value says a category is settled without saying what settled it. */
  it("and every row states its value", () => {
    expect(queries).toContain('<b className="qch-v">{r.value}</b>');
    expect(rule(".qch-v")).toContain("font-weight: 600");
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

/* ══ STAGE 1'S RIGHT-HAND QUICK PICKS ARE RETIRED ═══════════════════════════════════════════
   They were a five-row list in a second column, kept there so stage 1 and stage 2 shared a
   geometry. The picker grid supersedes them at full width — matching geometry was never worth a
   column of suggestions nobody asked for — and everything those rows proved (derivation, the
   one-door rule, the two ordinary empty states) now lives in agentPicker.test.ts.

   What must NOT come back is the second column: stage 1 has no reference panel, so a right-hand
   column would be a frame around whichever spare thing was put in it. */
describe("stage 1 is one column", () => {
  it("no second column, and no quick-picks list", () => {
    expect(pane).toContain('className="qc-two qc-two-solo"');
    expect(pane, "the quick-picks list came back").not.toContain("qc-qrow");
    expect(pane, "the art column came back").not.toContain("qc-qpart");
  });

  /* ⚠️ ART BELONGS TO AN EMPTY ADDRESS BOOK AND NOWHERE ELSE. In the un-queried or all-queried
     states it would decorate a space the grid is meant to fill, and it would stop meaning "there
     is nothing here yet" — the one thing it is for. */
  it("and the pane itself renders no art at all — the picker owns that decision", () => {
    expect(pane, "art in the pane cannot know which of the three states it is in")
      .not.toContain("<ArtSlot");
  });
});
