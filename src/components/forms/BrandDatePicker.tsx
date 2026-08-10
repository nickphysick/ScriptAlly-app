import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFixedMenu } from "./useFixedMenu";
import "./forms.css";

export interface BrandDatePickerProps {
  /** Selected date as "YYYY-MM-DD". Empty string = nothing selected. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Earliest selectable date, "YYYY-MM-DD", INCLUSIVE. Days before it are inert. */
  min?: string;
  /** Latest selectable date, "YYYY-MM-DD", INCLUSIVE. Days after it are inert. */
  max?: string;
  /**
   * "form" (default) is the Form 11 skin every existing call site wears — unchanged.
   * "hub" is the .t-f12 parchment skin, and ALSO opts into the quick chips and the
   * Clear/Done footer, so no existing surface grows controls it didn't ask for.
   */
  variant?: "form" | "hub";
  /** Accessible name for the trigger, when the visible label alone isn't enough. */
  ariaLabel?: string;
  /**
   * A mono line in the popover foot anchoring the choice — "Today is 9 August 2026", "Sent 2 July".
   *
   * ⚠️ ADDITIVE AND OPTIONAL, so the twenty existing Form 11 call sites grow nothing they did not
   * ask for. It renders only where it is passed, and only in the `hub` variant's footer, which is
   * the only footer that exists.
   */
  footnote?: string;
  /**
   * The hub popover's shortcut chips, replacing the backward-looking default.
   *
   * ⚠️ SHORTCUTS MUST POINT THE WAY THE FIELD DOES. The nudge field was reusing the sent field's
   * configuration and offering "Today · Yesterday · Last Monday" for a date that must be in the
   * FUTURE — three shortcuts, none of them selectable, on a control whose whole job is to save
   * the writer some counting. Anchored to a date the CALLER chooses, because "in eight weeks"
   * from a nudge field means eight weeks after the query went out, not after today.
   */
  quickChips?: readonly { label: string; date: Date }[];
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
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Most recent Monday at or before today — "Last Monday" reads as "the Monday just gone". */
const lastMonday = (from: Date): Date => addDays(from, -(((from.getDay() + 6) % 7) || 7));

/**
 * Is this day selectable? Comparison is on the ISO string, which sorts lexicographically for
 * "YYYY-MM-DD" — no Date maths, so no timezone can shift a boundary day in or out of range.
 */
const withinRange = (d: Date, min?: string, max?: string): boolean => {
  const iso = toISO(d);
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
};

/**
 * Branded date picker. Never a native <input type=date>. A field-styled trigger opens a
 * parchment calendar popover: Playfair month header, burgundy nav, Monday-first grid,
 * sage "today" ring, burgundy selected day, greyed adjacent-month days. Closes on outside click.
 */
export const BrandDatePicker: React.FC<BrandDatePickerProps> = ({
  value, onChange, placeholder = "Select a date", min, max, variant = "form", ariaLabel, footnote, quickChips,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  /* Anchor the calendar popover with position:fixed so FormShell's scroll region can't clip it —
     and place it AUTOmatically: the calendar is ~380px tall with the chips and footer, so a
     trigger low in the window (the nudge reminder's "Pick a date", which sits under three chips
     near the pane foot) had its month grid cut off by the viewport. `menuRef` lets the hook
     measure the real height rather than guess at it. */
  const { triggerRef, menuStyle } = useFixedMenu<HTMLDivElement>(open, { placement: "auto", menuRef: popRef });

  const selected = useMemo(() => fromISO(value), [value]);
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<Date>(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  /** The keyboard cursor — a day is "focused" before it is chosen. Null while closed. */
  const [focusDate, setFocusDate] = useState<Date | null>(null);

  /** Close WITHOUT changing anything, and hand focus back to the trigger that opened us. */
  const closeAndReturn = () => {
    setOpen(false);
    setFocusDate(null);
    triggerRef.current?.focus();
  };

  const commit = (d: Date) => {
    if (!withinRange(d, min, max)) return;
    onChange(toISO(d));
    closeAndReturn();
  };

  // Keep the shown month in step if the selected value changes while closed.
  useEffect(() => {
    if (!open && selected) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening seeds the cursor on the selected day, else today, and shows that month.
  useEffect(() => {
    if (!open) return;
    const start = selected ?? today;
    setFocusDate(start);
    setView(new Date(start.getFullYear(), start.getMonth(), 1));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Move real DOM focus onto the cursor cell so arrow keys land somewhere and screen readers
  // announce the day. Runs after each cursor move, including ones that changed month.
  useEffect(() => {
    if (!open || !focusDate) return;
    const cell = gridRef.current?.querySelector<HTMLElement>('[data-dp-cursor="true"]');
    cell?.focus();
  }, [open, focusDate]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setFocusDate(null); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeAndReturn(); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Arrow keys walk the grid a day (←→) or a week (↑↓) at a time, across month boundaries. */
  const onGridKey = (e: React.KeyboardEvent) => {
    const cur = focusDate ?? selected ?? today;
    const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
    if (step !== undefined) {
      e.preventDefault();
      const next = addDays(cur, step);
      setFocusDate(next);
      if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear()) {
        setView(new Date(next.getFullYear(), next.getMonth(), 1));
      }
      return;
    }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(cur); }
  };

  const triggerLabel = selected
    ? `${selected.getDate()} ${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`
    : placeholder;

  /* The cursor cell, whether or not the popover has been opened yet: falling back to the selected
     day (else today) means there is ALWAYS one tabbable cell, so a keyboard user who tabs in never
     lands on a grid with no tab stop. `focusDate` only takes over once the arrows start moving. */
  const cursor = focusDate ?? selected ?? today;

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
    <div className={`sa-dp${open ? " open" : ""}${variant === "hub" ? " sa-dp--hub" : ""}`} ref={ref}>
      <div
        className="sa-field"
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
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

      <div ref={popRef} className="sa-dp-pop" role="dialog" style={{ ...menuStyle, minWidth: undefined }}>
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

        {/* Roving tabindex over a grid: exactly ONE cell is tabbable, and the arrow keys move
            which. Cells stay <div>s deliberately — turning them into <button>s would need a
            style reset on the shared .sa-dp-day rule, which is worn by twenty other call sites. */}
        <div className="sa-dp-grid" ref={gridRef} role="grid" onKeyDown={onGridKey}>
          {cells.map((c, i) => {
            if (c.muted) return <div key={i} className="sa-dp-day muted" role="gridcell" aria-hidden="true">{c.day}</div>;
            const isToday = c.date && sameDay(c.date, today);
            const isSel = c.date && selected && sameDay(c.date, selected);
            const allowed = !c.date || withinRange(c.date, min, max);
            const isCursor = !!(c.date && sameDay(c.date, cursor));
            return (
              <div
                key={i}
                role="gridcell"
                tabIndex={isCursor ? 0 : -1}
                data-dp-cursor={isCursor || undefined}
                aria-selected={!!isSel}
                aria-disabled={!allowed || undefined}
                aria-label={c.date ? `${c.day} ${MONTHS[view.getMonth()]} ${view.getFullYear()}` : undefined}
                className={`sa-dp-day${isToday ? " today" : ""}${isSel ? " sel" : ""}${allowed ? "" : " off"}`}
                onClick={() => { if (c.date) commit(c.date); }}
              >
                {c.day}
              </div>
            );
          })}
        </div>

        {/* Chips + footer are HUB-ONLY: the twenty Form 11 call sites keep the popover they have. */}
        {variant === "hub" && (
          <>
            <div className="sa-dp-quick">
              {(quickChips
                ? quickChips.map((c) => [c.label, c.date] as const)
                : ([
                    ["Today", today],
                    ["Yesterday", addDays(today, -1)],
                    ["Last Monday", lastMonday(today)],
                  ] as const)
              ).map(([label, d]) => (
                <button
                  key={label}
                  type="button"
                  className="sa-dp-chip"
                  disabled={!withinRange(d, min, max)}
                  onClick={() => commit(d)}
                >{label}</button>
              ))}
            </div>
            <div className="sa-dp-foot">
              {footnote && <span className="sa-dp-note">{footnote}</span>}
              <button type="button" className="sa-dp-link quiet" onClick={() => { onChange(""); closeAndReturn(); }}>Clear</button>
              <button type="button" className="sa-dp-link" onClick={closeAndReturn}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
