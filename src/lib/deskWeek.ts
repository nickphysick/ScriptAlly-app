/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * deskWeek — "Dates for the diary": the current week, one row per day.
 *
 * ⚠️ IT REPLACES A FORTNIGHT CAROUSEL WITH SEVEN ROWS, and the shrink is the point. The carousel
 * showed fourteen days of activity — everything that happened as well as everything due — which is
 * a feed, not a diary. A diary answers one question: what is coming, and when. So this window is
 * the week you are in, and it carries DUE items only; what already happened is the timeline's job,
 * immediately to its left.
 *
 * Pure, so the week maths is unit-testable without a calendar in front of a browser.
 */
import { FEvent, REMINDER_TYPES, dayDiff, startOfDay } from "../components/dashboard/fortnightEvents";

export interface DiaryDay {
  /** Midnight on the day, local. */
  date: Date;
  /** "Mon" — or "Today", which is the row's own label rather than a separate flag to read. */
  weekday: string;
  /** "3 Aug" */
  dayLabel: string;
  isToday: boolean;
  /** Earlier this week — dimmed, because a diary still shows the days you have walked past. */
  isPast: boolean;
  events: FEvent[];
}

/** Monday of the week containing `d` — the diary weeks run Mon→Sun, as the ISO ones do. */
export const weekStartOf = (d: Date): Date => {
  const s = startOfDay(d);
  const back = (s.getDay() + 6) % 7; // Sunday(0) → 6 back
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() - back);
};

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The seven rows of the current week.
 *
 * ⚠️ EVERY DAY GETS A ROW, INCLUDING THE EMPTY ONES. A diary that lists only the days with
 * something in them is a list of tasks; the empty days are what make it a week, and "A quiet day."
 * is a truthful thing to read. The row count never changes, so the card never jumps.
 */
export const diaryWeek = (events: FEvent[], today: Date): DiaryDay[] => {
  const start = weekStartOf(today);
  /* ⚠️ DUE ITEMS ONLY. `REMINDER_TYPES` is the existing forward-looking set — the same one the
     carousel drew as its dashed reminder ring — so "what is due" has one definition in the app. */
  const due = events.filter((e) => REMINDER_TYPES.has(e.type));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const diff = dayDiff(date, today);
    return {
      date,
      weekday: diff === 0 ? "Today" : WD[i],
      dayLabel: `${date.getDate()} ${MONTHS[date.getMonth()]}`,
      isToday: diff === 0,
      isPast: diff < 0,
      events: due.filter((e) => dayDiff(e.date, date) === 0),
    };
  });
};

/**
 * A day's empty line. Today says something different from any other day, deliberately: "A quiet
 * day." is an observation about a day you are not in, and on today it reads as resignation.
 */
export const emptyDayLine = (day: DiaryDay): string =>
  day.isToday ? "Nothing due today." : "A quiet day.";
