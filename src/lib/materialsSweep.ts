/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * materialsSweep — the bulk record gap's PURE model.
 *
 * ⚠️ IT IS A COHORT, AND THE PAGE ALREADY HAS A GRAMMAR FOR ONE. `PaneSweep` established it for the
 * housekeeping rules: stacked rows in the same card shell, a per-row skip, and a foot whose primary
 * states its own count and is inert at zero. This reuses that grammar rather than inventing a
 * second bulk surface — its own note is the reason: "a cohort is not a different kind of object
 * from a task; giving it its own chrome would teach that the page has two work surfaces".
 *
 * ⚠️ BUT IT IS NOT `PaneSweep`, AND THE DIFFERENCE IS STRUCTURAL RATHER THAN COSMETIC. That surface
 * keys on an AGENT (`agentId`) and collects ONE answer per row from a chip list. This keys on a
 * QUERY and collects FOUR — three ticks and a sized sample. Bending `SweepRow` to hold a material
 * set would distort the shape three live housekeeping rules depend on, so the row model is its own
 * and the visual contract is shared.
 *
 * ⚠️ THE BRIEF ASKED FOR A FULL-WIDTH TABLE. The pane is 378px — measured — so a four-column tick
 * table cannot render there, and the established contract says a cohort stays in the card shell.
 * The columns become a row's own lines instead: who and when on top, the ticks beneath. Same
 * information, same order, one surface.
 */
import {
  materialRowsFromAgent, materialsWantedFromRows, willRecordText, type MaterialRow,
} from "./agentMaterials";

/** How many rows show before the disclosure. The rest are one press away, never gone. */
export const SWEEP_VISIBLE_ROWS = 5;

export interface RecordSweepRow {
  /** The write target and the row's identity. */
  queryId: string;
  agentName: string;
  agency?: string;
  /** The existing send, for reading — this surface never asks for a date. */
  sentOn: string;
  sentMs: number;
  /** The four rows for THIS query, all off until the writer says otherwise. */
  rows: MaterialRow[];
  /** What THIS agency asks for — the per-row source of "start from what each agent asks for". */
  asks: MaterialRow[];
  skipped: boolean;
}

/** A row counts when it is not skipped and something is actually ticked. */
export const rowHasAnswer = (r: RecordSweepRow): boolean =>
  !r.skipped && materialsWantedFromRows(r.rows).length > 0;

/** The figure the primary states — never a percentage, never a progress bar. */
export const sweepAnsweredCount = (rows: readonly RecordSweepRow[]): number =>
  rows.filter(rowHasAnswer).length;

/**
 * ⚠️ THE PRIMARY STATES ITS OWN COUNT, and agrees in number. "Record 1 query" and "Record 6
 * queries" — a label reading "Record 1 queries" is the kind of thing a reader stops trusting.
 */
export function sweepActLabel(n: number): string {
  return n === 1 ? "Record 1 query" : `Record ${n} queries`;
}

/**
 * ⚠️ FILL FROM WHAT EACH AGENT ASKS FOR — and "each" is the whole point. This is not one template
 * applied to every row: row three gets row three's agency's requirements. A package-for-all button
 * would state that every send carried the same parcel, which is exactly the untruth the caveat
 * below exists to prevent.
 *
 * A row whose agency has nothing on file is LEFT ALONE rather than emptied — the button fills what
 * it can and says nothing about the rest.
 */
export function fillFromAsks(rows: readonly RecordSweepRow[]): RecordSweepRow[] {
  return rows.map((r) => (r.skipped || r.asks.length === 0
    ? r
    : { ...r, rows: mergeAsks(r.rows, r.asks) }));
}

/** The agent's ticked rows laid over the four, so nothing the writer already set is discarded. */
function mergeAsks(current: readonly MaterialRow[], asks: readonly MaterialRow[]): MaterialRow[] {
  const out = current.map((r) => ({ ...r }));
  const sampleAsks = asks.filter((a) => a.kind === "qty" && a.on);
  return out.map((r) => {
    if (r.kind === "qty") {
      const a = sampleAsks[0];
      return a && a.kind === "qty" ? { ...r, on: true, unit: a.unit, amount: a.amount } : r;
    }
    const a = asks.find((x) => x.key === r.key && x.on);
    if (!a) return r;
    if (r.kind === "text" && a.kind === "text") return { ...r, on: true, text: a.text };
    return { ...r, on: true };
  }) as MaterialRow[];
}

/**
 * ⚠️ COPY THE FIRST ROW DOWN — the honest second fill. Most writers send the same parcel to most
 * agencies, and saying so once is faster than fourteen times. It copies the FIRST VISIBLE row's
 * answers, skips rows the writer has skipped, and leaves the first row alone.
 */
export function copyFirstDown(rows: readonly RecordSweepRow[]): RecordSweepRow[] {
  const first = rows.find((r) => !r.skipped);
  if (!first) return [...rows];
  return rows.map((r) => (r === first || r.skipped
    ? r
    : { ...r, rows: first.rows.map((x) => ({ ...x })) }));
}

/**
 * ⚠️ THE CAVEAT IS THE PRICE OF THE FILL BUTTON. "Start from what each agent asks for" reads an
 * agency's GUIDELINES, which say what they wanted and never what was posted. A writer who presses
 * it and saves without reading has recorded a guess as a fact, and nothing downstream can tell the
 * two apart afterwards.
 */
/**
 * ⚠️ THE CONTRACT'S OWN SENTENCE, VERBATIM (finishing round, Phase 6). It read "…what each agency
 * asks for … Check each row before recording" — true, and two sentences where the contract has one.
 * The second half was an instruction; the line's job is to say what the fill IS, so that the writer
 * knows the ticks it produced are a starting point rather than a record.
 */
export const SWEEP_CAVEAT =
  "Requirements are what the agent asks for — not proof of what you sent.";

/** What one row will write, in words — the same reading the single form's strip states. */
export const sweepRowSummary = (r: RecordSweepRow): string | null => willRecordText(r.rows, "and");

/** Build a row from a gap plus the agent's own requirements. Every material row starts OFF. */
export function recordSweepRow(
  gap: { queryId: string; agentName: string; sentMs: number },
  opts: { agency?: string; sentOn: string; agentMaterials?: readonly string[] },
): RecordSweepRow {
  return {
    queryId: gap.queryId,
    agentName: gap.agentName,
    ...(opts.agency ? { agency: opts.agency } : {}),
    sentOn: opts.sentOn,
    sentMs: gap.sentMs,
    /* ⚠️ FROM AN EMPTY LIST, NOT FROM THE AGENT — the shape is `materialRowsFromAgent`'s own and
       nothing arrives pre-ticked. The agency's requirements live in `asks`, behind the button. */
    rows: materialRowsFromAgent([]),
    asks: materialRowsFromAgent(opts.agentMaterials).filter((r) => r.on),
    skipped: false,
  };
}

/** The writes the commit performs — one per answered row, and nothing for the rest. */
export function sweepWrites(rows: readonly RecordSweepRow[]): { queryId: string; materialsWanted: string[] }[] {
  return rows.filter(rowHasAnswer).map((r) => ({
    queryId: r.queryId,
    materialsWanted: materialsWantedFromRows(r.rows),
  }));
}
