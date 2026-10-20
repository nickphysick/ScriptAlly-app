/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import's wait, in numbers the loader can say out loud: how many rows the file holds, how
 * long that should take, and how long is left. Pure — no clock of its own, no DOM.
 */

/** A line of the converted text that holds nothing: separators, quotes and whitespace only. */
const isBlank = (line: string) => /^[,\s"]*$/.test(line);

/** The heading the conversion gives each sheet when a workbook has more than one with data. */
const SHEET_HEADING = /^### Sheet: /;

/**
 * The file's data-row count, from the exact text Smart Import sends — so the loader can say
 * "150 rows" before a single row has been read.
 *
 * Per sheet (split on the conversion's `### Sheet:` headings): the first non-blank line is taken as
 * the header and every later non-blank line as a row. That is exact for a tidy sheet. It OVER-counts
 * by every non-data line that isn't blank — a title above the header, a pasted duplicate header, a
 * totals line, a "TBC" placeholder — because telling those from rows is the model's job, not this
 * function's. The loader caps "row d of N" at N, and the count is reconciled when the read ends.
 */
export function countDataRows(text: string): number {
  const sections: string[][] = [[]];
  for (const line of text.split("\n")) {
    if (SHEET_HEADING.test(line)) { sections.push([]); continue; }
    sections[sections.length - 1].push(line);
  }
  let rows = 0;
  for (const lines of sections) {
    const filled = lines.filter((l) => !isBlank(l));
    rows += Math.max(0, filled.length - 1);
  }
  return rows;
}

/** Where a read has got to, as the loader shows it. */
export type LoaderPhase = "opening" | "reading" | "tidying" | "retry";

export interface LoaderProgress {
  /** The file's row count (countDataRows), known before the call. */
  rowsTotal: number;
  /** Rows the server has read so far — capped at rowsTotal. */
  rowsDone: number;
  phase: LoaderPhase;
  /** "live" while the server's row count is arriving (or may yet); "none" once it cannot — the
   *  plain call is in use, or nothing has arrived for QUIET_AFTER_MS (a server that predates the
   *  stream). With "none" the loader runs on the clock against the estimate. */
  stream: "live" | "none";
}

export const PROGRESS_START: LoaderProgress = { rowsTotal: 0, rowsDone: 0, phase: "opening", stream: "live" };

/** One update from the import call, applied to the loader's progress. Pure. */
export function applyImportUpdate(
  p: LoaderProgress,
  u: { type: "start"; rowsTotal: number } | { type: "rows"; rows: number } | { type: "retry" } | { type: "quiet" } | { type: "plain" } | { type: "result" },
): LoaderProgress {
  switch (u.type) {
    case "start": return { ...PROGRESS_START, rowsTotal: u.rowsTotal };
    case "rows": return { ...p, phase: "reading", stream: "live", rowsDone: Math.min(Math.max(0, u.rows), p.rowsTotal) };
    case "retry": return { ...p, phase: "retry", rowsDone: 0 };
    case "quiet": return p.phase === "opening" ? { ...p, stream: "none" } : p;
    case "plain": return { ...p, phase: "opening", stream: "none", rowsDone: 0 };
    case "result": return { ...p, phase: "tidying" };
  }
}
