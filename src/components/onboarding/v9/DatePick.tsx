/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The import review's date field and its compact calendar (smart-import-photos v1.2). One calendar,
 * shared: the timeline strip's pop-over draws it, and every single-date deck card draws `DatePick`
 * in place of a native date input — the same parsing (lib/importTypedDate), the same calendar, the
 * same floating pop-over (timelineStrip.css, `.o9-spop`).
 *
 * ⚠️ THE CALENDAR FLOATS. It is position:absolute under its field, so opening it moves nothing on
 * the card; it flips above when there is no room below in the nearest scroll area, and otherwise
 * scrolls into view. Typing, a click outside and Esc behave as on the strip.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { readTypedDate, localToday, longDate, monthGrid, monthTitle, stepMonth, tileDate } from "../../../lib/importTypedDate";
import { useEscapeLayer, ESC_LEVEL } from "../../../lib/escapeStack";
import { STRIP_WORDS } from "../../../lib/importTimeline";
import "./timelineStrip.css";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/** One month, Monday first, with ‹ ›. Today is ringed, the chosen day filled, future days disabled. */
export const DateCalendar: React.FC<{ y: number; m: number; sel: string | null; today: string; onMonth: (y: number, m: number) => void; onPick: (iso: string) => void }> = ({ y, m, sel, today, onMonth, onPick }) => {
  const g = monthGrid(y, m);
  const atToday = `${y}-${String(m).padStart(2, "0")}` >= today.slice(0, 7);
  return (
    <div className="o9-cal" data-strip="cal">
      <div className="o9-calh">
        <button type="button" className="o9-calnav" aria-label="Previous month" data-act="cal-prev" onClick={() => onMonth(...stepMonth(y, m, -1))}>‹</button>
        <b data-strip="cal-title">{monthTitle(y, m)}</b>
        <button type="button" className="o9-calnav" aria-label="Next month" data-act="cal-next" disabled={atToday} onClick={() => onMonth(...stepMonth(y, m, 1))}>›</button>
      </div>
      <div className="o9-calg">
        {DOW.map((w, i) => <span key={i} className="o9-dow" aria-hidden="true">{w}</span>)}
        {Array.from({ length: g.lead }, (_, i) => <span key={`b${i}`} />)}
        {g.days.map((iso) => (
          <button type="button" key={iso} data-day={iso} disabled={iso > today} aria-label={longDate(iso)} aria-pressed={iso === sel}
            className={`o9-day${iso === sel ? " is-sel" : ""}${iso === today ? " is-today" : ""}`} onClick={() => onPick(iso)}>
            {Number(iso.slice(8))}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * A date field with the calendar under it. `value` is the chosen date (YYYY-MM-DD) or null; `start`
 * is the month the calendar opens on when nothing is chosen (YYYY-MM-DD). Enter with a date chosen
 * calls `onEnter`, so a card's own Save is the one way it saves.
 */
export const DatePick: React.FC<{
  label: string; value: string | null; onChange: (iso: string | null) => void; start: string;
  onEnter?: () => void; today?: string; id?: string;
}> = ({ label, value, onChange, start, onEnter, today: todayIn, id }) => {
  const today = todayIn ?? localToday();
  const [typed, setTyped] = useState(value ? tileDate(value) : "");
  const [err, setErr] = useState(false);
  const [open, setOpen] = useState(false);
  const from = value ?? start;
  const [ym, setYm] = useState<[number, number]>([Number(from.slice(0, 4)), Number(from.slice(5, 7))]);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const show = () => {
    if (open) return;
    const f = value ?? start;
    setYm([Number(f.slice(0, 4)), Number(f.slice(5, 7))]);
    setUp(false);
    setOpen(true);
  };
  const type = (v: string) => {
    setTyped(v);
    const sel = readTypedDate(v, today);
    setErr(!sel && v.trim().length >= 3);
    onChange(sel);
    if (sel) setYm([Number(sel.slice(0, 4)), Number(sel.slice(5, 7))]);
    if (!open) setOpen(true);
  };
  const pick = (iso: string) => {
    onChange(iso); setTyped(tileDate(iso)); setErr(false); setOpen(false);
    input.current?.focus({ preventScroll: true });
  };

  /* Placed once it is drawn: above when there is no room below in the scroll area, else in view. */
  useLayoutEffect(() => {
    const p = pop.current;
    if (!open || !p) return;
    const r = p.getBoundingClientRect();
    let port = { top: 0, bottom: window.innerHeight };
    for (let e = p.parentElement; e; e = e.parentElement) {
      if (/auto|scroll/.test(getComputedStyle(e).overflowY)) { const b = e.getBoundingClientRect(); port = { top: Math.max(0, b.top), bottom: Math.min(window.innerHeight, b.bottom) }; break; }
    }
    if (r.bottom > port.bottom - 12) {
      const fieldTop = wrap.current?.getBoundingClientRect().top ?? 0;
      if (fieldTop - r.height - 20 > port.top) setUp(true);
      else p.scrollIntoView({ block: "nearest" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* a click outside the field and its calendar closes the calendar; what was chosen stays */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);
  useEscapeLayer(open, () => setOpen(false), ESC_LEVEL.cardPopup);

  return (
    <div className="o9-dpick" ref={wrap} data-dpick="">
      <input ref={input} id={id} className="sf-in o9-dpickin" type="text" inputMode="text" autoComplete="off" aria-label={label} placeholder={STRIP_WORDS.placeholder}
        value={typed} data-dpick="input" aria-expanded={open} aria-haspopup="dialog"
        onFocus={show} onClick={show} onChange={(e) => type(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (value) { setOpen(false); onEnter?.(); } } }} />
      {open && (
        <div ref={pop} className={`o9-spop o9-dpop${up ? " is-up" : ""}`} role="dialog" aria-label={label} data-dpick="pop">
          <div className="o9-rd" aria-live="polite" data-dpick="readback">
            {err ? <span className="is-bad">{STRIP_WORDS.bad}</span> : value ? <span className="is-ok">{longDate(value)}</span> : <span className="is-hint">{STRIP_WORDS.hint}</span>}
          </div>
          <DateCalendar y={ym[0]} m={ym[1]} sel={value} today={today} onMonth={(y, m) => setYm([y, m])} onPick={pick} />
        </div>
      )}
    </div>
  );
};
