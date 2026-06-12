import React from "react";
import "./forms.css";

export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedToggleProps<T extends string> {
  value: T;
  options: [SegmentedToggleOption<T>, SegmentedToggleOption<T>];
  onChange: (value: T) => void;
  ariaLabel?: string;
}

/**
 * Two-state segmented toggle (Form 11). Active segment carries the soft-pink token.
 * Keyboard-operable as a radiogroup: arrows/Enter/Space move between the two states.
 */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedToggleProps<T>) {
  return (
    <div className="sa-seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`sa-seg-b${value === o.value ? " on" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
