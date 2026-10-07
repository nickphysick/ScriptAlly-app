/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK'S LONDON WEEKS (Query Centre v131 §2, kept by v131.1). The v131 desk's twelve weekly bars
 * (arrivals per week) are RETIRED with v131.1's ledger cards; what survives is the calendar they were
 * counted on, which the cards' running-count trend reads (`lib/qcCourtHistory`). Recover the bars from
 * `847b5f31` if they are ever wanted back.
 *
 * ⚠️ WEEKS START ON MONDAY IN EUROPE/LONDON, by the London calendar — not by UTC and not by the
 * browser's zone — so a send at 00:30 BST on a Monday belongs to that Monday's week even though it is
 * still Sunday in UTC.
 */

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

/** "W/C 11 AUG" — the week's Monday by the London calendar. */
export function weekLabel(startMs: number): string {
  const p = london(startMs);
  const mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][p.m - 1];
  return `W/C ${p.d} ${mon}`;
}
