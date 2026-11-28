/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MonthGrid (To-do nudge desk v2, 28 Nov) — THE MONTH CALENDAR'S RULES, pure, so the locks call what the grid calls:
 * which days of a month can be picked (none before `min`, none after `max`), Monday first, and how far the arrows go
 * (back to `min`'s month, on to `max`'s). The grid itself is components/shared/MonthGrid.tsx.
 * ⚠️ A DAY OUTSIDE [min, max] IS NEVER PICKABLE: the grid disables it AND `canPick` refuses it, so a stray click (or a
 *    script) cannot set one.
 */
const dayOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const sameDay = (a: Date | null | undefined, b: Date | null | undefined): boolean =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** a day can be picked when it lies within [min, max], whole days */
export function canPick(d: Date, min: Date, max: Date): boolean {
  const t = dayOnly(d).getTime();
  return t >= dayOnly(min).getTime() && t <= dayOnly(max).getTime();
}

export interface MonthCell { day: number; date: Date; disabled: boolean; today: boolean; picked: boolean }
/** the month's cells, Monday first: `lead` blanks, then one cell per day */
export function monthCells(month: Date, o: { min: Date; max: Date; today: Date; value: Date | null }): { lead: number; cells: MonthCell[] } {
  const first = monthOnly(month);
  const lead = (first.getDay() + 6) % 7;
  const n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: n }, (_, i) => {
    const date = new Date(first.getFullYear(), first.getMonth(), i + 1);
    return { day: i + 1, date, disabled: !canPick(date, o.min, o.max), today: sameDay(date, o.today), picked: sameDay(date, o.value) };
  });
  return { lead, cells };
}

/** the arrows: the previous stops at `min`'s month, the next at `max`'s */
export function monthNav(month: Date, min: Date, max: Date): { prev: boolean; next: boolean } {
  const m = monthOnly(month).getTime();
  return { prev: m > monthOnly(min).getTime(), next: m < monthOnly(max).getTime() };
}

/** the month to open on: the picked day's, else `max`'s, kept within [min, max] */
export function openingMonth(value: Date | null, min: Date, max: Date): Date {
  const want = monthOnly(value ?? max).getTime();
  return new Date(Math.min(Math.max(want, monthOnly(min).getTime()), monthOnly(max).getTime()));
}

export const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
