/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure helpers for user notes — date handling and the desk/to-do orderings.
 *
 * Dates: `dueDate` is a date-only "YYYY-MM-DD" string (BrandDatePicker-native). Day-granular by
 * design — "overdue / due today" is a plain STRING compare against today's LOCAL date string, never
 * Date maths, so there's no timezone/time-of-day drift.
 */
import type { Note } from "../../types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Today as a LOCAL "YYYY-MM-DD" string (matches BrandDatePicker's toISO). */
export const todayLocalISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Parse "YYYY-MM-DD" as a LOCAL date (avoids the UTC off-by-one of `new Date(str)`). */
const fromISO = (s: string): Date | null => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

/** Due today or in the past — a plain string compare. Drives the warm chip + the urgent count. */
export const isDueOrOverdue = (dueDate: string | null | undefined, today: string = todayLocalISO()): boolean =>
  !!dueDate && dueDate <= today;

/** Strictly in the past. */
export const isOverdue = (dueDate: string | null | undefined, today: string = todayLocalISO()): boolean =>
  !!dueDate && dueDate < today;

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Human due label for the chip: "Due today" / "Due tomorrow" / "Due 28 Jun" (mock wording).
 * Overdue dates keep the explicit date ("Due 28 Jun") so the warm chip carries the urgency.
 */
export const formatDueLabel = (dueDate: string | null | undefined, today: string = todayLocalISO()): string => {
  if (!dueDate) return "";
  const due = fromISO(dueDate);
  if (!due) return "";
  if (dueDate === today) return "Due today";
  const t = fromISO(today);
  if (t) {
    const tomorrow = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
    if (due.getFullYear() === tomorrow.getFullYear() && due.getMonth() === tomorrow.getMonth() && due.getDate() === tomorrow.getDate()) {
      return "Due tomorrow";
    }
  }
  return `Due ${due.getDate()} ${MONTHS_SHORT[due.getMonth()]}`;
};

/** Active = not done. Every active note lives on the desk (there is no separate "pinned" flag). */
export const activeNotes = (notes: Note[]): Note[] => notes.filter((n) => !n.done);

/** Most-recent-first by createdAt (the desk's order). Returns a new array. */
export const byMostRecent = (notes: Note[]): Note[] =>
  [...notes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

/** Dated, not-done notes sorted by dueDate ascending (the To-do "Noted by you" group). */
export const datedTodoNotes = (notes: Note[]): Note[] =>
  activeNotes(notes)
    .filter((n) => !!n.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : 0));

/** Count of dated, not-done notes that are overdue — the only notes that raise an alarm (count + bell). */
export const overdueNoteCount = (notes: Note[], today: string = todayLocalISO()): number =>
  activeNotes(notes).filter((n) => isOverdue(n.dueDate, today)).length;
