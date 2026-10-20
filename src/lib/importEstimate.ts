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
  /** Rows the server has counted so far — NOT capped: the counter is an estimate from the model's
   *  output (half its records), so it can pass rowsTotal on a sheet where one row holds two agents or
   *  countDataRows skipped blank rows. footBar decides what each part of the bar may claim from it. */
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
    case "rows": return { ...p, phase: "reading", stream: "live", rowsDone: Math.max(0, u.rows) };
    case "retry": return { ...p, phase: "retry", rowsDone: 0 };
    case "quiet": return p.phase === "opening" ? { ...p, stream: "none" } : p;
    case "plain": return { ...p, phase: "opening", stream: "none", rowsDone: 0 };
    case "result": return { ...p, phase: "tidying" };
  }
}

// ── The foot bar's words (loader v2; built to design-refs/onboarding/smart-import-loader-v2) ──────

/** The up-front estimate, in seconds. Deliberately slower than the measured 0.6 s a row (0.5 s +
 *  0.60 s/row, reports/smart-import-quickfixes/), so a countdown finishes early rather than overruns. */
export const estSeconds = (rowsTotal: number) => 0.5 + 0.7 * rowsTotal;

const nearestTen = (sec: number) => Math.max(10, Math.round(sec / 10) * 10);
const halfMinutes = (sec: number) => Math.round(sec / 30) / 2;
const minutesText = (m: number) => `about ${Math.floor(m)}${m % 1 ? "½" : ""} minutes`;

/** "a few seconds" · "about 30 seconds" · "about a minute" · "about 2 minutes" · "about 3½ minutes". */
export function fmtEst(sec: number): string {
  if (sec < 20) return "a few seconds";
  if (sec < 50) return `about ${nearestTen(sec)} seconds`;
  if (sec < 80) return "about a minute";
  return minutesText(halfMinutes(sec));
}

/** The same scale, for what is left: "a few seconds left" … "about 2½ minutes left". Negative reads as
 *  "a few seconds left" — never a negative number. */
export function fmtLeft(sec: number): string {
  if (sec < 10) return "a few seconds left";
  if (sec < 45) return `about ${nearestTen(sec)} seconds left`;
  if (sec < 80) return "about a minute left";
  return `${fmtEst(sec)} left`;
}

/**
 * Every distinct fmtLeft label as a rung on one ladder: 0 "a few seconds", 1–4 "about 10/20/30/40
 * seconds", 5 "about a minute", then 6, 7, 8… for 1½, 2, 2½… minutes. The ladder is what the smoothing
 * moves along: one rung per update at most, so the label can never leap.
 */
export function leftRung(sec: number): number {
  if (sec < 10) return 0;
  if (sec < 45) return nearestTen(sec) / 10;
  if (sec < 80) return 5;
  return 6 + (halfMinutes(sec) - 1.5) * 2;
}
export function rungLabel(rung: number): string {
  if (rung <= 0) return "a few seconds left";
  if (rung <= 4) return `about ${rung * 10} seconds left`;
  if (rung === 5) return "about a minute left";
  return `${minutesText(1.5 + (rung - 6) / 2)} left`;
}
/** Smoothing: move at most one rung from `prev` towards `target` (null = no previous label). */
export const stepRung = (prev: number | null, target: number) =>
  prev === null ? target : prev + Math.sign(target - prev);

/** Seconds left: the estimate until the first 6 rows are in, then the observed pace. */
export function secondsLeft(rowsTotal: number, rowsDone: number, elapsedS: number): number {
  if (rowsDone < 6) return estSeconds(rowsTotal) - elapsedS;
  return (rowsTotal - rowsDone) * (elapsedS / rowsDone) + 1;
}

export interface FootInput {
  progress: LoaderProgress;
  /** Seconds since the read began — and since a retry began, for the retry's fresh estimate. */
  elapsedS: number;
  sinceRetryS: number;
  /** The loader has finished its settle: every shown card has crystallised. */
  ready: boolean;
  /** The time-left rung shown last (smoothing), or null. */
  rung: number | null;
}
export interface FootBar {
  left: string;
  right: string;
  /** Bar fill in %, or null for the indeterminate shimmer. */
  fill: number | null;
  /** The rung now shown, to feed back in as `rung` next time (null when no countdown is shown). */
  rung: number | null;
}

/** The ready line's left text — the loader's READY_TXT, held equal to it by a test. */
export const FOOT_READY = "Ready";

/** Everything the foot bar shows, from where the read has got to. Pure. */
export function footBar(i: FootInput): FootBar {
  const { rowsTotal: N, rowsDone, phase, stream } = i.progress;
  const d = Math.min(rowsDone, N);
  const est = estSeconds(N);
  const countdown = (sec: number) => { const r = stepRung(i.rung, leftRung(sec)); return { right: rungLabel(r), rung: r }; };

  if (i.ready) return { left: FOOT_READY, right: `${N} of ${N} rows read`, fill: 100, rung: null };
  if (phase === "tidying") return { left: "Tidying records…", right: "almost there", fill: 100, rung: null };
  if (phase === "retry") return { left: "Having another look…", ...countdown(est - i.sinceRetryS), fill: 2 };
  if (stream === "none") {
    // No count is coming: fill by the clock against the estimate, held at 90% until the result.
    const fill = Math.min(90, (i.elapsedS / est) * 100);
    if (i.elapsedS >= est) return { left: "Reading your file…", right: "almost there", fill, rung: null };
    return { left: "Reading your file…", ...countdown(est - i.elapsedS), fill };
  }
  if (phase === "opening") return { left: "Opening your file…", right: `${N} rows · ${fmtEst(est)}`, fill: null, rung: null };
  if (d === 0) return { left: "Reading your first rows…", right: `${N} rows · ${fmtEst(est)}`, fill: null, rung: null };
  // The fill's span is max(N, count + 1), so while the stream runs the fraction is always below one:
  // below N it is d / N exactly; at N and past it (the counter overshooting) it keeps creeping towards
  // 96% and never reaches it. 100% is the result's alone (tidying, above) — the stream's end, never a
  // count. And from N on there is no honest countdown left to give, so the time left says so.
  const fill = 2 + (rowsDone / Math.max(N, rowsDone + 1)) * 94;
  if (rowsDone >= N) return { left: `Reading row ${N} of ${N}`, right: "almost there", fill, rung: null };
  return { left: `Reading row ${d} of ${N}`, ...countdown(secondsLeft(N, d, i.elapsedS)), fill };
}
