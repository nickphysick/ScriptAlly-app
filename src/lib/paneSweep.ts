/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE GROUP SWEEP — working a housekeeping cohort in the pane (ref design-refs/todo-group-sweep.html).
 *
 * ⚠️ WHY A LIST RATHER THAN ONE CARD AT A TIME. A group row docked nothing, so thirty of this
 * account's housekeeping items could not be worked at all. Sixteen agents each needing their own
 * card would be sixteen page-loads for what is usually the same three answers; the sweep lets a
 * writer clear the obvious ones in a minute and skip the rest.
 *
 * ⚠️ AND A SKIPPED AGENT STAYS ON THE LIST. Skipping is not answering — it is "not from here", and
 * the record is still missing the field. A sweep that quietly retired what it could not answer
 * would turn an incomplete pass into a finished-looking one.
 */
import { Agent } from "../types";

export type SweepRule = "dq_materials" | "dq_mswl" | "dq_responseTime";

/**
 * ⚠️ ONE ROW'S ANSWER. `pick` is an index into the rule's options (or the free text for a text
 * rule); `null` means unanswered, which is the state every row starts in.
 */
export interface SweepRow {
  /** The chosen option's index, or `null`. Text rules keep `null` and use `text`. */
  pick: number | null;
  /** Free text, for rules whose answer cannot be a chip. */
  text: string;
  /** Set aside for now — still on the list, just not from here. */
  skipped: boolean;
}

export const emptySweepRow = (): SweepRow => ({ pick: null, text: "", skipped: false });

/**
 * ⚠️ THE ANSWERS ARE DECLARED PER RULE, IN ONE PLACE — the same shape the journeys use, and for
 * the same reason: a chip list built at the call site is a vocabulary nobody can find later.
 *
 * ⚠️ AND NOT EVERY RULE HAS COMMON ANSWERS. Materials and reply windows genuinely do — most
 * agencies ask for one of three or four things, and most publish one of four windows. A WISH LIST
 * is prose about what someone wants to read; there is no common answer, and offering canned ones
 * would invite a writer to file an invention. So that rule declares a text field instead of chips,
 * which is a difference in KIND rather than a gap in the table.
 */
export type SweepAnswers =
  | { mode: "chips"; options: { label: string; stored: string[] }[] }
  | { mode: "weeks"; options: number[] }
  | { mode: "text"; placeholder: string };

/**
 * ⚠️ THE LABEL IS WHAT THE WRITER READS; `stored` IS WHAT IS WRITTEN, AND THEY ARE NOT THE SAME.
 * `parseAgentMaterials` classifies by whole-string match and understands "First 50 pages" and
 * "First 3 chapters" as quantified samples — so those exact strings round-trip, while the chip's
 * own prose ("Query + first 50 pages") would be filed as free-text Other. The round trip is
 * asserted rather than assumed.
 *
 * ⚠️ FULL MANUSCRIPT AND AUTHOR BIO ARE ABSENT DELIBERATELY — the standing law excludes both from
 * this surface, and a Materials commit strips them, so a chip offering one would write a value the
 * next save deletes.
 */
export const SWEEP_ANSWERS: Record<SweepRule, SweepAnswers> = {
  dq_materials: {
    mode: "chips",
    options: [
      { label: "Query + synopsis + 3 chapters", stored: ["Query letter", "Synopsis", "First 3 chapters"] },
      { label: "Query + first 50 pages", stored: ["Query letter", "First 50 pages"] },
      { label: "Query letter only", stored: ["Query letter"] },
      { label: "Query + synopsis", stored: ["Query letter", "Synopsis"] },
    ],
  },
  /* the same four the `fix` journey offers — one vocabulary for one field */
  dq_responseTime: { mode: "weeks", options: [4, 6, 8, 12] },
  dq_mswl: { mode: "text", placeholder: "What are they looking for?" },
};

/**
 * ⚠️ THE LEAD SAYS WHAT THE GAP COSTS, not that there is a gap. The row already says that. What a
 * writer cannot see is the consequence — which features quietly stop working — and that is the
 * only thing that makes clearing sixteen records worth a minute.
 */
