/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ A TASK AS A BAR (v63, §F) ═══════════════════════════════════════════════════════════════
 *
 * A task runs from the day it was WRITTEN to the day it is DUE. That span is the whole point: a
 * point on a due date says when, and says nothing about how long it has been sitting there — which
 * is the one thing a board of dates is for. The point-and-checkbox rendering is retired.
 *
 * ⚠️ AN OVERDUE TASK RUNS OPEN TO TODAY, NOT TO ITS DUE DATE. Its span is how long it has been
 * outstanding, and that is still growing; drawing it to a date in the past would state that it
 * stopped being your problem then. The ref's own `end = late ? 0 : min(due, hi)` says the same.
 *
 * ⚠️ AND A ROLLED TASK KEEPS ITS ORIGINAL SPAN AS A GHOST. Moving a due date is a thing the writer
 * did, and a bar that simply grew would erase it — the board would show a task that had always been
 * due on the new date. Ghost, roll marker, live bar: three parts of one history.
 *
 * Pure, and window-relative: every figure returned is in fractional days from the window's first
 * day, the same scale `journeyBars` uses, so a task bar and a query bar are drawn by one expression.
 */

/** what a task bar needs to know about the window it is drawn in */
export interface TaskWin {
  /** the window's days, in order, as `YYYY-MM-DD` */
  days: readonly string[];
  /** today, as `YYYY-MM-DD` — never `new Date()`, so the derivation is testable */
  today: string;
}

export interface TaskBar {
  /** fractional days from the window's first day */
  from: number;
  to: number;
  /** the span began before the window opened */
  openLeft: boolean;
  /** it runs past the window's end, or past today with no end in sight */
  openRight: boolean;
  /** the due date has passed */
  overdue: boolean;
  /** where the roll happened, if the task was moved — the ghost ends here and the live bar starts */
  rolledAt: number | null;
  /** the ghost of the original span, present only on a rolled task */
  ghost: { from: number; to: number } | null;
}

const dayIndex = (days: readonly string[], ymd: string): number => {
  /* ⚠️ A LINEAR SCAN, NOT A DATE SUBTRACTION. The window's own day list is the authority on which
     column a date is in; subtracting timestamps re-derives it and disagrees across a DST boundary,
     where a "day" is 23 or 25 hours. The list is at most a few hundred entries. */
  const i = days.indexOf(ymd);
  if (i >= 0) return i;
  /* outside the window: extrapolate from the ends so the bar can be clipped rather than dropped */
  const first = days[0], last = days[days.length - 1];
  if (!first || !last) return 0;
  const ms = 86400000;
  const at = (s: string) => new Date(`${s}T12:00:00`).getTime();
  return ymd < first
    ? -Math.round((at(first) - at(ymd)) / ms)
    : days.length - 1 + Math.round((at(ymd) - at(last)) / ms);
};

/**
 * ⚠️ `null` WHERE THE TASK CANNOT BE DRAWN, AND THE CALLER MUST HANDLE IT. A task with no due date
 * is a NOTE — it belongs on the Noteboard and has no span — and a task whose span falls entirely
 * outside the window has nothing to draw. Returning a zero-width bar instead would put a mark on
 * the window's edge, which states a date the task does not have.
 */
export function taskBar(
  t: { createdYmd: string; dueYmd: string | null; originalDueYmd?: string | null },
  win: TaskWin,
): TaskBar | null {
  if (!t.dueYmd) return null;
  const lo = 0, hi = win.days.length - 1;
  const made = dayIndex(win.days, t.createdYmd);
  const due = dayIndex(win.days, t.dueYmd);
  const now = dayIndex(win.days, win.today);
  const overdue = t.dueYmd < win.today;

  /* the live bar: from when it was written, to its due date — or to today while it is still owed */
  let from = made;
  const to = overdue ? now : due;
  if (to < lo || from > hi) return null;

  let rolledAt: number | null = null;
  let ghost: { from: number; to: number } | null = null;
  /* ⚠️ ONLY A ROLL FORWARD LEAVES A GHOST. An original date LATER than the current one is not a
     roll — it is a task brought forward, and drawing a ghost past the live bar's end would show a
     span the task never occupied. */
  if (t.originalDueYmd && t.originalDueYmd < t.dueYmd) {
    const orig = dayIndex(win.days, t.originalDueYmd);
    ghost = { from: made, to: orig };
    rolledAt = orig;
    from = orig;
  }

  return {
    from, to,
    openLeft: from < lo,
    openRight: overdue || due > hi,
    overdue,
    rolledAt: rolledAt != null && rolledAt >= lo && rolledAt <= hi ? rolledAt : null,
    ghost,
  };
}

/** the band's two words — the holder, in the same vocabulary every other band uses */
export const taskHolder = (overdue: boolean): string => (overdue ? "Overdue" : "With you");

/**
 * ⚠️ THE TAIL MEASURES, IT DOES NOT REPEAT THE BAND. The first build set it to the holder word, so a
 * task read `Task · Overdue` in its band and `overdue` again three lines down — the same word twice
 * where every other card's tail states a span. One instruction per row means the band says WHOSE
 * and the tail says HOW LONG.
 *
 * `span` is the caller's own span formatter — `overdueSpan` — passed in so the calendar has ONE
 * vocabulary for elapsed time rather than a second one written for tasks.
 */
export function taskTail(
  dueYmd: string, todayYmd: string, span: (days: number) => string,
): string {
  const at = (s: string) => new Date(`${s}T12:00:00`).getTime();
  const d = Math.round((at(todayYmd) - at(dueYmd)) / 86400000);
  if (d > 0) return `${span(d)} overdue`;
  if (d === 0) return "due today";
  return `in ${span(-d)}`;
}
