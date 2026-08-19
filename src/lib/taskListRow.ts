/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskListRow — the list's display language, from `design-refs/todo-tasklist-contract.html`.
 *
 * ⚠️ DISPLAY ONLY. Nothing here changes a stored value, a task type or a bucket key — the same
 * separation `materialLabel` keeps between what a thing IS and what a reader is shown. A row that
 * reads "Consider closing" is still a `close` bucket card with its own `taskType` underneath.
 *
 * ⚠️ THE RETIRED VERBS ARE RETIRED AS WORDS, NOT AS CONCEPTS. "log", "record", "mark" and "chase"
 * do not appear in anything a reader sees; `cardBucket` still returns `"chase"` and the code still
 * says `record`, because those are identifiers. The list asserts the reader's side of that line.
 *
 * ⚠️ AND ABSENCE IS STATED PLAINLY, NEVER GUESSED. "no agency" and "agent not specified" are the
 * contract's own words for a record that does not hold the fact — they go in the META, while an
 * absent DATE goes in the right-hand column as `.absent`. Two different absences, two slots; a
 * missing date rendered as a sentence in the middle column is the fault this separation prevents.
 */
import { BoardCard } from "./todoBoard";
import { Bucket, cardBucket } from "./todoBuckets";
import { elapsedParts } from "./elapsed";

/** what the row can be told beyond the card itself — every one optional, every one falling back */
export interface RowInputs {
  card: BoardCard;
  /** the specific ask ("the first 3 chapters"), through the one materials formatter */
  ask?: string | null;
  /** the day representation was offered, already formatted */
  offeredOn?: string | null;
  /** days on this row's own clock — the rail's resolver, never a second derivation */
  days?: number | null;
  /** how many queries a bulk gap stands for */
  bulkCount?: number | null;
  /** a send whose material is a partial rather than the full */
  partial?: boolean;
  /**
   * ⚠️ THE AGENCY ALONE. `card.record` is the rail's own meta line and already reads
   * "Ana Duarte · Duarte Words" — using it as the agency printed the agent TWICE
   * ("Ana Duarte asked for it · Ana Duarte · Duarte Words"). Measured on the page; no source
   * reading could have shown it, because the field's name is honest and its content is a pair.
   */
  agency?: string | null;
}

/* ── the deed ─────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ ONE STRING PER BUCKET, and the send pair is the only split. Everything else says the same
 * thing on every row of its group, which is what makes a column of deeds scannable.
 */
export function listDeed(i: RowInputs): string {
  const b = cardBucket(i.card);
  switch (b) {
    case "send": return i.partial ? "Send your partial" : "Send your full manuscript";
    case "decide": return "Reply to the offer";
    case "chase": return "Worth a nudge";
    case "close": return "Consider closing";
    case "fix": return "Fill in what you sent";
    /* a note is the writer's own words — the row renders `title` verbatim and never a deed */
    case "note": return i.card.title;
    default: {
      const unhandled: never = b;
      return unhandled;
    }
  }
}

/* ── the meta ─────────────────────────────────────────────────────────────────────────────── */

/** the contract's separator — a soft dot with its own colour, so it is markup rather than text */
export const META_DOT = " · ";

/** "no agency" / "agent not specified" — the contract's words for a fact the record lacks */
const agencyOf = (i: RowInputs): string => (i.agency || "").trim() || "no agency";
const agentOf = (c: BoardCard): string => (c.who || "").trim() || "agent not specified";

/**
 * Returns the pieces rather than a joined string, because the separator is a styled span. Joining
 * here and splitting in the component is the same fault as splitting `elapsedPhrase` at a call
 * site: the rule about how a line is composed would end up in two places.
 */
export function listMeta(i: RowInputs): string[] {
  const c = i.card;
  const b = cardBucket(c);
  switch (b) {
    case "send":
      /* ⚠️ THE PARTIAL NAMES WHAT WAS ASKED FOR, WHEN THE RECORD HOLDS IT. The ask is the whole
         point of the line — "asked for the first 3 chapters" tells you what to put in the envelope.
         Unrecorded, it falls back to the pair, which is honest rather than inventing a quantity. */
      if (i.partial) {
        return i.ask ? [`${agentOf(c)} asked for ${i.ask}`] : [agentOf(c), agencyOf(i)];
      }
      return [`${agentOf(c)} asked for it`, agencyOf(i)];
    case "decide":
      return i.offeredOn
        ? [`${agentOf(c)} offered representation`, i.offeredOn]
        : [`${agentOf(c)} offered representation`];
    case "chase":
      /* ⚠️ "their stated window" — never "his" or "hers". The app does not know, and an agent is a
         real person whose pronouns it never asked for. */
      return typeof i.days === "number"
        ? [`Quiet for ${elapsedParts(i.days).figure} ${elapsedParts(i.days).unit} — past their stated window`]
        : ["Past their stated window"];
    case "close":
      return [agentOf(c), agencyOf(i)];
    case "fix":
      /* the bulk gap stands for a SET; the single one stands for a query */
      return typeof i.bulkCount === "number" && i.bulkCount > 1
        ? [`${i.bulkCount} imported queries are missing their materials`]
        : [`${agentOf(c)} · imported without materials`];
    case "note":
      return [];
    default: {
      const unhandled: never = b;
      return unhandled;
    }
  }
}

/* ── the right-hand fragment ──────────────────────────────────────────────────────────────── */

/**
 * ⚠️ ONE GRAMMAR FOR EVERY ROW (Option B). Two lines, mono, right-aligned, with a Playfair figure
 * inside. `absent` is its own treatment rather than a missing value: a row with no date says so
 * HERE, in the slot the eye already goes to for a duration, instead of putting the admission in
 * the middle column where the subject belongs.
 */
export interface RowFragment {
  /** the first line, and the second when there is no figure */
  lead: string;
  /** the Playfair numeral — absent on an absent row */
  figure?: string;
  /** what follows the figure on the second line */
  tail?: string;
  /** burgundy figure — Decide only, this run */
  hot?: boolean;
  /** the muted, figure-less treatment */
  absent?: boolean;
}

export function listFragment(i: RowInputs): RowFragment {
  const b = cardBucket(i.card);
  const d = typeof i.days === "number" ? elapsedParts(i.days) : null;

  switch (b) {
    case "send":
      return d ? { lead: "waiting", figure: d.figure, tail: d.unit }
               : { lead: "no date on record", absent: true };
    case "decide":
      /* ⚠️ `.hot` IS DECIDE'S ALONE THIS RUN. Other hot conditions are out of scope by the brief;
         adding one here would put a rule in the list that nothing else knows about. */
      return d ? { lead: "open", figure: d.figure, tail: d.unit, hot: true }
               : { lead: "no date on record", absent: true };
    case "chase":
    case "close":
      return d ? { lead: "quiet for", figure: d.figure, tail: d.unit }
               : { lead: "no date on record", absent: true };
    case "fix":
      return typeof i.bulkCount === "number" && i.bulkCount > 1
        ? { lead: "", figure: String(i.bulkCount), tail: "queries to fill in" }
        : { lead: "no date on record", absent: true };
    case "note":
      return d ? { lead: "added", figure: d.figure, tail: `${d.unit} ago` }
               : { lead: "no date set", absent: true };
    default: {
      const unhandled: never = b;
      return unhandled;
    }
  }
}

/** the pill's word — the existing label map, unchanged; the list only renders it */
export const rowBucket = (c: BoardCard): Bucket => cardBucket(c);
