/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode · THE AGENT STEP (ref design-refs/63-qc-create-stepper.html).
 * Formerly createStageOne.test.ts — see below for why the stage it locked no longer exists.
 *
 * ⚠️ CHOOSING THE AGENT IS STEP ONE OF FOUR, NOT A STAGE BEFORE THE STEPS. It was a screen of its
 * own: a centred Playfair question with three dimmed GHOST ROWS beneath it, replaced wholesale by
 * a different layout the moment you picked someone. Three faults, all of them structural rather
 * than cosmetic — the first thing you did was the one thing the stack never showed you having
 * done; changing your mind meant a "Change" button in a hero that existed only to hold it; and
 * the ghosts were `aria-hidden` decorations standing in for rows that did not exist yet.
 *
 * As a step, all three go away at once. The ghosts ARE the three real collapsed rows. The hero is
 * the Agent row, which states who you picked. And the way back is EDIT, the same affordance every
 * other step has.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { STEP_ORDER, STEP_HINT, STEP_SHORT, STEP_TITLE } from "./createSteps";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const pane = read("../components/queries/QueryCreatePane.tsx");
const queries = read("../components/Queries.tsx");
const steps = read("./createSteps.ts");

const rule = (selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
  if (!m) return "";
  const open = css.indexOf("{", m.index);
  return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
};

