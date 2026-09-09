/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The window's own derivations — where today falls, which months the span touches, and the dates
 * the rail writes. Pure functions of `(visible, today, days)` and nothing else.
 *
 * ⚠️ SHARED BECAUSE BOTH BOARDS NEED THEM, AND MOVED VERBATIM. They were three `useMemo` bodies in
 * `TodoCalendarPage`; the hooks stay at the call sites and only the arithmetic moved, so the two
 * pages cannot compute a different rail for the same ninety days. A second implementation here
 * would not disagree in detail — it would put the same date at two x positions.
 */

import { shortCalDate } from "../../../lib/todoCalendar";

export type BoardMonth = { key: string; label: string; at: number; labelAt: number; current: boolean; past: boolean };
export type BoardDateLabel = { ymd: string; at: number; text: string; day: string; mon: string; now: boolean };

/**
 * ⚠️ FRACTIONAL, AND DELIBERATELY: today's MIDPOINT (`index + 0.5`), which is what puts the line
 * half a day into the day rather than on its boundary. An array index has to be a whole number, so
 * anything anchoring a stride on this directly must round it first.
 */
export function todayAtOf(visible: readonly string[], today: string): number | null {
  const i = visible.indexOf(today);
  return i < 0 ? null : i + 0.5;
}

export function monthsOf(visible: readonly string[], today: string): BoardMonth[] {

    const out: { key: string; label: string; at: number; labelAt: number; current: boolean; past: boolean }[] = [];
    const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    let i = 0;
    while (i < visible.length) {
      const d = new Date(`${visible[i]}T12:00:00`);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let j = i;
      while (j + 1 < visible.length) {
        const n = new Date(`${visible[j + 1]}T12:00:00`);
        if (`${n.getFullYear()}-${n.getMonth()}` !== key) break;
        j += 1;
      }
      const nowM = new Date(`${today}T12:00:00`);
      const current = `${nowM.getFullYear()}-${nowM.getMonth()}` === key;
      const tAt = visible.indexOf(today);
      /* the current month labels in the half AFTER today; every other centres in its own span */
      const labelAt = current && tAt >= i && tAt <= j ? (tAt + j + 1) / 2 : (i + j + 1) / 2;
      out.push({
        key, label: SHORT[d.getMonth()], at: i, labelAt, current,
        past: !current && visible[j] < today,
      });
      i = j + 1;
    }
    return out;
}

export function dateLabelsOf(
  visible: readonly string[], today: string, days: number, todayAt: number | null,
): BoardDateLabel[] {

    const out: { ymd: string; at: number; text: string; day: string; mon: string; now: boolean }[] = [];
    const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    if (todayAt == null) return out;
    /* ⚠️ `todayAt` IS FRACTIONAL — it is the MIDPOINT of today's day cell (`index + 0.5`), which is
       what puts today's line half a day into the day rather than on its boundary. An array index
       has to be a whole number, so anchoring the stride on it directly asked `visible[2.5]` and got
       `undefined` every time: no tiles, no error, and a green build. The rail simply emptied, and
       only the screenshot said so. `calSurface60.measure.ts` asserts the tile COUNT for exactly
       this reason — a probe that finds no element otherwise reports no offence. */
    const todayIdx = Math.floor(todayAt);
    const first = todayIdx % 7;
    for (let d = first; d < days; d += 7) {
      const ymd = visible[d];
      if (!ymd) continue;
      const frac = d / Math.max(1, days - 1);
      if (frac < 0.015 || frac > 0.985) continue;
      const dt = new Date(`${ymd}T12:00:00`);
      out.push({
        ymd, at: d, text: shortCalDate(ymd),
        day: String(dt.getDate()),
        mon: (SHORT[dt.getMonth()] ?? "").toUpperCase(),
        /* the tile whose week contains today — the ref's `now = (k <= 0 && 0 < k + 7)` */
        now: d <= todayIdx && todayIdx < d + 7,
      });
    }
    return out;
}

/** The window's span in words, as the winbar states it. */
export function windowRangeLabelOf(visible: readonly string[]): string {
  const a = visible[0], b = visible[visible.length - 1];
  if (!a || !b) return "";
  const d = (ymd: string) => {
    const [y, m, dd] = ymd.split("-").map(Number);
    return { y, txt: `${dd} ${new Date(y, m - 1, dd).toLocaleString("en-GB", { month: "long" })}` };
  };
  const A = d(a), B = d(b);
  return A.y === B.y ? `${A.txt} – ${B.txt} ${B.y}` : `${A.txt} ${A.y} – ${B.txt} ${B.y}`;
}

/**
 * Has the reader paged away from today?
 *
 * ⚠️ IT ASKS WHETHER TODAY IS STILL AT THE WINDOW'S CENTRE rather than comparing the window's start
 * to today's date — the two are the same question only while the centring never changes, and the
 * centre is what the reader actually sees.
 */
export function movedOffTodayOf(todayAt: number | null, days: number): boolean {
  return todayAt == null || Math.abs(todayAt - (days - 1) / 2) > 0.51;
}
