/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * recordingCalendar — the month grid, as data (journeys pack, Phase 3;
 * ref design-refs/todo-workspace-v14.html `.cal`).
 *
 * ⚠️ THE COMPONENT ASSUMES NOTHING ABOUT DIRECTION. It is not a past-only picker with the future
 * disabled; it names a date inside a RANGE, and `min`/`max` are both optional and both honoured.
 * The recording journeys happen to pass `max = today`, because you cannot have sent something
 * tomorrow — but that is the CALLER's fact about recording, not the calendar's about dates. A
 * component that baked it in would have to be forked the first time something needed a future day.
 *
 * ⚠️ MONDAY-FIRST, and that is a decision rather than a locale accident. `Date.getDay()` is
 * Sunday-indexed, so every offset here is `(getDay() + 6) % 7`. Getting this wrong shifts the whole
 * grid by one column and still renders a perfectly plausible-looking month.
 *
 * Pure and clock-injected, so the flip, the bounds and the leading blanks are all testable without
 * a DOM — the same shape as `placeMenu`, which this component's placement reuses rather than
 * re-deriving.
 */

/** Y-M-D in LOCAL time. ⚠️ NEVER `toISOString().slice(0, 10)` — that is UTC, and it names the wrong
 *  day for part of every evening in a positive-offset zone. The symptom is an off-by-one date, not
 *  an error. */
export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Monday-first initials. Two Ts and two Ss is correct — a single letter is all the column allows. */
export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export interface CalCell {
  /** `null` for the leading blanks before the 1st — rendered, but invisible and inert. */
  ymd: string | null;
  day: number | null;
  disabled: boolean;
  isToday: boolean;
}

export interface CalBounds {
  /** Inclusive earliest selectable day (Y-M-D). Absent = unbounded. */
  min?: string;
  /** Inclusive latest selectable day (Y-M-D). Absent = unbounded. */
  max?: string;
}

/** Out of range on either side. String compare is safe and exact on zero-padded Y-M-D. */
export const outOfRange = (day: string, b: CalBounds): boolean =>
  (b.min != null && day < b.min) || (b.max != null && day > b.max);

/**
 * One month's cells, Monday-first, with the leading blanks that align the 1st to its weekday.
 * ⚠️ NO TRAILING BLANKS — a grid that pads to a full six rows changes height between months, and
 * a popover that resizes as you page through it reads as a glitch.
 */
export function monthCells(year: number, month: number, bounds: CalBounds, todayYmd: string): CalCell[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: CalCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ ymd: null, day: null, disabled: true, isToday: false });
  for (let d = 1; d <= days; d++) {
    const key = ymd(new Date(year, month, d));
    cells.push({ ymd: key, day: d, disabled: outOfRange(key, bounds), isToday: key === todayYmd });
  }
  return cells;
}

/**
 * Whether the month can step in a direction. ⚠️ IT ASKS WHETHER ANY DAY IS REACHABLE, not whether
 * the bound falls in the next month — stepping forward from June with a `max` in September must
 * stay live, and a naive "is max in the next month" check would disable it.
 */
export function canStep(year: number, month: number, dir: -1 | 1, bounds: CalBounds): boolean {
  const target = new Date(year, month + dir, 1);
  if (dir === 1) {
    if (bounds.max == null) return true;
    return ymd(target) <= bounds.max; // the 1st of the next month is the earliest day it holds
  }
  if (bounds.min == null) return true;
  const lastOfTarget = ymd(new Date(target.getFullYear(), target.getMonth() + 1, 0));
  return lastOfTarget >= bounds.min;
}

/** "August 2026" — the Playfair heading. */
export const monthTitle = (year: number, month: number): string =>
  new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

/** "12 August 2026" — the footer's full date, once one is chosen. */
export const fullDate = (day: string): string =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** "12 Aug" — what the anchor button relabels itself to. */
export const shortDate = (day: string): string =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * The footer's standing note — what the calendar will not let you pick, in the writer's terms.
 * ⚠️ DERIVED FROM THE BOUNDS THE COMPONENT WAS GIVEN, never assumed: a caller that passes no `max`
 * gets no claim about the future, and a caller whose `max` is today gets "today" rather than a
 * date, because that is the word a reader would use.
 */
export function boundsNote(bounds: CalBounds, todayYmd: string): string | null {
  if (bounds.max != null) return bounds.max === todayYmd ? "Nothing after today" : `Nothing after ${shortDate(bounds.max)}`;
  if (bounds.min != null) return bounds.min === todayYmd ? "Nothing before today" : `Nothing before ${shortDate(bounds.min)}`;
  return null;
}
