import React from "react";
import "./forms.css";

export interface WeekSliderProps {
  value: number;
  onChange: (weeks: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

/**
 * Response-window slider (Form 11): a styled range input with a live mono readout and a
 * burgundy-filled track. Native <input type="range"> so it's keyboard-operable for free.
 */
export const WeekSlider: React.FC<WeekSliderProps> = ({
  value,
  onChange,
  min = 1,
  max = 26,
  label = "Response window",
}) => {
  const pct = ((value - min) / (max - min)) * 100;
  const fill = `linear-gradient(90deg,#7c3a2a 0%,#7c3a2a ${pct}%,#e7ddd0 ${pct}%,#e7ddd0 100%)`;

  return (
    <div className="sa-fld">
      <div className="sa-wk-head">
        <label className="sa-label" htmlFor="sa-wk" style={{ marginBottom: 0 }}>
          {label}
        </label>
        <span className="sa-wk-read" aria-hidden="true">
          {value} week{value === 1 ? "" : "s"}
        </span>
      </div>
      <input
        id="sa-wk"
        type="range"
        className="sa-wk-slider"
        min={min}
        max={max}
        step={1}
        value={value}
        style={{ background: fill }}
        aria-valuetext={`${value} week${value === 1 ? "" : "s"}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="sa-wk-ends">
        <span>{min} week</span>
        <span>{max} weeks</span>
      </div>
    </div>
  );
};
