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
  /** Add agent v1 — the label is drawn by the caller above the slider (the add journey and the card's edit sections);
   *  it stays for screen readers. */
  hideLabel?: boolean;
  /** Record a response v2 — the readout for a value (default "{n} week(s)"): the same slider for days ("In 3 days") */
  readout?: (n: number) => string;
  /** Record a response v2 — the null state's word on the pill and the readout (default "Unknown": "No date", "They didn’t say") */
  unknownLabel?: string;
  /** Record a response v2 — the two end labels under the track (default "{min} week" / "{max} weeks") */
  ends?: readonly [string, string];
}

/**
 * Response-window slider (Form 11): a styled range input with a live mono readout and a
 * navy-filled track (Add agent v1: navy, never burgundy — every slider in the app). Native <input type="range"> so it's keyboard-operable for free.
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
  hideLabel = false,
  readout,
  unknownLabel = "Unknown",
  ends,
}) => {
  const auto = useId();
  const inputId = id ?? `sa-wk-${auto}`;
  const unknown = value === null;
  const pos = unknown ? min : value;
  const pct = ((pos - min) / (max - min)) * 100;
  /* Record a response v2 — the fill takes a surrounding `--sm` (the journey's status colour); unset, it is the navy it always was */
  const fill = `linear-gradient(90deg,var(--sm,#2a3a52) 0%,var(--sm,#2a3a52) ${pct}%,#e7ddd0 ${pct}%,#e7ddd0 100%)`;
  const words = (n: number) => (readout ? readout(n) : `${n} week${n === 1 ? "" : "s"}`);

  return (
    <div className="sa-fld">
      <div className="sa-wk-head">
        <label className={`sa-label${hideLabel ? " sr-only" : ""}`} htmlFor={inputId} style={{ marginBottom: 0 }}>
          {label}
        </label>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className={`sa-wk-read${unknown ? " muted" : ""}`} aria-hidden="true">
            {unknown ? unknownLabel : words(value)}
          </span>
          {onUnknown && (
            <span className="sa-wk-unk">
              <button
                type="button"
                className={`sa-wk-unkbtn${unknown ? " on" : ""}`}
                aria-pressed={unknown}
                onClick={onUnknown}
              >
                {unknownLabel}
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
        aria-valuetext={unknown ? unknownLabel : words(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="sa-wk-ends">
        <span>{ends ? ends[0] : `${min} week`}</span>
        <span>{ends ? ends[1] : `${max} weeks`}</span>
      </div>
    </div>
  );
};
