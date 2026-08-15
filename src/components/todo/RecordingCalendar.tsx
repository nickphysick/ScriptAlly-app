/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RecordingCalendar — naming a date inside a range (journeys pack, Phase 3;
 * ref design-refs/todo-workspace-v14.html `.cal`).
 *
 * ⚠️ THERE ARE THREE DATE SURFACES IN THIS APP AND THEY ANSWER DIFFERENT QUESTIONS. `SnoozeDial`
 * chooses a FUTURE INTERVAL — "in two weeks" — and never names a day. `RecordingCalendar` names a
 * DAY INSIDE A RANGE, which is what recording something that already happened requires.
 * `BrandDatePicker` is the native fallback in ordinary form fields, where a popover would be
 * heavier than the field it serves. Whether this eventually replaces `BrandDatePicker` is
 * DELIBERATELY DEFERRED — it is a real question about every date field in the app, not a tidy-up to
 * do in passing, and leaving it unasked here is a decision rather than an oversight.
 *
 * ⚠️ IT IS PORTALLED, AND `position: fixed` ALONE WOULD NOT HAVE DONE. Its anchor lives inside
 * `.tdb-ffsheet`, which sets `overflow: hidden` for band clipping and runs a transform-based
 * arrival animation — and a transformed ancestor becomes the containing block for `fixed`, so a
 * fixed popover would have been positioned against the sheet AND clipped by it. The portal puts it
 * on `document.body`; `placeMenu` (the same pure placement the ⋯ menus use, not a second copy)
 * gives it coordinates and flips it above the anchor when there is no room below.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { placeMenu } from "../../lib/todoMenu";
import {
  CalBounds, WEEKDAY_INITIALS, boundsNote, canStep, fullDate, monthCells, monthTitle, outOfRange, ymd,
} from "../../lib/recordingCalendar";
import "./todo.css";

export interface RecordingCalendarProps {
  /** The control the calendar hangs off — used for placement and for returning focus on close. */
  anchor: HTMLElement;
  /** The currently chosen day (Y-M-D), if any. Opens on its month. */
  value?: string;
  /** Inclusive bounds. BOTH optional — see the header: this is not a past-only picker. */
  min?: string;
  max?: string;
  /** Overrides the derived standing note. Absent = derived from the bounds. */
  note?: string;
  onPick: (day: string) => void;
  onClose: () => void;
}

const CAL_W = 268;

export const RecordingCalendar: React.FC<RecordingCalendarProps> = ({ anchor, value, min, max, note, onPick, onClose }) => {
  const bounds: CalBounds = { ...(min != null ? { min } : {}), ...(max != null ? { max } : {}) };
  const todayYmd = ymd(new Date());
  const opening = value && !outOfRange(value, bounds) ? new Date(`${value}T12:00:00`) : new Date();
  const [view, setView] = useState<{ y: number; m: number }>({ y: opening.getFullYear(), m: opening.getMonth() });
  const [picked, setPicked] = useState<string | null>(value ?? null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  /* Placed after first paint, because the height depends on how many rows the month needs. */
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    const p = placeMenu(
      { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
      { w: CAL_W, h: el.offsetHeight },
      { w: window.innerWidth, h: window.innerHeight },
      8,
      "left",
    );
    setPos({ left: p.left, top: p.top });
  }, [anchor, view.y, view.m]);

  /* ⚠️ ESCAPE IS CONSUMED ON THE CAPTURE PHASE. The journey's own Escape handler cancels the whole
     takeover, so a bubbling key would dismiss the calendar AND abandon the form behind it —
     the same cascade rule the country picker and the filter popover already follow. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      onClose();
      anchor.focus?.();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (elRef.current?.contains(t) || anchor.contains(t)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("pointerdown", onDown); };
  }, [anchor, onClose]);

  const cells = monthCells(view.y, view.m, bounds, todayYmd);
  const back = canStep(view.y, view.m, -1, bounds);
  const fwd = canStep(view.y, view.m, 1, bounds);
  const step = (dir: -1 | 1) => setView((v) => { const d = new Date(v.y, v.m + dir, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const standing = note ?? boundsNote(bounds, todayYmd);

  return createPortal(
    <div ref={elRef} className="cal open" role="dialog" aria-label="Choose a date"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, visibility: pos ? "visible" : "hidden" }}>
      <div className="cal-h">
        <button type="button" className="cal-nav" disabled={!back} aria-label="Previous month" onClick={() => step(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="m">{monthTitle(view.y, view.m)}</span>
        {/* ⚠️ DISABLED AT THE `max` MONTH, not merely at the max day — an arrow that pages into a
            month with nothing selectable in it is an arrow that does nothing. */}
        <button type="button" className="cal-nav" disabled={!fwd} aria-label="Next month" onClick={() => step(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div className="cal-dow" aria-hidden>
        {WEEKDAY_INITIALS.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="cal-grid">
        {cells.map((c, i) => c.ymd == null
          ? <span key={`b${i}`} className="cal-d blank" aria-hidden />
          : (
            <button key={c.ymd} type="button"
              className={`cal-d${c.isToday ? " today" : ""}${picked === c.ymd ? " on" : ""}`}
              disabled={c.disabled} aria-pressed={picked === c.ymd}
              onClick={() => setPicked(c.ymd)}>
              {c.day}
            </button>
          ))}
      </div>
      <div className="cal-f">
        {/* the standing note states what cannot be picked, until a day is picked and states itself */}
        <span className="note">{picked ? fullDate(picked) : standing}</span>
        <button type="button" disabled={!picked} onClick={() => { if (picked) { onPick(picked); onClose(); anchor.focus?.(); } }}>Done</button>
      </div>
    </div>,
    document.body,
  );
};

export default RecordingCalendar;
