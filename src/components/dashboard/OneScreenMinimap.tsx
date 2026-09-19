/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenMinimap — the range control: the whole campaign in a 24px strip, with a window you drag
 * (the v34 mockup, 19 Sep — design-refs/dashboard-v34.html; behaviour ref `minimap-stages.html`).
 *
 * ⚠️ IT LIVES IN THE ACTIVE CARD'S NAVY BAND NOW, to the right of the title — no longer under the date
 * axis. It carries NO labels ("DEC 2023" and "TODAY" are dropped): what it shows is said in its
 * `title` and its accessible name — "Showing 20 Jul to 14 Sep. Drag to change the dates."
 *
 * ⚠️ IT IS NEVER HIDDEN. In a card too narrow for the title and the control side by side (470px and
 * under — which is a 1280px window), the band's row wraps and the control takes the full line beneath
 * the title, still inside the band.
 *
 * ⚠️ THE WINDOW IS PLACED IN PIXELS AND CLAMPED INSIDE THE TRACK (`dashWindow.windowBox`). It has a
 * 22px minimum so its handles stay grabbable; on a long record that floor is wider than the eight
 * weeks it stands for, and placed naively it runs past the track's right-hand end. The floor is
 * visual only — the window still MEANS eight weeks, so a drag is read from where it ENDS.
 *
 * ⚠️ `touch-action: pan-y` ON THE TRACK, so a horizontal drag moves the window and a vertical one
 * still scrolls the page.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import type { LedgerPoint } from "../../lib/oneScreen";
import { clampWindowEnd, thumbnailSeries, windowBox } from "../../lib/dashWindow";

const TW = 600, TH = 24;
export const WINDOW_MIN_PX = 22;

export const OneScreenMinimap: React.FC<{
  daily: readonly LedgerPoint[];
  endIdx: number;
  onChange: (endIdx: number) => void;
  /** "Showing 20 Jul to 14 Sep. Drag to change the dates." */
  label: string;
  /** the first time this user sees it, it fades up once */
  arriving: boolean;
}> = ({ daily, endIdx, onChange, label, arriving }) => {
  const [trackW, setTrackW] = useState(0);
  const drag = useRef<{ x: number; end: number } | null>(null);

  /* a callback ref, like the chart's own box: measured when the element arrives, and on every resize */
  const trackRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return undefined;
    const measure = () => setTrackW((was) => (was === el.clientWidth ? was : el.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paths = useMemo(() => {
    const v = thumbnailSeries(daily);
    const top = Math.max(1, ...v);
    const pt = (val: number, i: number) => `${((i / Math.max(1, v.length - 1)) * TW).toFixed(1)} ${(TH - 2 - (val / top) * (TH - 6)).toFixed(1)}`;
    const line = v.map((val, i) => `${i ? "L" : "M"}${pt(val, i)}`).join(" ");
    return { line, area: `${line} L${TW} ${TH} L0 ${TH} Z` };
  }, [daily]);

  const box = windowBox(endIdx, daily.length, trackW, WINDOW_MIN_PX);

  const onDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    drag.current = { x: ev.clientX, end: endIdx };
  };
  const onMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || trackW <= 0) return;
    /* a pixel of track is this many days of record — the drag moves where the window ENDS */
    const daysPerPx = Math.max(1, daily.length - 1) / trackW;
    onChange(clampWindowEnd(d.end + (ev.clientX - d.x) * daysPerPx, daily.length));
  };
  const onUp = () => { drag.current = null; };
  /* the keyboard moves it a week at a time; Home and End go to the ends */
  const onKey = (ev: React.KeyboardEvent) => {
    const step = ev.key === "ArrowLeft" ? -7 : ev.key === "ArrowRight" ? 7 : 0;
    if (step) { ev.preventDefault(); onChange(clampWindowEnd(endIdx + step, daily.length)); }
    else if (ev.key === "Home") { ev.preventDefault(); onChange(clampWindowEnd(0, daily.length)); }
    else if (ev.key === "End") { ev.preventDefault(); onChange(daily.length - 1); }
  };

  return (
    <div className={`os-mm${arriving ? " os-mm--arrive" : ""}`} data-probe="minimap" title={label}>
      <div className="os-mmtrack" ref={trackRef} data-probe="minimap-track">
        <svg viewBox={`0 0 ${TW} ${TH}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={paths.area} fill="#f5f1eb" fillOpacity={0.2} />
          <path d={paths.line} fill="none" stroke="#f5f1eb" strokeOpacity={0.8} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
        </svg>
        <div
          className="os-mmwin"
          data-probe="minimap-window"
          style={trackW > 0 ? { left: `${box.left.toFixed(1)}px`, width: `${box.width.toFixed(1)}px` } : { right: 0, width: `${WINDOW_MIN_PX}px` }}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={daily.length - 1}
          aria-valuenow={endIdx}
          aria-valuetext={label}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <i /><i />
        </div>
      </div>
    </div>
  );
};