export const SWEEP_LEAD: Record<SweepRule, string> = {
  dq_materials:
    "Each of these agents has no materials list on record, so Discover can’t weigh them and a query package can’t be built for them. The common answers are one press; anything unusual opens their listing.",
  dq_mswl:
    "Each of these agents has no wish list on record, so nothing here can tell you whether your manuscript is what they are asking for. A line from their listing is enough.",
  dq_responseTime:
    "Each of these agents has no reply window on record, so nothing here can tell you when a nudge is fair or when a silence has run long. Most agencies publish one.",
};

/** The band's line, over the count — "A materials list is missing for / 16 agents". */
export const SWEEP_PRELINE: Record<SweepRule, string> = {
  dq_materials: "A materials list is missing for",
  dq_mswl: "A wish list is missing for",
  dq_responseTime: "A reply window is missing for",
};

/** What is still missing after the pass — used by the footer, in its own words. */
export const SWEEP_SHORTFALL: Record<SweepRule, string> = {
  dq_materials: "a materials list",
  dq_mswl: "a wish list",
  dq_responseTime: "a reply window",
};

export const isSweepRule = (r: string): r is SweepRule => r in SWEEP_ANSWERS;

/** Answered = a real answer, not a skip. The two are different outcomes and never sum together. */
export function sweepAnswered(rows: readonly SweepRow[], rule: SweepRule): number {
  return rows.filter((r) => sweepFields(rule, r) !== null).length;
}

/**
 * ⚠️ ONE WRITE PER ANSWERED AGENT, AND `null` MEANS DO NOT WRITE. An unanswered or skipped row
 * yields no fields at all rather than an empty value: `agentDataQualityNeeds` reads `0` and an
 * empty list as THE GAP, so writing either would restate the gap as a fact and leave the card up
 * with a record that now claims to have been answered.
 */
export function sweepFields(rule: SweepRule, row: SweepRow): Partial<Agent> | null {
  if (row.skipped) return null;
  const spec = SWEEP_ANSWERS[rule];
  if (spec.mode === "text") {
    const t = row.text.trim();
    return t ? { mswlNotes: t } : null;
  }
  if (row.pick === null) return null;
  if (spec.mode === "weeks") {
    const w = spec.options[row.pick];
    return typeof w === "number" ? { responseTimeWeeks: w } : null;
  }
  const opt = spec.options[row.pick];
  return opt ? { materialsWanted: [...opt.stored] } : null;
}

/**
 * ⚠️ THE FOOTER STATES THE REAL OUTCOME, INCLUDING THE PART THAT DID NOT HAPPEN. A partial sweep is
 * a legitimate result — you answered what you knew — and reporting only the successes would let a
 * writer leave believing the cohort was cleared.
 */
export function sweepOutcome(answered: number, total: number, rule: SweepRule): string {
  const left = Math.max(0, total - answered);
  if (answered === 0) return `Nothing recorded · ${left} still without ${SWEEP_SHORTFALL[rule]}`;
  if (left === 0) return `Recorded ${answered} · none left without ${SWEEP_SHORTFALL[rule]}`;
  return `Recorded ${answered} · ${left} still without ${SWEEP_SHORTFALL[rule]}`;
}

/** The hint before anything is committed — the same two states, in the present tense. */
export function sweepHint(answered: number): string {
  if (answered === 0) return "Nothing recorded yet.";
  return `${answered} answered · the rest stay on your list`;
}

/** The primary's words. It names the number, because pressing it writes exactly that many records. */
export function sweepActLabel(answered: number): string {
  if (answered === 0) return "Record";
  return `Record ${answered} ${answered === 1 ? "answer" : "answers"}`;
}

/**
 * ⚠️ NOTHING IS PRE-SELECTED, AND THERE IS NO "APPLY TO ALL". Guessing an agent's requirements and
 * having a writer accept it by not looking is how bad data gets in; sixteen wrong records written
 * by one press is worse than the gap those sixteen records have today. So the only way to an
 * answer is to press it, one agent at a time — which is also why the commit is disabled at zero.
 */
export const canCommitSweep = (answered: number): boolean => answered > 0;

/** Skip everything still unanswered. Answers already given are left exactly as they are. */
export function skipTheRest(rows: readonly SweepRow[], rule: SweepRule): SweepRow[] {
  return rows.map((r) => (sweepFields(rule, r) !== null ? r : { ...r, skipped: true, pick: null, text: "" }));
}
