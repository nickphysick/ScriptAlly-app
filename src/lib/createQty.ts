/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CREATE-MODE SAMPLE BOUNDS — forked from `MAT_QTY`, deliberately.
 *
 * ⚠️ THEY WEAR THE SAME NUMBERS AND ANSWER DIFFERENT QUESTIONS. `MAT_QTY` is storage-level
 * validation shared with the agent editor: it governs what an agent may legitimately STATE, and
 * tightening it there would silently narrow what a writer is allowed to record about somebody
 * else's submission guidelines. `CREATE_QTY` governs what this stepper OFFERS — the range a
 * writer is likely to have sent, which is a much smaller range and a much cheaper thing to be
 * wrong about. One file, one purpose; a shared constant would have coupled a UI convenience to a
 * validation rule and the tightening would have happened by accident.
 *
 * ⚠️ AND CREATE BOUNDS NEVER CLIP A STATED REQUIREMENT. If an agent asks for 500 pages and this
 * clamped at 400, pre-ticking her row would write 400 — quietly altering what she asked for, in
 * the one record that is supposed to say what you sent her. The effective maximum is therefore
 * `max(bound, statedRequirement)`: the bound governs stepping and typed entry in the ordinary
 * case, and yields to the agent's own figure whenever that is higher.
 */
import type { SampleUnit } from "./agentMaterials";

export const CREATE_QTY: Record<SampleUnit, { step: number; min: number; max: number }> = {
  Pages: { step: 5, min: 5, max: 400 },
  Words: { step: 500, min: 500, max: 120_000 },
  Chapters: { step: 1, min: 1, max: 40 },
};

/** "± 5" · "± 500" · "± 1" — shown beside the field so the arrows say what they will do. */
export function stepLabel(unit: SampleUnit): string {
  return `± ${CREATE_QTY[unit].step.toLocaleString("en-GB")}`;
}

/**
 * The ceiling actually in force. `stated` is the agent's own figure for this unit, when they gave
 * one — never clipped, never rounded down to a bound this module chose.
 */
export function effectiveMax(unit: SampleUnit, stated?: number | null): number {
  const bound = CREATE_QTY[unit].max;
  return typeof stated === "number" && stated > bound ? stated : bound;
}

/** Digits only — the field is formatted with separators while it is not being typed into. */
export function parseQty(raw: string): number {
  const n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

/** "12,500" — reapplied on blur. Typing sees the raw integer; reading sees the number. */
export function formatQty(value: number | string): string {
  const n = typeof value === "number" ? value : parseQty(value);
  return n ? n.toLocaleString("en-GB") : "";
}

/**
 * One press of an arrow.
 *
 * ⚠️ FROM AN OFF-STEP VALUE IT MOVES TO THE NEXT CLEAN MULTIPLE, not to that value plus a step.
 * 37 pages going up is 40, never 42 — a stepper whose ladder depends on where you happened to
 * start has no ladder, and after two presses the writer cannot predict the third. Typed values are
 * never snapped on their own account (see below); this only bites when an ARROW is pressed, which
 * is the writer explicitly asking for the ladder.
 *
 * ⚠️ AND IT REFUSES AT THE BOUNDS rather than silently returning the same number. A control that
 * does nothing and looks the same as a control that worked teaches the writer to press harder.
 * `canStep` is what disables the button; this clamps as a backstop.
 */
export function stepQty(raw: string, unit: SampleUnit, dir: 1 | -1, stated?: number | null): number {
  const { step, min } = CREATE_QTY[unit];
  const max = effectiveMax(unit, stated);
  const current = parseQty(raw) || min;
  const onStep = current % step === 0;
  const next = onStep
    ? current + dir * step
    : dir === 1
      ? Math.ceil(current / step) * step
      : Math.floor(current / step) * step;
  return Math.min(max, Math.max(min, next));
}

/** Whether the arrow does anything — the button is disabled when it does not. */
export function canStep(raw: string, unit: SampleUnit, dir: 1 | -1, stated?: number | null): boolean {
  const current = parseQty(raw) || CREATE_QTY[unit].min;
  return stepQty(raw, unit, dir, stated) !== current;
}

/* ══ WHAT THE AGENT ASKS FOR — ONE SENTENCE, IN THE STEP HEAD ═══════════════════════════════
   ⚠️ ONE FACT ABOUT THE AGENT, NOT FIVE FACTS ABOUT MATERIALS. "NOT REQUESTED" repeated on every
   row and "ONLY MANUSCRIPT" said the same thing a fifth time on the manuscript row — five tags
   restating a single sentence, and the rows were 80px tall partly to hold them.

   ⚠️ IT REPORTS AND NEVER APPRAISES. It states what she asked for and stops: no comparison to what
   the writer has ticked, no warning when the two differ. This record says what you sent, not
   whether the app approves of it. */

/**
 * The phrase for one requirement row — "a query letter", "a synopsis", "50 pages", "3 chapters".
 *
 * ⚠️ READ OFF THE SEEDED ROW, never re-parsed from the agent record. `materialRowsForDraft` has
 * already turned her requirements into rows; asking her record a second time here would give two
 * answers to one question the moment either changed. Words carry thousands separators, because
 * "5000 words" is a number you have to stop and read.
 */
export function askPhrase(row: { key: string; name: string; kind?: string; amount?: string; unit?: string; pages?: string }): string {
  if (row.key === "sample") {
    const n = parseQty(String(row.amount ?? ""));
    if (!n) return "an opening sample";
    return `${formatQty(n)} ${String(row.unit ?? "").toLowerCase()}`;
  }
  if (row.key === "synopsis") {
    const pages = parseQty(String(row.pages ?? ""));
    return pages ? `a ${formatQty(pages)}-page synopsis` : "a synopsis";
  }
  if (row.key === "queryLetter") return "a query letter";
  return String(row.name ?? "").toLowerCase();
}

/** Serial join with "and" before the last — "a", "a and b", "a, b and c". */
export function serialJoin(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * ⚠️ THE EMPTY CASE IS A REAL SENTENCE, NOT A BLANK. An agent who lists no materials is asking for
 * the manuscript only — that is a fact worth stating, and it is exactly the case the retired "ONLY
 * MANUSCRIPT" tag was clumsily making. Absence of a requirement is not absence of information.
 *
 * `first` is the agent's first name; the sentence is about a person and reads as one.
 */
export function asksSentence(first: string, items: string[]): string {
  const who = first.trim() || "They";
  return items.length === 0
    ? `${who} asks for the manuscript only.`
    : `${who} asks for ${serialJoin(items)}`;
}
