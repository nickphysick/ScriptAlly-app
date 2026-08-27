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
  past: number;
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
 * ⚠️ `past` IS STILL A FRACTION OF THE RANGE, NOT A NUMBER OF DAYS, so no call site holds the
 * number — but the fractions are now written as the ref's own day counts over the ref's own
 * spans (8/30, 22/90, 45/180) rather than as a tidied decimal. `pastDaysOf` therefore lands on
 * exactly the ref's −8 / −22 / −45, which a rounded 0.25 would not have done at 30 days.
 */
export const TIMELINE_RANGES: readonly TimelineRange[] = [
  { label: "1 month",  days: 30,  grain: "day",   dense: 2, past: 8 / 30 },
  { label: "3 months", days: 90,  grain: "week",  dense: 3, past: 22 / 90 },
  { label: "6 months", days: 180, grain: "month", dense: 4, past: 45 / 180 },
];

/** How many days of the range sit BEFORE today — the fraction resolved, in one place. */
export const pastDaysOf = (r: TimelineRange): number => Math.round(r.days * r.past);

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