describe("the agent step asks one question", () => {
  /* ⚠️ SUPERSEDED TWICE. First a centred single column with a dashed empty avatar above the
     question; then the same two-column geometry as stage 2, so that choosing an agent replaced
     the right column's content rather than introducing a column. Both were answers to "how do we
     stop the layout jumping when they pick someone" — a question the stack does not raise,
     because picking someone collapses one block and opens the next inside a layout that was
     already there. */
  it("the question is the step's head, from the shared vocabulary", () => {
    expect(pane, "the dashed empty avatar came back").not.toContain("qc-askav");
    expect(pane, "the stage-only column modifier came back").not.toContain("qc-form-ask");
    expect(STEP_TITLE.agent).toBe("Who are you querying?");
    expect(pane, "a literal would fork the head from every other step's").toContain("{STEP_TITLE[id]}");
  });

  /* ⚠️ NO AGENT, NO PANEL — AND THE COLUMN CLOSES UP. The reference panel is a record of the
     agent you picked, so before you have picked one it would be a frame around nothing, and
     holding a 52% column open beside it would put the picker in half the width for no gain. */
  it("the reference panel is absent until an agent exists, and the flow takes the width", () => {
    expect(pane).toContain("{agent && <AgentContextPanel");
    expect(pane).toContain('`qc-two${agent ? "" : " qc-two-solo"}`');
    expect(rule(".qc-two-solo > .qc-form")).toContain("flex: 1 1 0");
    expect(rule(".qc-form"), "and with the panel there, the 52% column is unchanged")
      .toContain("flex: 0 0 52%");
  });

  it("the field is bordered, lifted and takes the caret on arrival", () => {
    expect(pane, "the only thing being asked should already be focused").toContain("autoFocus");
    expect(rule(".qc-askfield .f12-lsearch")).toContain("box-shadow");
  });

  /* ⚠️ THE STACK MUST NOT TAKE ENTER HERE. Inside the typeahead Enter means "take the highlighted
     agent", and the field only reports aria-expanded while its list is open — so the generic
     guard would let Enter through on an empty field and advance to step 2 with nobody chosen. */
  it("Enter belongs to the typeahead on this step, and the footer claims no rule", () => {
    expect(pane).toContain('if (active === "agent") return;');
    expect(steps, "an Enter hint here would advertise a key that does something else")
      .toContain('if (id === "agent") return "";');
  });

  /* Picking IS the advance, so a Continue button would be a second control for a thing that has
     already happened — and, worse, one that appears to be waiting for a confirmation. */
  it("and there is no Continue on this step, because choosing someone is the advance", () => {
    expect(pane).toContain('{nextStep(id) && id !== "agent" && (');
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

  /* ⚠️ AND THE STEP IS SKIPPED WHEN THE ANSWER ARRIVES WITH THE DRAFT. `openCreate({ agentId })`
     is a live seam — the agent list's "Send query" seeds it — and under the two-stage shape that
     just meant stage 1 never rendered. A step DOES render, so without this the writer is asked
     who they are querying while the answer sits in the draft beside the question. */
  it("a seeded agent opens the stack at When, with the agent step already done", () => {
    expect(pane).toContain('useState<StepId>(() => (draft.agentId ? "when" : "agent"))');
    expect(queries, "the seam this guards must still exist").toContain("emptyDraft({ agentId: seed.agentId");
  });
});

/* ══ THE GHOSTS ARE RETIRED — the rows they imitated are now real ═══════════════════════════
   The ghosts were three `aria-hidden` copies of a row, dimmed to 0.45, drawn at the foot of the
   column so the eye could see the anatomy of a stack that did not exist yet. With the agent as
   step one the stack DOES exist from the first frame: the rows beneath the open block are the
   genuine collapsed steps, they announce themselves, and they open when clicked.

   ⚠️ AND THEY ARE NOT DIMMED. 0.45 was right for decoration and wrong for a control — an
   upcoming step is not a disabled one. What it lacks is a VALUE, so what it hides is EDIT. */
describe("the steps ahead are real rows, not ghosts of rows", () => {
  it("all four render from the shared vocabulary, in STEP_ORDER", () => {
    expect(pane).toContain("STEP_ORDER.map((id) => (");
    expect(pane).toContain("STEP_SHORT[id]");
    expect(pane).toContain("STEP_HINT[id]");
    for (const id of STEP_ORDER) {
      expect(STEP_HINT[id], `${id} has no row hint`).toBeTruthy();
      expect(STEP_SHORT[id]).toBeTruthy();
    }
  });

  it("the ghost stack and its dimming are gone", () => {
    expect(pane, "the ghost stack came back").not.toContain("qc-ghosts");
    /* There is exactly one stack and it is the real one — a second, hidden copy of it standing in
       for rows that do not exist yet is the shape being retired. */
    expect(pane.match(/className="qc-stack"/g)?.length ?? 0).toBe(1);
    expect(pane, "the stack carries real controls and must announce them")
      .not.toMatch(/className="qc-stack"[\s\S]{0,120}aria-hidden/);
    expect(rule(".qc-sec.qc-up"), "an upcoming step is not a disabled one").toBe("");
  });

  /* ⚠️ THE STATE CLASS IS THE WORD `stepStates` RETURNS — `qc-upcoming`, not `qc-up`. `.qc-up`
     was the ghost row's literal class and never matched a real section, so a rule written against
     it is dropped in silence and reads as correct in the sheet. This assertion is here because
     that is exactly what happened, and only the browser caught it. */
  it("an upcoming row states its hint and hides EDIT, having nothing to edit yet", () => {
    expect(rule(".qc-srow.qc-up .qc-sedit"), "the ghost class is not a state class").toBe("");
    expect(rule(".qc-srow.qc-upcoming .qc-sedit")).toContain("visibility: hidden");
    expect(pane, "but it still opens — the steps guide attention, they never gate it")
      .toContain("onClick={() => jump(id)}");
  });

  /* The dot is the one state marker, and it is drawn in CSS rather than set as a glyph so the
     tick can sit inside a filled disc without a font deciding its weight. */
  it("the state dot has three treatments and no fourth", () => {
    expect(rule(".qc-dot")).toContain("border: 1.5px solid #d3c6b8");
    expect(rule(".qc-dot-done")).toContain("#7e9178");
    expect(rule(".qc-dot-done::after"), "the tick is drawn, not typed").toContain("transform: rotate(42deg)");
    expect(rule(".qc-dot-now")).toContain("var(--burg)");
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

/* ══ QUICK PICKS — once stage 1's right column, now the agent step's body ══════════════════ */
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
  it("they sit inside the step, capped rather than stretched so the footer stays in view", () => {
    expect(pane).toContain('className="qc-qp qc-qp-in"');
    const inBody = rule(".qc-qp-in");
    expect(inBody).toContain("max-height");
    expect(inBody, "a stretched list would push Continue off the bottom").toContain("flex: none");
  });

  it("empty falls back to art, holding the block so the step is not a bare field", () => {
    expect(pane).toContain("picks.length > 0 ? (");
    expect(pane).toContain('<ArtSlot name="no-quick-picks"');
    // Comments stripped: this file EXPLAINS why there is no such message, and an assertion
    // about the code must not be able to match prose about the code.
    const bare = pane.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/\/\/[^\n]*/g, "");
    expect(bare, "a no-results message would report an ordinary state as a failure")
      .not.toMatch(/no results|nothing found|no agents/i);
  });
});
