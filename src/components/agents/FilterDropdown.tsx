/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FilterDropdown — the Agents filter-bar control (ref design-refs/editorial-agents-midnight-v2.html):
 * a labelled, single-select custom dropdown (not a native <select>, so the menu is themable through
 * the colour-role map). Trigger tints when the value is off its default ("All"/"None"); the menu
 * options hover/select on the theme accent. Keyboard: ↑/↓ move a roving highlight, Enter selects,
 * Esc closes and returns focus, Home/End jump; click-outside closes.
 *
 * Colour is theme-driven via the page-scoped `--fd-*` vars (agentsV2.css) — neutral in Cappuccino /
 * Bold, the midnight `--a-*` map in Editorial. This component ships no hex; it only sets classes.
 */
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface FilterDropdownProps {
  /** The mono label above the trigger (e.g. "Status"). */
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  /** Trigger wears the "active" tint when true (value is off its default). */
  isActive: boolean;
  /** Disabled trigger + a hint (the gated-control fallback); no menu opens. */
  disabled?: boolean;
  disabledHint?: string;
  /** A small "New" chip beside the label. */
  newFlag?: boolean;
  minWidth?: number;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  isActive,
  disabled = false,
  disabledHint,
  newFlag = false,
  minWidth = 132,
}) => {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0); // roving highlight index
  const wrapRef = useRef<HTMLDivElement>(null);
  const trigRef = useRef<HTMLButtonElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const openMenu = () => {
    if (disabled) return;
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    trigRef.current?.focus();
  };
  const choose = (v: string) => {
    onChange(v);
    close();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHi(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHi(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(options[hi].value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="agfd">
      <span className="agfd-lbl">
        {label}
        {newFlag && <span className="agfd-new">New</span>}
      </span>
      <div className={`agfd-dd${open ? " open" : ""}`} ref={wrapRef}>
        <button
          ref={trigRef}
          type="button"
          className={`agfd-trig${isActive ? " act" : ""}`}
          style={{ minWidth }}
          disabled={disabled}
          title={disabled ? disabledHint : undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${label}: ${current?.label ?? ""}`}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={onKey}
        >
          <span className="agfd-val">{current?.label}</span>
          <span className="agfd-chev" aria-hidden="true"><ChevronDown /></span>
        </button>
        {open && (
          <ul className="agfd-menu" role="listbox" aria-label={label}>
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={`agfd-opt${o.value === value ? " sel" : ""}${i === hi ? " hl" : ""}`}
                onMouseEnter={() => setHi(i)}
                onClick={() => choose(o.value)}
              >
                {o.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
