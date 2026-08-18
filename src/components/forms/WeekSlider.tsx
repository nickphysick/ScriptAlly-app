import React, { useId } from "react";
import "./forms.css";

export interface WeekSliderProps {
  /** Weeks, or `null` for "Unknown" (only reachable when `onUnknown` is supplied). */
  value: number | null;
  onChange: (weeks: number) => void;
  min?: number;
  max?: number;
  label?: string;
  /**
   * When provided, an "Unknown" pill appears; selecting it sets the value to null (no turnaround on
   * record) and greys the slider. Dragging re-sets a value and de-selects Unknown. Used by the Edit
   * Agent drawer; the Add-Agent form omits it (always passes a number → renders exactly as before).
   */
  onUnknown?: () => void;
  /** Hover copy on the Unknown pill — recommend a typical turnaround so a chaser can go out in time. */
  unknownHint?: string;
  /**
   * ⚠️ THE SLIDER'S DOM ID IS INSTANCE-UNIQUE, and it used to be the constant `"sa-wk"` — the same
   * fault `ScriptAllyLogo` was fixed for. Two mounts put two elements with one id in the document,
   * and a `<label for>` then points at whichever comes first: the second slider's label would focus
   * the first slider. It cost a real decision — the Query Centre's date control was built as a
   * SECOND slider rather than reuse this one, purely to avoid the collision.
   *
   * ⚠️ `useId` RATHER THAN A REQUIRED PROP, so every existing caller is untouched and no future one
   * can forget. Pass `id` only where something outside needs to address this input by name.
   */
  id?: string;
}

/**
 * Response-window slider (Form 11): a styled range input with a live mono readout and a
 * burgundy-filled track. Native <input type="range"> so it's keyboard-operable for free.
 * Supports an optional "Unknown" state for the Edit Agent drawer.
 */
export const WeekSlider: React.FC<WeekSliderProps> = ({
  value,
  onChange,
  min = 1,
  max = 26,
  label = "Response window",
  onUnknown,
  unknownHint,
  id,
}) => {
  const auto = useId();
  const inputId = id ?? `sa-wk-${auto}`;
  const unknown = value === null;
  const pos = unknown ? min : value;
  const pct = ((pos - min) / (max - min)) * 100;
  const fill = `linear-gradient(90deg,#7c3a2a 0%,#7c3a2a ${pct}%,#e7ddd0 ${pct}%,#e7ddd0 100%)`;

  return (
    <div className="sa-fld">
      <div className="sa-wk-head">
        <label className="sa-label" htmlFor={inputId} style={{ marginBottom: 0 }}>
          {label}
        </label>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className={`sa-wk-read${unknown ? " muted" : ""}`} aria-hidden="true">
            {unknown ? "Unknown" : `${value} week${value === 1 ? "" : "s"}`}
          </span>
          {onUnknown && (
            <span className="sa-wk-unk">
              <button
                type="button"
                className={`sa-wk-unkbtn${unknown ? " on" : ""}`}
                aria-pressed={unknown}
                onClick={onUnknown}
              >
                Unknown
              </button>
              {unknownHint && <span className="sa-wk-unktip">{unknownHint}</span>}
            </span>
          )}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        className={`sa-wk-slider${unknown ? " notset" : ""}`}
        min={min}
        max={max}
        step={1}
        value={pos}
        style={{ background: fill }}
        aria-valuetext={unknown ? "Unknown" : `${value} week${value === 1 ? "" : "s"}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="sa-wk-ends">
        <span>{min} week</span>
        <span>{max} weeks</span>
      </div>
    </div>
  );
};
