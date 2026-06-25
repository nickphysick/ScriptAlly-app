import React from "react";
import "./forms.css";

export interface WeekSliderProps {
  /** Weeks, or `null` for "Not set" (only reachable when `onUnknown` is supplied). */
  value: number | null;
  onChange: (weeks: number) => void;
  min?: number;
  max?: number;
  label?: string;
  /**
   * When provided, a "?" affordance appears that sets the value to "Not set" (null), and the
   * Not-set state greys the slider. Used by the Edit Agent drawer; the Add-Agent form omits it
   * (always passes a number → renders exactly as before).
   */
  onUnknown?: () => void;
  /** Hint shown beneath the slider while Not set (e.g. the no-turnaround consequence). */
  notSetHint?: string;
}

/**
 * Response-window slider (Form 11): a styled range input with a live mono readout and a
 * burgundy-filled track. Native <input type="range"> so it's keyboard-operable for free.
 * Supports an optional "Not set" (null) state for the Edit Agent drawer's "?" path.
 */
export const WeekSlider: React.FC<WeekSliderProps> = ({
  value,
  onChange,
  min = 1,
  max = 26,
  label = "Response window",
  onUnknown,
  notSetHint,
}) => {
  const notSet = value === null;
  const pos = notSet ? min : value;
  const pct = ((pos - min) / (max - min)) * 100;
  const fill = `linear-gradient(90deg,#7c3a2a 0%,#7c3a2a ${pct}%,#e7ddd0 ${pct}%,#e7ddd0 100%)`;

  return (
    <div className="sa-fld">
      <div className="sa-wk-head">
        <label className="sa-label" htmlFor="sa-wk" style={{ marginBottom: 0 }}>
          {label}
        </label>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className={`sa-wk-read${notSet ? " muted" : ""}`} aria-hidden="true">
            {notSet ? "Not set" : `${value} week${value === 1 ? "" : "s"}`}
          </span>
          {onUnknown && (
            <button
              type="button"
              className="sa-wk-q"
              title="Don’t know their turnaround? Click to leave it unset."
              aria-label="Leave response time unset"
              onClick={onUnknown}
            >
              ?
            </button>
          )}
        </span>
      </div>
      <input
        id="sa-wk"
        type="range"
        className={`sa-wk-slider${notSet ? " notset" : ""}`}
        min={min}
        max={max}
        step={1}
        value={pos}
        style={{ background: fill }}
        aria-valuetext={notSet ? "Not set" : `${value} week${value === 1 ? "" : "s"}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="sa-wk-ends">
        <span>{min} week</span>
        <span>{max} weeks</span>
      </div>
      {notSet && notSetHint && <div className="sa-wk-hint">{notSetHint}</div>}
    </div>
  );
};
