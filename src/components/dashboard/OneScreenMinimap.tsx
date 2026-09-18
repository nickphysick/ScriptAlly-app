/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenMinimap — the whole campaign in a 26px strip, with a window you drag (v33, 18 Sep;
 * behaviour ref `minimap-stages.html`, styling ref design-refs/dashboard-v33.html).
 *
 * It appears once there are twelve weeks of record (`dashWindow.campaignStage`), spans the plot's
 * full width — it is NOT shortened for the Mentor — and the window it carries always covers the same
 * eight weeks; only where it ends moves.
 *
 * ⚠️ THE WINDOW HAS A MINIMUM WIDTH OF 26px. On a two-year campaign eight weeks is 6% of the track;
 * without the floor the handles would be too small to grab. The floor is visual only — the window
 * still MEANS eight weeks, so its left edge is derived from where it ends, never from its drawn width.
 *
 * ⚠️ `touch-action: pan-y` ON THE TRACK, so a horizontal drag moves the window and a vertical one
 * still scrolls the page.
 */
import React, { useMemo, useRef } from "react";
import type { LedgerPoint } from "../../lib/oneScreen";
import { endIdxFromLeft, firstMonthLabel, thumbnailSeries, windowFraction } from "../../lib/dashWindow";

const TW = 600, TH = 26;

export const OneScreenMinimap: React.FC<{
  daily: readonly LedgerPoint[];
  endIdx: number;
  onChange: (endIdx: number) => void;
  /** the first time this user sees it, it fades up once */
  arriving: boolean;
}> = ({ daily, endIdx, onChange, arriving }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);

  const paths = useMemo(() => {
    const v = thumbnailSeries(daily);
    const top = Math.max(1, ...v);
    const pt = (val: number, i: number) => `${((i / Math.max(1, v.length - 1)) * TW).toFixed(1)} ${(TH - 2 - (val / top) * (TH - 6)).toFixed(1)}`;
    const line = v.map((val, i) => `${i ? "L" : "M"}${pt(val, i)}`).join(" ");
    return { line, area: `${line} L${TW} ${TH} L0 ${TH} Z` };
  }, [daily]);

  const frac = windowFraction(endIdx, daily.length);

  const onDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    drag.current = { x: ev.clientX, left: frac.left };
  };
  const onMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current, track = trackRef.current;
    if (!d || !track) return;
    const w = track.clientWidth || 1;
    onChange(endIdxFromLeft(d.left + (ev.clientX - d.x) / w, daily.length));
  };
  const onUp = () => { drag.current = null; };
  /* the keyboard moves it a week at a time; Home and End go to the ends */
  const onKey = (ev: React.KeyboardEvent) => {
    const step = ev.key === "ArrowLeft" ? -7 : ev.key === "ArrowRight" ? 7 : 0;
    if (step) { ev.preventDefault(); onChange(Math.max(0, Math.min(daily.length - 1, endIdx + step))); }
    else if (ev.key === "Home") { ev.preventDefault(); onChange(0); }
    else if (ev.key === "End") { ev.preventDefault(); onChange(daily.length - 1); }
  };

  const from = daily[Math.max(0, endIdx - 56)], to = daily[Math.min(daily.length - 1, endIdx)];

  return (
    <div className={`os-mm${arriving ? " os-mm--arrive" : ""}`} data-probe="minimap">
      <span className="os-mmlab">{firstMonthLabel(daily)}</span>
      <div className="os-mmtrack" ref={trackRef}>
        <svg viewBox={`0 0 ${TW} ${TH}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={paths.area} fill="#2a3a52" fillOpacity={0.26} />
          <path d={paths.line} fill="none" stroke="#2a3a52" strokeOpacity={0.8} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
        </svg>
        <div
          className="os-mmwin"
          data-probe="minimap-window"
          /* ⚠️ PLACED BY ITS RIGHT EDGE. The 26px floor widens the drawn window leftward; placing it by
             `left` would push a floored window's right edge past the day it ends on. */
          style={{ right: `min(${((1 - (frac.left + frac.width)) * 100).toFixed(3)}%, calc(100% - 26px))`, width: `${(frac.width * 100).toFixed(3)}%` }}
          role="slider"
          tabIndex={0}
          aria-label="The eight weeks the chart shows"
          aria-valuemin={0}
          aria-valuemax={daily.length - 1}
          aria-valuenow={endIdx}
          aria-valuetext={from && to ? `${from.label} to ${to.label}` : undefined}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <i /><i />
        </div>
      </div>
      <span className="os-mmlab">Today</span>
    </div>
  );
};
