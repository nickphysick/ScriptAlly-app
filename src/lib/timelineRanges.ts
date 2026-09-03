/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Calendar's three ranges — DATA, and nothing else since v40.
 *
 * ⚠️ THIS WAS `TimelineRangeSlider.tsx`, AND THE SLIDER IS DELETED WITH THE FILE'S OLD NAME.
 * v40 folds the range into the one `Display` popover, so the slider had no caller; leaving it
 * behind would have been a component with no path to a rendered root, and leaving the FILE named
 * after it would have been a name outliving the thing it described — which this repo treats as
 * worse than no name, because it is read as fact.
 *
 * What survives is the table the board actually reads: three spans, their grain, their density
 * tier and the arithmetic that puts today at the middle of the lane.
 */

/** How the board draws a range: how many days it spans, and what a column is worth. */
export interface TimelineRange {
  label: string;
  days: number;
  grain: "day" | "week" | "month";
  /** the density tier — 1 and 2 keep bar text, 3 and 4 do not (ref timeline-range v18) */
  dense: 1 | 2 | 3 | 4;
}

/**
 * ⚠️ THREE STOPS, AND THE GRAIN IS PART OF THE STOP RATHER THAN DERIVED FROM THE DAYS. A
 * threshold on the day count ("over 60 days use weeks") would be a second place the tiers are
 * decided, and the two would drift the first time a stop moved. One table, read by the column
 * builder, the density class and the readout alike.
 */
/**
 * ⚠️ THE 1-WEEK AND 2-WEEK STOPS ARE DELETED (Porcelain, Phase 2; ref timeline-v35.html). The
 * ref's own audit gives the reason and it is about what the surface is FOR: "on a board of
 * relationships measured in weeks, seven days shows fragments of bars and answers nothing the
 * To-do list doesn't answer better". A range that can only show fragments of the one object the
 * board draws is not a smaller view of this board, it is a worse view of a different one.
 *
 * ⚠️ AND THE DEFAULT MOVED WITH THEM, to 3 months. Every earlier pack measured against index 0
 * when index 0 was a week; the stop that opens now is the one the ref opens on.
 *
 * ⚠️ THE SPANS ARE ODD (v40), AND THAT IS WHAT MAKES TODAY EXACTLY CENTRAL. "today − range/2 …
 * today + range/2" is range+1 days INCLUSIVE, so a centred window needs an odd number of cells —
 * with an even one there is no middle cell and today lands half a day off, which is 10.8px at one
 * month. The labels are unchanged because a reader counts months, not cells.
 *
 * ⚠️ `past` IS DELETED (v40). It carried three fractions — 8/30, 22/90, 45/180 — which resolved
 * to 26.7%, 24.4% and 25.0%, so today sat at roughly a quarter and the board showed three times as
 * much future as past. v40 centres it: today is the middle of the lane at every range, which is
 * one rule rather than three numbers, and it cannot drift apart between stops.
 */
/**
 * ⚠️ v58: ONE WINDOW, NINETY DAYS, AND THE PICKER IS GONE.
 *
 * The ref fixes `N = 90` with today at 50% and moves the board by whole weeks instead. Three stops
 * were three different boards — a card's width, a day's distance from its neighbour and whether a
 * label fitted all changed underneath the reader, and every measurement had to be taken three
 * times to mean anything.
 *
 * ⚠️ THE LIST SURVIVES AS ONE ENTRY RATHER THAN BEING DELETED. `range.days`, `pastDaysOf` and the
 * grain are read in a dozen places and by the measurement harness's own `setRangeTo`; collapsing
 * the data and leaving the shape is one edit, and restoring a second stop is one line.
 */
export const TIMELINE_RANGES: readonly TimelineRange[] = [
  { label: "3 months", days: 90,  grain: "week",  dense: 3 },
];

/**
 * How many days of the range sit BEFORE today — half of it, at every range.
 *
 * ⚠️ ONE RULE, NOT THREE NUMBERS. It read a per-range fraction and the three resolved to 26.7%,
 * 24.4% and 25.0%: near enough to look deliberate, different enough that today moved when the
 * reader changed range. Half is a statement about what the board is FOR — what has happened and
 * what is coming, in equal measure — and it holds at any range anyone adds later.
 */
export const pastDaysOf = (r: TimelineRange): number => (r.days - 1) / 2;

/** The default, and the one every earlier pack measured against. */
/**
 * ⚠️ THE BOARD OPENS ON THE MONTH (v54, Phase 1) — it opened on three months.
 *
 * The wider stops answer "how has this year gone"; a board a writer opens to see what is being
 * asked of them wants the near field, where a card is wide enough to say something and a day is
 * far enough from its neighbour to be a date rather than a smear. The other two stops are
 * unchanged and one click away.
 */
export const DEFAULT_RANGE_INDEX = 0;
