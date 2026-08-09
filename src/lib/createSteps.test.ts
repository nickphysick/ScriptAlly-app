/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode v3 · P2 — the focused stack's state machine.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  STEP_ORDER, STEP_TITLE, STEP_SHORT, STEP_OPTIONAL, STEP_HINT, STEP_LEDE,
  stepStates, nextStep, prevStep, advance, jumpTo, enterHint, requirements, stepIndex,
} from "./createSteps";
import { draftReady, emptyDraft } from "./queryDraft";

describe("one section is open at a time", () => {
  /* ⚠️ THE STACK NOW OPENS ON THE AGENT. Choosing who you are querying used to be a stage BEFORE
     the steps — a screen the stack never showed you having completed, left by a button that
     existed nowhere else. It is step one of four, and the first frame is its open state. */
  it("the first frame: Agent is active, the other three wait", () => {
    expect(stepStates("agent", "agent"))
      .toEqual({ agent: "active", when: "upcoming", what: "upcoming", notes: "upcoming" });
  });

  it("mid-stack: what is behind is done, what is ahead is upcoming", () => {
    expect(stepStates("what", "what"))
      .toEqual({ agent: "done", when: "done", what: "active", notes: "upcoming" });
  });

  it("the last section: everything behind it is a summary", () => {
    expect(stepStates("notes", "notes"))
      .toEqual({ agent: "done", when: "done", what: "done", notes: "active" });
  });

  it("exactly one is ever active", () => {
    for (const active of STEP_ORDER) {
      const states = Object.values(stepStates(active, "notes"));
      expect(states.filter((s) => s === "active")).toHaveLength(1);
    }
  });
});

/* ⚠️ The ref's demo is positional — stepping back to 1 puts 2 and 3 back to "upcoming". Fine for
   a click-through mockup, wrong here: going back to change the date must not un-complete the
   materials you already confirmed. */
describe("going back does not un-complete what you have already passed", () => {
  it("jumping back to When leaves What and Notes done, not upcoming", () => {
    expect(stepStates("when", "notes"))
      .toEqual({ agent: "done", when: "active", what: "done", notes: "done" });
  });

  /* Reopening the picker must not un-answer everything after it: a writer correcting the agent
     has still chosen a date and ticked their materials, and the seeded materials that DO change
     are re-derived by pickAgent rather than by the stack forgetting where it had been. */
  it("and reopening the Agent step leaves the whole stack behind it intact", () => {
    expect(stepStates("agent", "notes"))
      .toEqual({ agent: "active", when: "done", what: "done", notes: "done" });
  });

  it("jumping back does not retreat `reached`", () => {
    expect(jumpTo("when", "notes")).toEqual({ active: "when", reached: "notes" });
  });

  it("jumping forward carries `reached` with it", () => {
    expect(jumpTo("notes", "when")).toEqual({ active: "notes", reached: "notes" });
  });

  it("a step you are standing in counts as reached, however it was set", () => {
    expect(stepStates("notes", "when").notes).toBe("active");
    expect(stepStates("notes", "when").what).toBe("done");
  });
});

describe("Enter advances, and knows where it stops", () => {
  it("walks the stack in order", () => {
    expect(nextStep("agent")).toBe("when");
    expect(nextStep("when")).toBe("what");
    expect(nextStep("what")).toBe("notes");
  });

  /* Back is the footer's second control, and the first step has nothing behind it — the button
     is absent there rather than present and inert. */
  it("and Back walks it the other way, stopping at the first step", () => {
    expect(prevStep("agent")).toBeNull();
    expect(prevStep("when")).toBe("agent");
    expect(prevStep("notes")).toBe("what");
  });

  it("the last section has nowhere to advance to — there Enter saves instead", () => {
    expect(nextStep("notes")).toBeNull();
    expect(advance("notes", "notes")).toEqual({ active: "notes", reached: "notes" });
  });

  it("advancing moves both markers", () => {
    expect(advance("when", "when")).toEqual({ active: "what", reached: "what" });
  });

  it("advancing from a step you jumped back to does not rewind `reached`", () => {
    expect(advance("when", "notes")).toEqual({ active: "what", reached: "notes" });
  });

  /* The one section that behaves differently must SAY so: inside a textarea Enter is a newline,
     so the head has to advertise ⌘↵ or the difference is invisible. */
  it("the hint names the key that actually works in that section", () => {
    expect(enterHint("when")).toBe("ENTER TO ACCEPT ↵");
    expect(enterHint("what")).toBe("ENTER TO ACCEPT ↵");
    expect(enterHint("notes")).toBe("⌘↵ TO FINISH");
  });

  /* ⚠️ AND THE AGENT STEP STATES NO RULE, because it follows a different one. Enter inside the
     typeahead takes the highlighted agent; an Enter that advanced the stack would walk you to
     step 2 with nobody chosen. An empty hint is the honest answer — advertising "ENTER TO
     ACCEPT" on the one step where Enter does something else is worse than saying nothing. */
  it("the agent step advertises no Enter rule, because the stack does not own that key there", () => {
    expect(enterHint("agent")).toBe("");
  });
});

