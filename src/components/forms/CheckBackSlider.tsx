import React from "react";
import "./forms.css";

/**
 * Check-back slider — a day-then-week scale for the Nudge flow. Sibling to WeekSlider (whose
 * scale is weeks-only); reuses the same Form-11 `.sa-wk-*` burgundy-fill look without changing
 * WeekSlider's API. Scale: integer days 1–14 (the 14-day stop reads "2 weeks"), then weeks 3–26.
 */

// The ordered list of selectable day-offsets: 1..14 days, then 21,28,…,182 (weeks 3..26).
export const CHECK_BACK_SCALE_DAYS: number[] = [
  ...Array.from({ length: 14 }, (_, i) => i + 1),
  ...Array.from({ length: 24 }, (_, i) => (i + 3) * 7),
];

/** "5 days" below two weeks; "2 weeks", "3 weeks", … at/after the 14-day stop. */
export const checkBackLabel = (days: number): string => {
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"}`;
};

export interface CheckBackSliderProps {
  valueDays: number;
  onChangeDays: (days: number) => void;
  label?: string;
}

export const CheckBackSlider: React.FC<CheckBackSliderProps> = ({ valueDays, onChangeDays, label = "Check back in" }) => {
  let index = CHECK_BACK_SCALE_DAYS.indexOf(valueDays);
  if (index < 0) index = CHECK_BACK_SCALE_DAYS.indexOf(14); // default to the "2 weeks" stop
  const max = CHECK_BACK_SCALE_DAYS.length - 1;
  const pct = (index / max) * 100;
  const fill = `linear-gradient(90deg,#7c3a2a 0%,#7c3a2a ${pct}%,#e7ddd0 ${pct}%,#e7ddd0 100%)`;

  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + valueDays);
  const dateStr = target.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const readout = `${checkBackLabel(valueDays)} · ${dateStr}`;

  return (
    <div className="sa-fld">
      <div className="sa-wk-head">
        <label className="sa-label" htmlFor="sa-checkback" style={{ marginBottom: 0 }}>
          {label}
        </label>
        <span className="sa-wk-read" aria-hidden="true">
          {readout}
        </span>
      </div>
      <input
        id="sa-checkback"
        type="range"
        className="sa-wk-slider"
        min={0}
        max={max}
        step={1}
        value={index}
        style={{ background: fill }}
        aria-valuetext={readout}
        onChange={(e) => onChangeDays(CHECK_BACK_SCALE_DAYS[Number(e.target.value)])}
      />
      <div className="sa-wk-ends">
        <span>1 day</span>
        <span>26 weeks</span>
      </div>
    </div>
  );
};
