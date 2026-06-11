import React, { useEffect, useRef, useState } from "react";
import { useFixedMenu } from "./useFixedMenu";
import "./forms.css";

export interface BrandDropdownOption {
  value: string;
  label: string;
}

export interface BrandDropdownProps {
  value: string;
  options: BrandDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional extra class on the selected-value text (e.g. "sa-strong" / "sa-em"). */
  valueClassName?: string;
}

/**
 * Branded dropdown. Never a native <select> (its option list can't be styled).
 * Trigger looks exactly like a field; burgundy chevron rotates 180° when open; menu fades in;
 * selected option gets the soft-pink background + tick; closes on outside click.
 */
export const BrandDropdown: React.FC<BrandDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = "Select…",
  valueClassName,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Anchor the menu with position:fixed so FormShell's scroll region can't clip it.
  const { triggerRef, menuStyle } = useFixedMenu<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`sa-dd${open ? " open" : ""}`} ref={ref}>
      <div
        className="sa-field"
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <span className={selected ? valueClassName : "sa-placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className="sa-field-icon sa-chevron"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div className="sa-dd-menu" role="listbox" style={menuStyle}>
        {options.map((o) => (
          <div
            key={o.value}
            className={`sa-dd-opt${o.value === value ? " sel" : ""}`}
            role="option"
            aria-selected={o.value === value}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            <span>{o.label}</span>
            <span className="sa-tick">✓</span>
          </div>
        ))}
      </div>
    </div>
  );
};
