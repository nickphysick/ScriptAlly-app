/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.5 §C — THE WEEKLY CHART's model: how many of the manuscript's queries were first sent in each of
 * the last twelve weeks, ending with this week.
 *
 * ⚠️ THE WEEK IS THE DASHBOARD'S OWN: Monday 00:00 in the user's own time zone (`isoWeekStart`,
 *    `trailingWeekStarts` in lib/dashboardStats), so this card and the dashboard's send chart cannot disagree about
 *    which week a query fell in. A query counts in the week holding its first-queried date (`QcRow.sentMs`, read
 *    from `dateSent`); an undated query counts in none.
 * ⚠️ THE STEP BETWEEN WEEKS IS ROUNDED, not floored: across a clock change a week is 167 or 169 hours, and a floor
 *    would put Monday's queries in the week before.
 */
import { isoWeekStart, trailingWeekStarts } from "./dashboardStats";
import { MONTHS_SHORT } from "./dates";

export const SENT_WEEKS = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface SentWeek { start: number; n: number }

/** the twelve weeks, oldest first, this week last, each with its count */
export function sentWeeks(sentMs: readonly (number | null | undefined)[], nowMs: number, bins = SENT_WEEKS): SentWeek[] {
  const starts = trailingWeekStarts(new Date(nowMs), bins).map((d) => d.getTime());
  const out = starts.map((start) => ({ start, n: 0 }));
  const last = starts[bins - 1];
  for (const t of sentMs) {
    if (t == null || !Number.isFinite(t)) continue;
    const idx = bins - 1 - Math.round((last - isoWeekStart(new Date(t)).getTime()) / WEEK_MS);
    if (idx >= 0 && idx < bins) out[idx].n++;
  }
  return out;
}

/** "This week" · "Last week" · "Week of 4 Aug" */
export function weekName(i: number, weeks: readonly SentWeek[]): string {
  if (i === weeks.length - 1) return "This week";
  if (i === weeks.length - 2) return "Last week";
  const d = new Date(weeks[i].start);
  return `Week of ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** a bar's height as a share of its column: n / max(2, the largest week), never under 8%; an empty week is a stub */
export function barShare(n: number, weeks: readonly SentWeek[]): number {
  if (n <= 0) return 0;
  const top = Math.max(2, ...weeks.map((w) => w.n));
  return Math.max(0.08, n / top);
}

export const queriesWord = (n: number): string => (n === 1 ? "query" : "queries");