describe("the requirement pips read the draft, never the steps", () => {
  /* ⚠️ THE FIXTURE MUST OPEN THE WAY THE PAGE DOES. A bare emptyDraft() has manuscriptId: "" —
     openCreate seeds it from resolveInitialManuscriptId, which is WHY two pips are already green
     when the writer arrives. Testing the bare draft would have "proved" the opposite of what the
     writer sees, and the module would have been blamed for the fixture's shortcut. */
  it("two are already met on arrival — only the agent is open", () => {
    const d = emptyDraft({ manuscriptId: "m1" });
    expect(requirements(d)).toEqual([
      { key: "agent", label: "Agent", met: false },
      { key: "manuscript", label: "Manuscript", met: true },
      { key: "date", label: "Date", met: true },
    ]);
  });

  it("choosing an agent completes the set", () => {
    const d = { ...emptyDraft({ manuscriptId: "m1" }), agentId: "a1" };
    expect(requirements(d).every((r) => r.met)).toBe(true);
  });

  it("a manuscript-less account leaves that pip open rather than lying", () => {
    const d = { ...emptyDraft({ manuscriptId: "m1" }), manuscriptId: "" };
    expect(requirements(d).find((r) => r.key === "manuscript")?.met).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ REQUIRED ≠ SEQUENTIAL. This is the lock against wizard-creep, and it is the reason the
   step module exports nothing that could be mistaken for permission to save.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the steps guide attention; they never gate saving", () => {
  it("Save is enabled on the first frame of the stack, with two sections un-visited", () => {
    const d = { ...emptyDraft({ manuscriptId: "m1" }), agentId: "a1" };
    const states = stepStates("when", "when");
    expect(states.what, "the fixture must actually have later steps un-visited").toBe("upcoming");
    expect(states.notes).toBe("upcoming");
    expect(draftReady(d), "Save must not wait for the stack").toBe(true);
  });

  it("and readiness is indifferent to how far the stack has been walked", () => {
    const d = { ...emptyDraft({ manuscriptId: "m1" }), agentId: "a1" };
    for (const id of STEP_ORDER) {
      expect(draftReady(d), `readiness changed at ${id}`).toBe(true);
      expect(Object.keys(stepStates(id, id))).toHaveLength(STEP_ORDER.length);
    }
  });

  it("nothing in the module exports a completion gate", () => {
    const src = readFileSync(new URL("./createSteps.ts", import.meta.url), "utf8");
    for (const name of ["allStepsDone", "canSave", "isComplete", "allDone", "stepsComplete"]) {
      expect(src, `${name} would be read as permission to save`).not.toContain(`export function ${name}`);
      expect(src, `${name} would be read as permission to save`).not.toContain(`export const ${name}`);
    }
  });

  it("the rule is written where the next person will read it", () => {
    const src = readFileSync(new URL("./createSteps.ts", import.meta.url), "utf8");
    expect(src, "the governing rule must be stated on the module").toContain("REQUIRED ≠ SEQUENTIAL");
    expect(src).toContain("NOTHING IN THIS MODULE GATES SAVING");
  });
});

describe("the vocabulary is single-sourced", () => {
  /* ⚠️ EVERY MAP COVERS EVERY STEP. A step added to STEP_ORDER without a lede renders an empty
     line under its head, and without a hint renders a collapsed row that names nothing — both
     are silent, because a missing Record key is `undefined`, not an error. */
  it("every step has a title, a short name, a hint, a lede and an optional flag", () => {
    for (const id of STEP_ORDER) {
      expect(STEP_TITLE[id], `${id} has no title`).toBeTruthy();
      expect(STEP_SHORT[id], `${id} has no short name`).toBeTruthy();
      expect(STEP_HINT[id], `${id} has no collapsed-row hint`).toBeTruthy();
      expect(STEP_LEDE[id], `${id} has no lede`).toBeTruthy();
      expect(typeof STEP_OPTIONAL[id]).toBe("boolean");
    }
  });

  it("Notes is the only optional one — and it says so in its own head", () => {
    expect(STEP_OPTIONAL).toEqual({ agent: false, when: false, what: false, notes: true });
  });

  it("the order is the numbering, and the agent comes first", () => {
    expect(STEP_ORDER).toEqual(["agent", "when", "what", "notes"]);
    expect(STEP_ORDER.map(stepIndex)).toEqual([0, 1, 2, 3]);
  });

  /* The lede is written once here, not derived at render — but it must not restate a fact the
     step's own controls already carry, or the two will disagree. The "when" lede is the case
     the ref got wrong: it names the agent's reply time, which the nudge chip's caption already
     states from the agent record. */
  it("the when lede does not restate the agent's reply time", () => {
    expect(STEP_LEDE.when).not.toMatch(/weeks?/i);
  });
});
