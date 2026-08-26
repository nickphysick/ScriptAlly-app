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
 * ⚠️ THE FIVE STOPS, AND THE GRAIN IS PART OF THE STOP RATHER THAN DERIVED FROM THE DAYS. A
 * threshold on the day count ("over 60 days use weeks") would be a second place the tiers are
 * decided, and the two would drift the first time a stop moved. One table, read by the column
 * builder, the density class and the readout alike.
 */
/**
 * ⚠️ `past` IS A FRACTION OF THE RANGE, NOT A NUMBER OF DAYS, AND IT LIVES HERE (grouped pack,
 * Phase 6). The ref hard-codes `PAST = 3` against `DAYS = 14`; three days is a fifth of a
 * fortnight and a sixtieth of six months, so carrying the literal across would have given the
 * long ranges no history at all — which is exactly the emptiness the past slice exists to fix.
 *
 * ⚠️ AND IT IS A PROPERTY OF THE RANGE, so there is one place to change it and no call site holds
 * a number. The two long ranges take a quarter; the three short ones take the ref's own proportion
 * (3/14), which lands the fortnight on the ref's exact 3 days.
 */
export const TIMELINE_RANGES: readonly TimelineRange[] = [
  { label: "1 week",   days: 7,   grain: "day",   dense: 1, past: 3 / 14 },
  { label: "2 weeks",  days: 14,  grain: "day",   dense: 2, past: 3 / 14 },
  { label: "1 month",  days: 31,  grain: "day",   dense: 2, past: 3 / 14 },
  { label: "3 months", days: 91,  grain: "week",  dense: 3, past: 0.25 },
  { label: "6 months", days: 182, grain: "month", dense: 4, past: 0.25 },
];

/** How many days of the range sit BEFORE today — the fraction resolved, in one place. */
export const pastDaysOf = (r: TimelineRange): number => Math.round(r.days * r.past);

/** The default, and the one every earlier pack measured against. */
export const DEFAULT_RANGE_INDEX = 0;

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
