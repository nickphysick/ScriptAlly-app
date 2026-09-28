/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The query drawer's date vocabulary (design-refs/query-actions-v11.html §3.1).
 *
 * Every date the drawer holds is a LOCAL calendar day — a `Date` at local midnight — because every
 * question it asks is a day question ("sent on", "remind me on"). Times of day enter only at the
 * write, where the existing writers clamp them against the log.
 *
 * ⚠️ "TODAY" IS A PARAMETER, NEVER `new Date()` INSIDE A HELPER. The mock pins it to Sun 27 Sep 2026;
 * the app passes the real day. A helper that reached for the clock itself could not be tested at a
 * weekend boundary, which is exactly where the weekend shift lives.
 */
import { MONTHS_SHORT } from "../dates";

export const MON = MONTHS_SHORT;
export const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local midnight of the day `d` falls on. */
export const dayOf = (d: Date | string | number): Date => {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
};
export const todayDay = (): Date => dayOf(new Date());
export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const sameDay = (a: Date | null | undefined, b: Date | null | undefined): boolean =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
/** Whole calendar days from `b` to `a` (positive when `a` is later). */
export const dayDiff = (a: Date, b: Date): number =>
  Math.round((dayOf(a).getTime() - dayOf(b).getTime()) / 864e5);

/** `Sun 27 Sep` */
export const fmt = (d: Date): string => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
/** `Sun 27 Sep 2026` */
export const fmtY = (d: Date): string => `${fmt(d)} ${d.getFullYear()}`;
/** `27 SEP` */
export const up = (d: Date): string => `${d.getDate()} ${MON[d.getMonth()]}`.toUpperCase();
/** `27 Sep` — a chip's small date. */
export const dm = (d: Date): string => `${d.getDate()} ${MON[d.getMonth()]}`;

/** `today` · `yesterday` · `in 3 days` · `2 weeks ago` · `in 3 months` — relative to `today`. */
export function rel(d: Date, today: Date): string {
  const n = dayDiff(d, today);
  if (n === 0) return "today";
  if (n === -1) return "yesterday";
  if (n === 1) return "tomorrow";
  if (n < 0) {
    const a = -n;
    return a < 14 ? `${a} days ago` : a < 63 ? `${Math.round(a / 7)} weeks ago` : `${Math.round(a / 30)} months ago`;
  }
  return n < 14 ? `in ${n} days` : n < 63 ? `in ${Math.round(n / 7)} weeks` : `in ${Math.round(n / 30)} months`;
}

export const isWeekend = (d: Date): boolean => d.getDay() === 0 || d.getDay() === 6;
/**
 * A reminder that lands on a Saturday or a Sunday moves to the Monday. Applied to REMINDER and
 * to-do dates only — never to a date the writer or an agent stated, which is a fact and not a plan.
 */
export const offWeekend = (d: Date): Date => (d.getDay() === 6 ? addDays(d, 2) : d.getDay() === 0 ? addDays(d, 1) : d);
export const SHIFT_NOTE = "MOVED OFF THE WEEKEND";

/** A date-field chip: a key, a label, the day it picks, its small date, and the unshifted day. */
export interface Anchor {
  k: string;
  label: string;
  d: Date | null;
  sub?: string;
  raw?: Date;
}

export function pastAnchors(today: Date): Anchor[] {
  const y = addDays(today, -1);
  return [
    { k: "t", label: "Today", d: today, sub: dm(today) },
    { k: "y", label: "Yesterday", d: y, sub: dm(y) },
  ];
}

/** Chips counted forward from `base`, NOT weekend-shifted (a deadline, a window, a call). */
export function futureWeeks(base: Date, list: [string, string, number][]): Anchor[] {
  return list.map(([k, label, n]) => {
    const d = addDays(base, n);
    return { k, label, d, sub: dm(d) };
  });
}

/** Reminder chips counted from `base`, weekend-shifted, keeping the unshifted day as `raw`. */
export function reminderAnchors(base: Date, list: [string, string, number][]): Anchor[] {
  return list.map(([k, label, n]) => {
    const raw = addDays(base, n);
    const d = offWeekend(raw);
    return { k, label, d, raw, sub: dm(d) };
  });
}

/** Local day → ISO string at local noon, so a timezone offset can never move the day. */
export const dayIso = (d: Date): string =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).toISOString();
/** Local day → `YYYY-MM-DD`. */
export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Any stored date shape (ISO string, Firestore Timestamp, millis) → local day, or null. */
export function toDay(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : dayOf(v);
  if (typeof v === "object" && v && typeof (v as { toDate?: unknown }).toDate === "function") {
    return dayOf((v as { toDate: () => Date }).toDate());
  }
  if (typeof v === "object" && v && typeof (v as { seconds?: unknown }).seconds === "number") {
    return dayOf(new Date((v as { seconds: number }).seconds * 1000));
  }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const x = new Date(v as string | number);
  return isNaN(x.getTime()) ? null : dayOf(x);
}
