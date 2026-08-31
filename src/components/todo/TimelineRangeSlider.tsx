/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The timeline's range control — five stops from one week to six months.
 *
 * ⚠️ THE THIRD SIBLING OF AN EXISTING PATTERN, NOT A SECOND ONE. `WeekSlider` and
 * `CheckBackSlider` already establish the app's range control: a native `<input type="range">`
 * with a burgundy fill painted as an inline gradient, wrapped in `.sa-fld` › `.sa-wk-head`
 * (`.sa-label` + a live `.sa-wk-read` readout) › `.sa-wk-slider` › `.sa-wk-ends`, an
 * instance-unique id from `useId()`, and `aria-valuetext` carrying the readout.
 *
 * `CheckBackSlider` in particular already runs an INDEX over a non-linear scale array rather than
 * a linear value, which is exactly what five uneven stops need — so this reuses that shape and the
 * same stylesheet rather than inventing a discrete-stop control of its own.
 *
 * ⚠️ NATIVE `<input type="range">` IS THE KEYBOARD SUPPORT. Arrows step the index, Home and End
 * reach the ends, and the stops are discrete because `step={1}` over an index is discrete. A
 * bespoke control would have had to rebuild all of that and would have got some of it wrong.
 */
import React, { useId } from "react";
import "../forms/forms.css";

/** How the board draws a range: how many days it spans, and what a column is worth. */
export interface TimelineRange {
  label: string;
  days: number;
  grain: "day" | "week" | "month";
  /** the density tier — 1 and 2 keep bar text, 3 and 4 do not (ref timeline-range v18) */
  dense: 1 | 2 | 3 | 4;
  /**
   * How much of the range opens BEFORE today, as a fraction of it.
   *
   * ⚠️ A FRACTION RATHER THAN A DAY COUNT, so a call site never holds the number and the two long
   * ranges are not left with a slice too thin to see. It is what makes the long view worth having:
   * a board that only looks forward is emptiest exactly when it is zoomed out.
   */
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
export const TIMELINE_RANGES: readonly TimelineRange[] = [
  { label: "1 month",  days: 31,  grain: "day",   dense: 2 },
  { label: "3 months", days: 91,  grain: "week",  dense: 3 },
  { label: "6 months", days: 181, grain: "month", dense: 4 },
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
export const DEFAULT_RANGE_INDEX = 1;

export interface TimelineRangeSliderProps {
  index: number;
  onChange: (index: number) => void;
  label?: string;
}

export const TimelineRangeSlider: React.FC<TimelineRangeSliderProps> = ({
  index, onChange, label = "Range",
}) => {
  const auto = useId();
  const inputId = `sa-tlrange-${auto}`;
  const max = TIMELINE_RANGES.length - 1;
  const safe = Math.min(Math.max(index, 0), max);
  const pct = (safe / max) * 100;
  const fill = `linear-gradient(90deg,#7c3a2a 0%,#7c3a2a ${pct}%,#e7ddd0 ${pct}%,#e7ddd0 100%)`;
  const readout = TIMELINE_RANGES[safe].label;

  return (
    <div className="sa-fld tl-range">
      <div className="sa-wk-head">
        <label className="sa-label" htmlFor={inputId} style={{ marginBottom: 0 }}>{label}</label>
        <span className="sa-wk-read" aria-hidden="true">{readout}</span>
      </div>
      <input
        id={inputId}
        type="range"
        className="sa-wk-slider"
        min={0}
        max={max}
        step={1}
        value={safe}
        style={{ background: fill }}
        aria-valuetext={readout}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="sa-wk-ends">
        <span>{TIMELINE_RANGES[0].label}</span>
        <span>{TIMELINE_RANGES[max].label}</span>
      </div>
    </div>
  );
};
