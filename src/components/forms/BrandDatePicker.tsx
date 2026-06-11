import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFixedMenu } from "./useFixedMenu";
import "./forms.css";

export interface BrandDatePickerProps {
  /** Selected date as "YYYY-MM-DD". Empty string = nothing selected. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["M", "T", "W", "T", "F", "S", "S"]; // Monday-first

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Parse "YYYY-MM-DD" as a LOCAL date (avoids the UTC off-by-one of new Date(str)). */
const fromISO = (s: string): Date | null => {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Branded date picker. Never a native <input type=date>. A field-styled trigger opens a
 * parchment calendar popover: Playfair month header, burgundy nav, Monday-first grid,
 * sage "today" ring, burgundy selected day, greyed adjacent-month days. Closes on outside click.
 */
export const BrandDatePicker: React.FC<BrandDatePickerProps> = ({ value, onChange, placeholder = "Select a date" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Anchor the calendar popover with position:fixed so FormShell's scroll region can't clip it.
  const { triggerRef, menuStyle } = useFixedMenu<HTMLDivElement>(open);

  const selected = useMemo(() => fromISO(value), [value]);
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<Date>(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Keep the shown month in step if the selected value changes while closed.
  useEffect(() => {
    if (!open && selected) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerLabel = selected
    ? `${selected.getDate()} ${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`
    : placeholder;

  const navMonth = (delta: number) =>
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  // Build the day cells: leading muted days from the previous month, then this month's days.
  const cells: { day: number; muted: boolean; date?: Date }[] = [];
  const startDow = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const prevDays = new Date(view.getFullYear(), view.getMonth(), 0).getDate();
  for (let i = 0; i < startDow; i++) cells.push({ day: prevDays - startDow + i + 1, muted: true });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, muted: false, date: new Date(view.getFullYear(), view.getMonth(), d) });
  }

  return (
    <div className={`sa-dp${open ? " open" : ""}`} ref={ref}>
      <div
        className="sa-field"
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <span className={selected ? undefined : "sa-placeholder"}>{triggerLabel}</span>
        <svg
          className="sa-field-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>

      <div className="sa-dp-pop" role="dialog" style={{ ...menuStyle, minWidth: undefined }}>
        <div className="sa-dp-head">
          <div className="sa-dp-month">{MONTHS[view.getMonth()]} {view.getFullYear()}</div>
          <div className="sa-dp-nav">
            <div className="sa-dp-navbtn" role="button" aria-label="Previous month" onClick={() => navMonth(-1)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </div>
            <div className="sa-dp-navbtn" role="button" aria-label="Next month" onClick={() => navMonth(1)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          </div>
        </div>

        <div className="sa-dp-grid">
          {DOW.map((d, i) => (
            <div key={i} className="sa-dp-dow">{d}</div>
          ))}
        </div>

        <div className="sa-dp-grid">
          {cells.map((c, i) => {
            if (c.muted) return <div key={i} className="sa-dp-day muted">{c.day}</div>;
            const isToday = c.date && sameDay(c.date, today);
            const isSel = c.date && selected && sameDay(c.date, selected);
            return (
              <div
                key={i}
                className={`sa-dp-day${isToday ? " today" : ""}${isSel ? " sel" : ""}`}
                onClick={() => {
                  if (c.date) {
                    onChange(toISO(c.date));
                    setOpen(false);
                  }
                }}
              >
                {c.day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
