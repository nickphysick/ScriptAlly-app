/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode v3 — THE FOCUSED STACK'S STATE (ref design-refs/63-qc-create-stepper.html).
 *
 * FOUR sections — Agent · When · What · Notes — presented one at a time: the active one expanded,
 * the rest collapsed to one-line rows. Pure, so the rhythm can be tested without a DOM (this repo
 * has no jsdom).
 *
 * ⚠️ CHOOSING THE AGENT IS STEP ONE, NOT A STAGE BEFORE THE STEPS. It used to be its own screen —
 * a centred question with three ghost rows beneath it — which meant the first thing you did was
 * the one thing the stack did not show you doing, and going back to change it left the stack
 * entirely. As a step it collapses to a row like the others, states who you picked, and reopens
 * with EDIT. The stack is now the whole of create mode.
 *
 * ══ ⚠️ REQUIRED ≠ SEQUENTIAL — THE GOVERNING RULE ══════════════════════════════════════════
 *
 * NOTHING IN THIS MODULE GATES SAVING, and nothing added to it ever should. Save is enabled the
 * moment `draftReady` holds — an agent, a manuscript and a date — which is normally true on the
 * very first frame of stage 2, before a single step has been visited. The steps GUIDE ATTENTION;
 * they do not collect permission.
 *
 * The failure mode this exists to prevent is wizard-creep: someone wires `canSave` to
 * `allStepsDone`, and a writer who only wanted to record that they queried an agent today is now
 * required to walk three panels to say so. Every step after the first is OPTIONAL BY
 * CONSTRUCTION — the date is today, the method is the agent's, the materials are what the agent
 * asks for, and the notes are notes.
 *
 * There is a test asserting Save is enabled while later steps are un-visited. If you find
 * yourself changing it, you are changing the product, not the test.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */

export type StepId = "agent" | "when" | "what" | "notes";

/** Presentation only — which of the ref's three treatments a section wears. */
export type StepState = "active" | "done" | "upcoming";

export const STEP_ORDER: readonly StepId[] = ["agent", "when", "what", "notes"] as const;

/** The head shown while active, and the short name shown in the collapsed row. */
export const STEP_TITLE: Record<StepId, string> = {
  agent: "Who are you querying?",
  when: "When you sent it",
  what: "What you sent",
  notes: "Notes",
};
export const STEP_SHORT: Record<StepId, string> = {
  agent: "Agent", when: "When", what: "What", notes: "Notes",
};

/**
 * What a section says about itself BEFORE it has been answered — the hint on the collapsed row.
 * Anatomy without interrogation: you can see what will be asked without being asked it yet.
 *
 * ⚠️ THE HINT DOES NOT DISAPPEAR WHEN THE ANSWER ARRIVES. The ref's row carries both — the hint
 * on the left, naming what the step is for, and the value on the right, stating what you chose.
 * They were alternatives in the previous shape, so a completed row stopped saying what it was.
 */
export const STEP_HINT: Record<StepId, string> = {
  agent: "Who you're querying",
  when: "Date, how you sent it, and a nudge",
  what: "Manuscript and materials",
  notes: "Optional — first impressions, personalisation",
};

/**
 * The line under the head, while the step is open — what this step is FOR, in a sentence.
 *
 * ⚠️ STATIC, AND DELIBERATELY SO. The ref writes the "when" lede dynamically ("Elinor replies in
 * about eight weeks, so the nudge is set from that"), but the pane already states exactly that
 * fact beneath the suggested-nudge chip, sourced from the agent. Deriving it twice would give one
 * fact two homes, and the one further from the control is the one that goes stale.
 */
export const STEP_LEDE: Record<StepId, string> = {
  agent: "Pick from your contact list, or search by name or agency.",
  when: "The day it went, how you sent it, and when to nudge if it goes quiet.",
  what: "Their listed requirements are ticked. Adjust if you sent something else.",
  notes: "Optional — how you personalised it, where you found them, what you noticed.",
};

/** Notes is openly optional, and says so in its own head rather than in a footnote. */
export const STEP_OPTIONAL: Record<StepId, boolean> = {
  agent: false, when: false, what: false, notes: true,
};

export const stepIndex = (id: StepId): number => STEP_ORDER.indexOf(id);

/**
 * The state of every section, given which one is open and how far the writer has got.
 *
 * ⚠️ `reached` IS WHY THIS IS NOT JUST `index < active`. The ref's demo is positional — stepping
 * back to 1 puts 2 and 3 back to "upcoming" — which is fine for a click-through mockup and wrong
 * in the app: going back to change the date must not un-complete the materials you already
 * confirmed. A section you have passed keeps its tick and its summary wherever you stand now.
 * `reached` therefore only ever moves forward.
 */
export function stepStates(active: StepId, reached: StepId): Record<StepId, StepState> {
  const a = stepIndex(active);
  const r = Math.max(stepIndex(reached), a); // a step you are standing in has necessarily been reached
  return STEP_ORDER.reduce((acc, id, i) => {
    acc[id] = i === a ? "active" : i <= r ? "done" : "upcoming";
    return acc;
  }, {} as Record<StepId, StepState>);
}

/** Enter's target: the next section, or null at the end (where Enter saves instead of advancing). */
export function nextStep(active: StepId): StepId | null {
  const i = stepIndex(active);
  return i < 0 || i >= STEP_ORDER.length - 1 ? null : STEP_ORDER[i + 1];
}

/** The Back button's target, or null on the first step (where there is nothing behind you). */
export function prevStep(active: StepId): StepId | null {
  const i = stepIndex(active);
  return i <= 0 ? null : STEP_ORDER[i - 1];
}

/** Advancing carries `reached` forward with it; jumping BACK leaves it where it was. */
export function advance(active: StepId, reached: StepId): { active: StepId; reached: StepId } {
  const next = nextStep(active);
  if (!next) return { active, reached };
  return { active: next, reached: stepIndex(next) > stepIndex(reached) ? next : reached };
}

/** Clicking a summary — any section is reachable, forwards or back. `reached` never retreats. */
export function jumpTo(target: StepId, reached: StepId): { active: StepId; reached: StepId } {
  return { active: target, reached: stepIndex(target) > stepIndex(reached) ? target : reached };
}

/**
 * ⚠️ THE ENTER CARVE-OUT, now with two exceptions rather than one.
 *
 * · NOTES — a writer typing a paragraph must be able to start a new line, so there Enter is a
 *   newline and ⌘/Ctrl+Enter saves.
 * · AGENT — the only way past this step is to pick someone, and Enter inside the typeahead
 *   already means "take the highlighted agent". An Enter that advanced the stack instead would
 *   walk you to step 2 with no agent chosen. It returns "" so the footer states no rule at all
 *   rather than one the step does not follow.
 */
export function enterHint(id: StepId): string {
  if (id === "agent") return "";
  return id === "notes" ? "⌘↵ TO FINISH" : "ENTER TO ACCEPT ↵";
}

/** The three requirement pips in the header. Derived from the draft, never from step progress. */
export interface Requirement { key: "agent" | "manuscript" | "date"; label: string; met: boolean }

export function requirements(d: { agentId: string | null; manuscriptId: string; dateSent: string }): Requirement[] {
  return [
    { key: "agent", label: "Agent", met: !!d.agentId },
    { key: "manuscript", label: "Manuscript", met: !!d.manuscriptId },
    { key: "date", label: "Date", met: !!d.dateSent },
  ];
}
