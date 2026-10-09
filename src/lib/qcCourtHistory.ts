/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE RUNNING COUNT (Query Centre v131.1 §0.2) — which court each query stood in at the end of each of
 * the last ten weeks, so the desk's cards can draw how many sat with you, with agents and closed.
 *
 * ⚠️ IT READS THE QUERY'S OWN DATED HISTORY, NEVER ITS CURRENT STATUS. `QcRow.history` is
 * `stageHistory` — document dates first, then the query's own dated rungs, ordered by the same
 * `queryDerivation` primitive the Tracking tab's timeline reads — so a query that moved to with-you in
 * week five is counted with agents for weeks one to four. Reading today's status for every week would
 * draw a flat line at today's numbers, which is exactly the claim a trend must not make.
 *
 * ⚠️ NOTHING IS ESTIMATED. Where the stage a query stands at now has no dated entry, `stageHistory`
 * supplies a fallback span from the last thing anything dated; WHEN the query moved into that stage is
 * unknown, so from that point until now the query is in no week's count (`undated` says how many such
 * queries there are). At now itself the court is a fact — today's status — so the last point always
 * equals the card's big number.
 *
 * ⚠️ WEEKS ARE LONDON CALENDAR WEEKS, Monday first (`deskWeeks`, the v131 desk's own), and a week's
 * point is its last instant — or now, for the current week.
 */
import { tileCourt, type QcRow, type TileCourt } from "./qcSummary";
import { deskWeeks, monthStart } from "./qcDeskWeeks";

/** Ten points, one a week; the last is now. */
export const TREND_WEEKS = 10;

/**
 * The court a query stood in at instant `t` — null when it had not been sent yet, or when its stage at
 * `t` is not known (an undated move into the stage it stands at now).
 */
export function courtAt(row: QcRow, t: number, nowMs: number): TileCourt | null {
  if (t >= nowMs) return tileCourt(row.status);
  const spans = row.history.spans;
  if (!spans.length || t < spans[0].startMs) return null;
  let at = spans[0];
  for (const s of spans) { if (s.startMs <= t) at = s; else break; }
  /* the move into today's stage is undated: after the last dated event, the stage is unknown */
  if (at.current && !row.history.dated) return null;
  return tileCourt(at.status);
}

/** How many queries stood in `court` at instant `t`. */
export const countAt = (rows: readonly QcRow[], court: TileCourt, t: number, nowMs: number): number =>
  rows.reduce((n, r) => n + (courtAt(r, t, nowMs) === court ? 1 : 0), 0);

export interface CourtSeries {
  /** The ten week starts (London Mondays), oldest first. */
  weeks: number[];
  /** The instant each point is read at: the end of its week, or now for the last. */
  at: number[];
  you: number[];
  agent: number[];
  closed: number[];
  /** Queries whose move into today's stage is undated — absent from every point but the last. */
  undated: number;
}

export function courtSeries(rows: readonly QcRow[], nowMs: number): CourtSeries {
  const weeks = deskWeeks(nowMs, TREND_WEEKS);
  const at = weeks.map((w, i) => (i < weeks.length - 1 ? weeks[i + 1] - 1 : nowMs));
  const of = (c: TileCourt) => at.map((t) => countAt(rows, c, t, nowMs));
  return {
    weeks, at, you: of("you"), agent: of("agent"), closed: of("closed"),
    undated: rows.filter((r) => !r.history.dated).length,
  };
}

/**
 * MONTH ON MONTH (v134 §2): the court's count now, minus its count at the last instant of the previous
 * London calendar month — two points of the same running count the chart draws. Nothing is estimated:
 * a query whose move into today's stage is undated is in the "now" figure and in no earlier one, exactly
 * as it is in the series.
 */
export const monthChange = (rows: readonly QcRow[], court: TileCourt, nowMs: number): number =>
  countAt(rows, court, nowMs, nowMs) - countAt(rows, court, monthStart(nowMs) - 1, nowMs);

/** "3 since last month" beside its arrow; "No change since last month" with none. */
export const monthText = (d: number): string => (d === 0 ? "No change since last month" : `${Math.abs(d)} since last month`);
