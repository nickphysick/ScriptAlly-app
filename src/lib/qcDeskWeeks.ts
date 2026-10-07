/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK'S WEEKLY BARS (Query Centre v131 §2). Twelve weeks per section, the current week last:
 *
 *   With you        — status changes INTO partial requested, full requested, offer or R&R that week
 *   With the agent  — queries sent that week
 *   Closed          — queries closed that week
 *
 * ⚠️ EVERY DATE IS READ FROM THE ROW'S OWN DERIVATION, NEVER RE-DERIVED. `QcRow.history` is
 * `stageHistory` (document dates first, then the query's own dated rungs), `sentMs` is the send and
 * `stageStartMs` is the day a closed query reached its close — null when nothing dates it. So the bars
 * and every other date on the page come from one place and cannot disagree.
 *
 * ⚠️ NOTHING IS ESTIMATED. An undated step (a provisional import's rung, or the fallback span
 * `stageHistory` draws for an undated current stage) is not placed in any week; `undated` counts them
 * so the report can say how many there were.
 *
 * ⚠️ WEEKS START ON MONDAY IN EUROPE/LONDON, by the London calendar — not by UTC and not by the
 * browser's zone — so a send at 00:30 BST on a Monday belongs to that Monday's week even though it is
 * still Sunday in UTC.
 */
import { QueryStatus } from "../types";
import { tileCourt, type QcRow, type TileCourt } from "./qcSummary";

export const DESK_WEEKS = 12;
const DAY = 86_400_000;
const ZONE = "Europe/London";

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
});
const WD: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** The London wall-clock parts of an instant. */
function london(ms: number): { y: number; m: number; d: number; h: number; min: number; wd: number } {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, wd: WD[p.weekday as string] };
}

/** The instant of London midnight on a London calendar day (the offset is 0 or +1h; resolved, never assumed). */
export function londonMidnight(y: number, m: number, d: number): number {
  const guess = Date.UTC(y, m - 1, d);
  for (const off of [0, -3_600_000, 3_600_000]) {
    const t = guess + off;
    const p = london(t);
    if (p.y === y && p.m === m && p.d === d && p.h === 0 && p.min === 0) return t;
  }
  /* unreachable for Europe/London, whose midnight always exists */
  return guess;
}

/** The start (London Monday 00:00) of the week holding `ms`. */
export function weekStart(ms: number): number {
  const p = london(ms);
  const day = new Date(Date.UTC(p.y, p.m - 1, p.d) - p.wd * DAY);
  return londonMidnight(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate());
}

/** The twelve week starts, oldest first, the current week last. Steps by the London CALENDAR, so a
 *  week that contains a clock change is still a calendar week (167 or 169 hours, never 168 assumed). */
export function deskWeeks(nowMs: number, n = DESK_WEEKS): number[] {
  const out: number[] = [weekStart(nowMs)];
  while (out.length < n) {
    const p = london(out[0]);
    const prev = new Date(Date.UTC(p.y, p.m - 1, p.d) - 7 * DAY);
    out.unshift(londonMidnight(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate()));
  }
  return out;
}

/** Statuses whose ENTRY counts for the with-you section. */
export const WITH_YOU_ENTRIES: readonly QueryStatus[] = [
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.OFFER, QueryStatus.REVISE_RESUBMIT,
];

/** The dated events each section counts, from the rows' own derivation. */
export function deskEvents(rows: readonly QcRow[]): Record<TileCourt, number[]> & { undated: Record<TileCourt, number> } {
  const you: number[] = [], agent: number[] = [], closed: number[] = [];
  const undated = { you: 0, agent: 0, closed: 0 };
  for (const r of rows) {
    /* with you: every dated entry into a with-you stage — whatever court the query stands in now */
    for (const s of r.history.spans) {
      if (!WITH_YOU_ENTRIES.includes(s.status)) continue;
      if (s.current && !r.history.dated) { undated.you += 1; continue; }
      you.push(s.startMs);
    }
    /* a with-you stage the query stands at with no dated entry and no span */
    if (WITH_YOU_ENTRIES.includes(r.status) && !r.history.spans.some((s) => s.current)) undated.you += 1;
    /* with the agent: the send */
    if (r.sentMs != null) agent.push(r.sentMs); else undated.agent += 1;
    /* closed: the close, for the queries the closed section counts */
    if (tileCourt(r.status) === "closed") {
      if (r.stageStartMs != null) closed.push(r.stageStartMs); else undated.closed += 1;
    }
  }
  return { you, agent, closed, undated };
}

export interface DeskBars {
  /** Week starts, oldest first; the last is the current week. */
  weeks: number[];
  counts: number[];
  /** Events dated before the first week or after now — outside the window, not counted. */
  outside: number;
}

/** Counts per week over the twelve-week window ending with the current week. */
export function bucket(eventsMs: readonly number[], nowMs: number, n = DESK_WEEKS): DeskBars {
  const weeks = deskWeeks(nowMs, n);
  const counts = weeks.map(() => 0);
  let outside = 0;
  for (const t of eventsMs) {
    if (t < weeks[0] || t > nowMs) { outside += 1; continue; }
    let i = weeks.length - 1;
    while (i > 0 && t < weeks[i]) i -= 1;
    counts[i] += 1;
  }
  return { weeks, counts, outside };
}

/** The three sections' bars. */
export function deskBars(rows: readonly QcRow[], nowMs: number): Record<TileCourt, DeskBars> & { undated: Record<TileCourt, number> } {
  const ev = deskEvents(rows);
  return {
    you: bucket(ev.you, nowMs),
    agent: bucket(ev.agent, nowMs),
    closed: bucket(ev.closed, nowMs),
    undated: ev.undated,
  };
}

/** "W/C 11 AUG" — the week's Monday by the London calendar. */
export function weekLabel(startMs: number): string {
  const p = london(startMs);
  const mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][p.m - 1];
  return `W/C ${p.d} ${mon}`;
}

/** What a bar counts, in words (§2's tooltip): "4 queries sent". */
export const BAR_UNIT: Record<TileCourt, [string, string]> = {
  you: ["request or offer in", "requests and offers in"],
  agent: ["query sent", "queries sent"],
  closed: ["query closed", "queries closed"],
};
export const barText = (court: TileCourt, startMs: number, n: number): string =>
  `${weekLabel(startMs)} · ${n} ${BAR_UNIT[court][n === 1 ? 0 : 1]}`;
