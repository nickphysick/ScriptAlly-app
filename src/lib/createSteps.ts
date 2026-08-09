/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode v3 — THE FOCUSED STACK'S STATE (ref design-refs/qc-create-steps.html).
 *
 * Three sections — When you sent it · What you sent · Notes — presented one at a time: the active
 * one expanded, the rest collapsed to one-line summaries. Pure, so the rhythm can be tested
 * without a DOM (this repo has no jsdom).
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
 *
 * ── THE ONE EXCEPTION: THE AGENT ──────────────────────────────────────────────────────────
 *
 * The stack does not open at all until an agent is chosen (`stackAvailable`). This is NOT
 * sequencing creeping back in, and the distinction matters enough to write down:
 *
 * · Sequencing would mean "you may not do step 3 before step 2". Nothing here says that — once
 *   an agent exists, all three sections are reachable in both directions, in any order, and the
 *   rule above governs them completely.
 * · The agent gate is not about ORDER, it is about CONTENT. Every section derives from the
 *   agent: the materials checklist is seeded from what they ask for, the nudge suggestion from
 *   their stated reply time, and the reference panel is their record. Opened without one, all
 *   three would present defaults as if they were that agent's — and the writer would then have
 *   to notice, and undo, a set of answers nobody gave.
 *
 * So it is a prerequisite of the stack, not a first step within it — which is why choosing the
 * agent is a STAGE, and why `StepId` has three members rather than four.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */

import { shortDate } from "./createSummary";
import { todayInputDate } from "./queryDraft";

export type StepId = "when" | "what" | "notes";

/** Presentation only — which of the ref's three treatments a section wears. */
export type StepState = "active" | "done" | "upcoming";

export const STEP_ORDER: readonly StepId[] = ["when", "what", "notes"] as const;

/** The head shown while active, and the short name shown in the collapsed summary. */
export const STEP_TITLE: Record<StepId, string> = {
  when: "When you sent it",
  what: "What you sent",
  notes: "Notes",
};
export const STEP_SHORT: Record<StepId, string> = { when: "When", what: "What", notes: "Notes" };

/**
 * What a section says about itself BEFORE it has been answered — the ghost rows on stage 1.
 * Anatomy without interrogation: you can see what will be asked without being asked it yet.
 */
export const STEP_HINT: Record<StepId, string> = {
  when: "Date, how you sent it, and a nudge",
  what: "Manuscript and materials",
  notes: "Optional — first impressions, personalisation",
};

/** Notes is openly optional, and says so in its own head rather than in a footnote. */
export const STEP_OPTIONAL: Record<StepId, boolean> = { when: false, what: false, notes: true };

export const stepIndex = (id: StepId): number => STEP_ORDER.indexOf(id);

/**
 * ⚠️ THE STACK IS UNAVAILABLE UNTIL AN AGENT IS CHOSEN — the single exception to required ≠
 * sequential, argued in the module header above. It is a prerequisite of the stack rather than
 * a step inside it, because every section's CONTENT comes from the agent, not because the steps
 * have an order.
 *
 * It is a named predicate rather than an inline `!agent ?` in the pane so the rule has one home,
 * one explanation and one test. A fork spelled out at the call site is a rule nobody can find.
 *
 * ⚠️ IT TAKES THE RESOLVED AGENT, NOT THE DRAFT'S id. An id pointing at an agent that is no
 * longer on file — deleted, or not yet arrived from the listener — passes an `!!agentId` check
 * and fails at everything the gate exists to protect: there are no materials to seed, no reply
 * time to suggest a nudge from, and no record for the panel to show. The gate asks for the
 * thing the sections need, which is the agent.
 */
export function stackAvailable(agent: { id: string } | null | undefined): boolean {
  return !!agent;
}

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
 * ⚠️ THE ENTER CARVE-OUT. Enter accepts the section and advances everywhere EXCEPT inside the
 * notes textarea, where a writer typing a paragraph must be able to start a new line — so there
 * Enter is a newline and ⌘/Ctrl+Enter saves. The head hint has to say which, or the one section
 * that behaves differently gives no sign of it.
 */
export function enterHint(id: StepId): string {
  return id === "notes" ? "⌘↵ TO FINISH" : "ENTER TO ACCEPT ↵";
}

/* ══ THE REQUIREMENT CHECKLIST (header) ═════════════════════════════════════════════════════
   Derived from the draft, never from step progress.

   ⚠️ A BARE TICK BESIDE "MANUSCRIPT" IS A LIE OF OMISSION. The manuscript and the date are
   PRE-FILLED by openCreate — the only book you have, and today — so a solid green tick beside
   them claims the writer completed something they have not looked at, and the one item that
   genuinely needs them (the agent) reads as one open thing among three settled ones.

   So each item states its VALUE and wears one of three marks:
     · empty      — an open ring. Nothing recorded; the row says what to do ("choose one").
     · prefilled  — a sage-OUTLINED tick. Answered FOR you, and still editable.
     · answered   — the solid tick. You did this.

   ⚠️ AND THE DIFFERENCE IS THE BASELINE, NOT THE FIELD. "Pre-filled" is not a property of the
   date — it is the draft still holding what `openCreate` put there. Change the date and it
   becomes yours; a seeded agent (the agent list's "Send query") arrives pre-filled exactly as
   the manuscript does. With no baseline to compare, everything present reads as PRE-FILLED:
   never claim the writer did something when you cannot tell. */
export type RequirementState = "empty" | "prefilled" | "answered";
export interface Requirement {
  key: "agent" | "manuscript" | "date";
  label: string;
  /** What is actually recorded — "Murphy's Day Out", "today", or the prompt when nothing is. */
  value: string;
  state: RequirementState;
  /** Kept for the callers that only ask whether the query can be saved. */
  met: boolean;
}

interface ReqDraft { agentId: string | null; manuscriptId: string; dateSent: string }

/** "today" earns its own word — a date you can read as a date beats one you have to decode. */
export function dateRequirementLabel(iso: string, now: number = Date.now()): string {
  if (!iso) return "";
  return iso === todayInputDate(now) ? "today" : shortDate(iso, now);
}

export function requirements(
  d: ReqDraft,
  base: ReqDraft | null = null,
  names: { agent?: string; manuscript?: string } = {},
  now: number = Date.now(),
): Requirement[] {
  /* ⚠️ `unchanged` DEFAULTS TO TRUE WITH NO BASELINE, and the direction matters: `!!base && …`
     would report every value as ANSWERED the moment the baseline went missing — claiming the
     writer did three things they had not done. Pre-filled is the quieter mistake by a distance. */
  const mark = (value: string, unchanged: boolean): RequirementState =>
    !value ? "empty" : unchanged ? "prefilled" : "answered";

  const agentValue = d.agentId ? (names.agent ?? "").trim() || "Chosen" : "";
  const msValue = d.manuscriptId ? (names.manuscript ?? "").trim() || "Chosen" : "";
  const dateValue = dateRequirementLabel(d.dateSent, now);

  return [
    {
      key: "agent", label: "Agent",
      value: agentValue || "choose one",
      state: mark(agentValue, !base || base.agentId === d.agentId),
      met: !!d.agentId,
    },
    {
      key: "manuscript", label: "Manuscript",
      value: msValue || "choose one",
      state: mark(msValue, !base || base.manuscriptId === d.manuscriptId),
      met: !!d.manuscriptId,
    },
    {
      key: "date", label: "Date",
      value: dateValue || "pick one",
      state: mark(dateValue, !base || base.dateSent === d.dateSent),
      met: !!d.dateSent,
    },
  ];
}
