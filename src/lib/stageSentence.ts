/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHAT HAPPENED IN A PAST STAGE, IN A SENTENCE (v60, Phase 4).
 *
 * ⚠️ THE GRAMMAR IS STAGE × THE EVENT THAT ENDED IT, and neither half alone will do. "Queried" says
 * where the relationship stood; "the agent replied" says what moved it; only the pair says what
 * happened — *the agent requested the full after three weeks and a day*. The ref's `stageSentence`
 * is that table, and this is it, stated as a pure function so every combination can be exercised
 * without a board.
 *
 * ⚠️ AND IT NEVER APPRAISES. Every sentence is an event and a duration. There is no "finally", no
 * "only", no "still" — a stage that ran five months is stated as five months, and what that means
 * is the reader's to decide.
 *
 * ⚠️ THE AGENT IS "Agent", NEVER A PRONOUN. The app does not know an agent's pronouns and never
 * asks, so the noun stands in — the standing rule for every surface that names one.
 */

/** What the record says a stage was — the query's status when the stage began. */
export type StageEnd =
  /** something arrived from the agency */
  | "in"
  /** something went out from the writer */
  | "out"
  /** the relationship ended without a reply */
  | "none";

export interface StagePair {
  /** the stage's own name — a `QueryStatus` value, or the board's word for the stretch */
  stage: string;
  /** how the stage ended */
  end: StageEnd;
  /** the status it moved to, where the ending event carried one */
  next?: string;
  /** how long the stage ran, in whole days */
  days: number;
}

/**
 * A duration in the ref's own bands.
 *
 * ⚠️ WEEKS-AND-DAYS UNDER TWELVE WEEKS, MONTHS ABOVE — and the remainder is stated rather than
 * rounded away. "Three weeks and one day" is what happened; "three weeks" is a different fact,
 * and on a stage that decided a submission the day matters.
 */
export function stageDuration(days: number): string {
  const d = Math.round(days);
  if (d < 14) return `${d} ${d === 1 ? "day" : "days"}`;
  if (d < 84) {
    const w = Math.floor(d / 7);
    const rem = d % 7;
    const weeks = `${w} ${w === 1 ? "week" : "weeks"}`;
    return rem ? `${weeks} and ${rem} ${rem === 1 ? "day" : "days"}` : weeks;
  }
  const m = Math.round(d / 30.4);
  return `${m} ${m === 1 ? "month" : "months"}`;
}

/** What the agency did, from the status it moved the query to. */
export function askPhrase(next: string | undefined): string {
  const s = (next ?? "").toLowerCase();
  if (s.includes("offer")) return "made an offer";
  if (s.includes("revis")) return "asked for revisions";
  if (s.includes("full")) return "requested the full";
  if (s.includes("partial")) return "requested a partial";
  return "replied";
}

/** Which material a stage was about — the full, or the partial. */
export function material(stage: string): string {
  return stage.toLowerCase().includes("full") ? "the full" : "the partial";
}

/**
 * The sentence for one past stage.
 *
 * ⚠️ THE FALL-THROUGH STATES A DURATION AND NOTHING ELSE. A stage this table has no phrasing for
 * is a stage the app has not been told how to describe, and "Lasted 9 days" is true of every one
 * of them. Inventing a verb for an unrecognised pair is the fault this repo records as a default
 * branch performing a write: the case you have not thought about is exactly the one that must do
 * the least.
 */
export function stageSentence(p: StagePair): string {
  const d = stageDuration(p.days);
  const st = p.stage.toLowerCase();

  /* nothing came back at all — the relationship ended in silence */
  if (p.end === "none") return `No reply in ${d}`;

  if (st.startsWith("queried")) {
    if (p.end === "in") return `Agent ${askPhrase(p.next)} after ${d}`;
    return `You nudged after ${d}`;
  }
  /* the writer was putting the materials together */
  if (st.startsWith("preparing")) return `You sent ${material(st)} after ${d}`;
  if (st.includes("sent")) {
    if (p.end === "in") return `Agent read ${material(st)} in ${d}, then ${askPhrase(p.next)}`;
    return `You nudged after ${d}`;
  }
  if (st.startsWith("nudged")) {
    if (p.end === "in") return `Agent ${askPhrase(p.next)} ${d} after your nudge`;
    return `You nudged again after ${d}`;
  }
  return `Lasted ${d}`;
}
