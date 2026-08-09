/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode v3 · P2 — the focused stack's state machine.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  STEP_ORDER, STEP_TITLE, STEP_SHORT, STEP_OPTIONAL,
  stepStates, nextStep, advance, jumpTo, enterHint, requirements, stepIndex,
  stackAvailable, dateRequirementLabel,
} from "./createSteps";
import { draftReady, emptyDraft } from "./queryDraft";

describe("one section is open at a time", () => {
  it("the first frame: When is active, the other two wait", () => {
    expect(stepStates("when", "when")).toEqual({ when: "active", what: "upcoming", notes: "upcoming" });
  });

  it("mid-stack: what is behind is done, what is ahead is upcoming", () => {
    expect(stepStates("what", "what")).toEqual({ when: "done", what: "active", notes: "upcoming" });
  });

  it("the last section: everything behind it is a summary", () => {
    expect(stepStates("notes", "notes")).toEqual({ when: "done", what: "done", notes: "active" });
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
    expect(stepStates("when", "notes")).toEqual({ when: "active", what: "done", notes: "done" });
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
    expect(nextStep("when")).toBe("what");
    expect(nextStep("what")).toBe("notes");
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
});

describe("the requirement pips read the draft, never the steps", () => {
  /* ⚠️ THE FIXTURE MUST OPEN THE WAY THE PAGE DOES. A bare emptyDraft() has manuscriptId: "" —
     openCreate seeds it from resolveInitialManuscriptId, which is WHY two pips are already green
     when the writer arrives. Testing the bare draft would have "proved" the opposite of what the
     writer sees, and the module would have been blamed for the fixture's shortcut. */
  it("two are already met on arrival — only the agent is open", () => {
    const d = emptyDraft({ manuscriptId: "m1" });
    expect(requirements(d, d, { manuscript: "Murphy's Day Out" }).map((r) => [r.key, r.state, r.met]))
      .toEqual([["agent", "empty", false], ["manuscript", "prefilled", true], ["date", "prefilled", true]]);
  });

  it("choosing an agent completes the set", () => {
    const base = emptyDraft({ manuscriptId: "m1" });
    const d = { ...base, agentId: "a1" };
    expect(requirements(d, base).every((r) => r.met)).toBe(true);
  });

  it("a manuscript-less account leaves that pip open rather than lying", () => {
    const d = { ...emptyDraft({ manuscriptId: "m1" }), manuscriptId: "" };
    expect(requirements(d, d).find((r) => r.key === "manuscript")?.met).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ A BARE TICK BESIDE "MANUSCRIPT" IS A LIE OF OMISSION. The manuscript and the date are
   PRE-FILLED by openCreate, so a solid green tick beside them claims the writer completed
   something they never looked at — and the one item that genuinely needs them reads as one open
   thing among three settled ones.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the checklist states its values, and its ticks are not all the same tick", () => {
  const now = Date.parse("2026-08-09T09:00:00Z");
  const base = emptyDraft({ manuscriptId: "m1" }, now);

  it("each row states what is actually recorded", () => {
    const rs = requirements(base, base, { manuscript: "Murphy's Day Out" }, now);
    expect(rs.find((r) => r.key === "manuscript")?.value).toBe("Murphy's Day Out");
    expect(rs.find((r) => r.key === "date")?.value, "today is a word, not a date to decode").toBe("today");
  });

  /* An empty row must say what to DO. "Agent" beside an empty ring states a category, not a task. */
  it("and an empty row states the instruction, never a blank", () => {
    expect(requirements(base, base, {}, now).find((r) => r.key === "agent"))
      .toMatchObject({ state: "empty", value: "choose one" });
  });

  it("pre-filled is a different mark from answered — the baseline is what tells them apart", () => {
    const moved = { ...base, dateSent: "2026-08-01" };
    expect(requirements(base, base, {}, now).find((r) => r.key === "date")?.state).toBe("prefilled");
    expect(requirements(moved, base, {}, now).find((r) => r.key === "date")?.state).toBe("answered");
  });

  /* The agent list's "Send query" seeds the agent, so it arrives pre-filled exactly as the
     manuscript does — it is the baseline that decides, never which field it is. */
  it("a SEEDED agent is pre-filled too, and a chosen one is answered", () => {
    const seeded = emptyDraft({ agentId: "a1", manuscriptId: "m1" }, now);
    expect(requirements(seeded, seeded, { agent: "Elinor Hale" }, now).find((r) => r.key === "agent"))
      .toMatchObject({ state: "prefilled", value: "Elinor Hale" });
    expect(requirements({ ...base, agentId: "a1" }, base, { agent: "Elinor Hale" }, now)
      .find((r) => r.key === "agent")?.state).toBe("answered");
  });

  /* ⚠️ NEVER CLAIM THE WRITER DID SOMETHING WHEN YOU CANNOT TELL. With no baseline every present
     value reads as pre-filled — the quieter of the two mistakes by a wide margin. */
  it("with no baseline, everything present reads as pre-filled", () => {
    const d = { ...base, agentId: "a1", dateSent: "2026-08-01" };
    expect(requirements(d, null, { agent: "X", manuscript: "Y" }, now).map((r) => r.state))
      .toEqual(["prefilled", "prefilled", "prefilled"]);
  });

  it("a date that is not today is stated as a date", () => {
    expect(dateRequirementLabel("2026-08-09", now)).toBe("today");
    expect(dateRequirementLabel("2026-08-01", now)).toBe("1 Aug");
    expect(dateRequirementLabel("", now)).toBe("");
  });
});

/* ══ THE ONE EXCEPTION TO REQUIRED ≠ SEQUENTIAL ═════════════════════════════════════════════ */
describe("the stack is unavailable until an agent is chosen", () => {
  it("and the rule has a name, so it is not an inline fork nobody can find", () => {
    expect(stackAvailable(null)).toBe(false);
    expect(stackAvailable(undefined)).toBe(false);
    expect(stackAvailable({ id: "a1" })).toBe(true);
  });

  /* ⚠️ IT ASKS FOR THE AGENT, NOT THE id. An id pointing at an agent no longer on file passes an
     `!!agentId` check and fails at everything the gate protects — no materials to seed, no reply
     time to suggest a nudge from, no record for the panel. */
  it("a dangling id is not an agent", () => {
    const agents = [{ id: "a1" }];
    expect(stackAvailable(agents.find((a) => a.id === "gone") ?? null)).toBe(false);
  });

  /* ⚠️ AND IT IS NOT SEQUENCING COMING BACK. Once an agent exists all three sections are
     reachable in both directions, in any order — the gate is about CONTENT (every section
     derives from the agent), not about order. */
  it("but it does not sequence the stack behind it", () => {
    expect(jumpTo("notes", "when")).toEqual({ active: "notes", reached: "notes" });
    expect(stepStates("notes", "notes").when).toBe("done");
    expect(stackAvailable({ id: "a1" }) && true).toBe(true);
  });

  it("and the exception is argued where the rule lives", () => {
    const src = readFileSync(new URL("./createSteps.ts", import.meta.url), "utf8");
    expect(src).toContain("THE ONE EXCEPTION: THE AGENT");
    expect(src, "the reason must be content, not order").toMatch(/about ORDER, it is about CONTENT/);
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
    for (const [active, reached] of [["when", "when"], ["what", "what"], ["notes", "notes"]] as const) {
      expect(draftReady(d), `readiness changed at ${active}`).toBe(true);
      expect(Object.keys(stepStates(active, reached))).toHaveLength(3);
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
  it("every step has a full title, a short name and an optional flag", () => {
    for (const id of STEP_ORDER) {
      expect(STEP_TITLE[id], `${id} has no title`).toBeTruthy();
      expect(STEP_SHORT[id], `${id} has no short name`).toBeTruthy();
      expect(typeof STEP_OPTIONAL[id]).toBe("boolean");
    }
  });

  it("Notes is the only optional one — and it says so in its own head", () => {
    expect(STEP_OPTIONAL).toEqual({ when: false, what: false, notes: true });
  });

  it("the order is the numbering", () => {
    expect(STEP_ORDER.map(stepIndex)).toEqual([0, 1, 2]);
  });
});
