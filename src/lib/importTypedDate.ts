/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A date typed the way a UK writer writes it (import review, the timeline strip; ref
 * design-refs/import-timeline-strip-v1.html). "22/9", "22-9-26", "22 Sept", "22 September 2026",
 * "22nd Sept", "today", "yesterday". Read DAY FIRST, always. With no year, the most recent such date
 * that is not in the future. A date in the future, or one that is not a date, reads as nothing.
 *
 * Why not functions/src/parseImportDate: it reads "02/13/2024" month first (a spreadsheet can be
 * American), knows no "today" or "yesterday", and anchors a year-less EVENT to the sent date. A writer
 * typing into the review is in none of those cases. Its rules are left as they are.
 *
 * Pure; `today` is passed in (YYYY-MM-DD) so every answer is testable.
 */

import { MONTHS_SHORT } from "./dates";

const pad = (n: number) => String(n).padStart(2, "0");
export const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/* The short forms are the app's one table (lib/dates): "Sep", never "Sept" (ruled 28 Sep). */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Today, in the writer's own time zone, as YYYY-MM-DD. */
export const localToday = (now: Date = new Date()): string => isoOf(now.getFullYear(), now.getMonth() + 1, now.getDate());

const parts = (iso: string): [number, number, number] => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, m, d];
};
const real = (y: number, m: number, d: number): boolean => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};
const shift = (iso: string, days: number): string => {
  const [y, m, d] = parts(iso);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
};

/** A month from its name or any start of it of three letters or more ("sep", "sept", "september"). */
function monthOf(word: string): number {
  const w = word.toLowerCase().replace(/\.$/, "");
  if (w.length < 3) return 0;
  const i = MONTH_NAMES.findIndex((n) => n.toLowerCase().startsWith(w));
  return i + 1;
}

/**
 * The date a writer typed, or null when it is not one, or is in the future.
 * @param text  what was typed
 * @param today YYYY-MM-DD
 */
export function readTypedDate(text: string, today: string): string | null {
  const t = text.trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/,/g, " ").replace(/\s+/g, " ");
  if (!t) return null;
  if (t === "today") return today;
  if (t === "yesterday") return shift(today, -1);

  let d: number, m: number, y: number | null = null, mm: RegExpMatchArray | null;
  if ((mm = t.match(/^(\d{1,2})\s*[/.\-]\s*(\d{1,2})(?:\s*[/.\-]\s*(\d{2}|\d{4}))?$/))) {
    d = Number(mm[1]); m = Number(mm[2]); y = mm[3] ? Number(mm[3]) : null;
  } else if ((mm = t.match(/^(\d{1,2})\s+([a-z]+\.?)(?:\s+(\d{2}|\d{4}))?$/))) {
    d = Number(mm[1]); m = monthOf(mm[2]); y = mm[3] ? Number(mm[3]) : null;
    if (!m) return null;
  } else return null;

  if (y !== null && y < 100) y += 2000;
  if (y === null) {
    const [ty] = parts(today);
    y = ty;
    if (!real(y, m, d)) return real(y - 1, m, d) ? isoOf(y - 1, m, d) : null; // 29 Feb, last leap year
    if (isoOf(y, m, d) > today) y -= 1;
  }
  if (!real(y, m, d)) return null;
  const out = isoOf(y, m, d);
  return out > today ? null : out;
}

/** "15 Sep 2026": the date on a strip tile. */
export const tileDate = (iso: string): string => { const [y, m, d] = parts(iso); return `${d} ${MONTHS_SHORT[m - 1]} ${y}`; };
/** "Tuesday, 22 September 2026": the date said back under the field. */
export const longDate = (iso: string): string => {
  const [y, m, d] = parts(iso);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
};
export const monthTitle = (y: number, m: number): string => `${MONTH_NAMES[m - 1]} ${y}`;

/** One month for the calendar, Monday first: the blanks before the 1st, then each day's ISO date. */
export function monthGrid(y: number, m: number): { lead: number; days: string[] } {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = Sunday
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { lead: (first + 6) % 7, days: Array.from({ length: count }, (_, i) => isoOf(y, m, i + 1)) };
}
/** The month after (+1) or before (−1) y/m. */
export const stepMonth = (y: number, m: number, by: 1 | -1): [number, number] => {
  const k = y * 12 + (m - 1) + by;
  return [Math.floor(k / 12), (k % 12) + 1];
};
