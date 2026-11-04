/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2 · Active queries (Part C; ref design-refs/dashboard-v2, screens/01 and 03).
 *
 * A navy band ("{n} active queries", "+{n} this week") and the chart — nothing else (v2.1 removed the three tiles;
 * ref design-refs/dashboard-v2-1, screens/01 and 03). The chart is 280px tall and its navy fill runs edge to edge of
 * the frame: the first and last points sit 22px in and the line carries on flat to each edge. The y-scale runs to
 * 1.35 × the highest week, so the line sits mid-card. Each week is a small white dot; this week is a 36px navy circle
 * holding the total. Hovering or focusing either draws a dashed line through it and shows that week's breakdown.
 * No event pins, no hawk, no grain.
 *
 * ⚠️ EVERY FIGURE IS AN EXISTING DERIVATION (lib/dash2): a circle's total is the ledger's weekly stock, the card's rows
 * are `weekMix` folded by `weekCallout`, so they sum to the total by construction.
 */
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import "./dash2Active.css";
import { createPortal } from "react-dom";
import type { Activity, Query } from "../../../types";
import { activeTitle } from "../OneScreenChart";
import { activityIndex, breakdownFor, dash2Weeks, dateLabels, sentThisWeek, visibleWeeks, weekAria } from "../../../lib/dash2";
import { Frame } from "./Frame";

export const PLOT_H = 280;
export const EDGE = 22;
/** the scale's top is this × the highest week, so the highest point sits well below the card's band */
export const HEADROOM = 1.35;
/** the plot's y-range: 30px of room at the top, 34px at the foot for the date labels */
const TOP = 30;
const BOTTOM = 34;
const TIP_W = 250;

export const Dash2Active: React.FC<{
  loading: boolean;
  queries: readonly Query[];
  activities: readonly Activity[];
  activeCount: number | null;
  undatedCount: number;
  now: Date;
}> = ({ loading, queries, activities, activeCount, undatedCount, now }) => {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return undefined;
    const read = () => { const v = el.clientWidth; if (v > 0) setW(v); };
    read();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [loading]);

  const all = useMemo(() => (loading ? [] : dash2Weeks(queries, now)), [loading, queries, now]);
  const weeks = useMemo(() => visibleWeeks(all, w, EDGE), [all, w]);
  const offset = all.length - weeks.length;
  const index = useMemo(() => activityIndex(activities), [activities]);
  const [hover, setHover] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  /* the card's own height, measured once it is drawn, so it centres on the circle whatever its rows */
  const [tipH, setTipH] = useState(200);
  const tipRef = (el: HTMLDivElement | null) => { if (el) { const h = el.offsetHeight; if (h > 0 && Math.abs(h - tipH) > 1) setTipH(h); } };

  const max = Math.max(1, ...weeks.map((p) => p.total)) * HEADROOM;
  const H = PLOT_H;
  const bot = H - BOTTOM;
  const xs = weeks.map((_, i) => (weeks.length === 1 ? w - EDGE : EDGE + (i * (w - 2 * EDGE)) / (weeks.length - 1)));
  const ys = weeks.map((p) => bot - (p.total / max) * (bot - TOP));
  const pts: [number, number][] = xs.map((x, i) => [x, ys[i]]);
  const line = pts.length ? [[0, ys[0]] as [number, number], ...pts, [w, ys[ys.length - 1]] as [number, number]] : [];
  const lineD = line.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fillD = line.length ? `${lineD} L${w},${H} L0,${H} Z` : "";
  const labels = dateLabels(weeks);

  const hk = hover !== null && weeks[hover] ? hover : null;
  const bd = useMemo(() => {
    if (hk === null) return null;
    const gi = hk + offset;
    return breakdownFor(queries, index, all[gi].atMs, gi > 0 ? all[gi - 1].atMs : null, now);
  }, [hk, offset, queries, index, all, now]);

  const show = (i: number, el: HTMLElement) => { setHover(i); setAnchor(el.getBoundingClientRect()); };
  const hide = () => { setHover(null); setAnchor(null); };

  /* the card: beside the circle, flipped left near the right edge, held on screen */
  const tipPos = (() => {
    if (!anchor || typeof window === "undefined") return null;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = anchor.right + 14;
    if (left + TIP_W > vw - 8) left = anchor.left - 14 - TIP_W;
    left = Math.max(8, Math.min(left, vw - TIP_W - 8));
    const top = Math.max(8, Math.min(anchor.top + anchor.height / 2 - tipH / 2, vh - tipH - 8));
    return { left, top };
  })();

  const fresh = loading ? 0 : sentThisWeek(queries, now);

  return (
    <Frame tone="navy" label="Active queries" probe="active" loading={loading}
      title={activeTitle(activeCount, undatedCount)}
      meta={fresh > 0 ? <span className="d2-bpill" data-d2="this-week">+{fresh} this week</span> : null}>
      <div className="d2-aq" data-d2="aq">
        <div className="d2-plot" ref={plotRef} data-d2="plot" style={{ height: H }}>
          {w > 0 && weeks.length > 0 && (
            <>
              <svg className="d2-plotsvg" width={w} height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden="true">
                <defs>
                  <linearGradient id="d2-fill" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="rgb(45,58,80)" stopOpacity="0.92" />
                    <stop offset="1" stopColor="rgb(45,58,80)" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                <path d={fillD} fill="url(#d2-fill)" data-d2="fill" />
                <path d={lineD} fill="none" stroke="#1c130f" strokeWidth="2.2" strokeLinejoin="round" />
              </svg>
              {hk !== null && <i className="d2-vline" data-d2="vline" style={{ left: xs[hk] }} />}
              {weeks.map((p, i) => (
                <button key={p.start.getTime()} type="button"
                  className={p.now ? "d2-wk is-now" : "d2-dot"} data-d2="week" data-i={i + offset} data-total={p.total} data-at={p.atMs}
                  style={{ left: xs[i], top: ys[i] }}
                  aria-label={weekAria(p.label, p.total)} aria-describedby={hk === i ? "d2-wtip" : undefined}
                  onMouseEnter={(e) => show(i, e.currentTarget)} onMouseLeave={hide}
                  onFocus={(e) => show(i, e.currentTarget)} onBlur={hide}>
                  {p.now ? p.total : null}
                </button>
              ))}
              <div className="d2-axis" aria-hidden="true">
                {labels.map((l, k) => (
                  <span key={l.i} data-d2="axis" style={{ left: xs[l.i], transform: k === 0 ? "none" : k === labels.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}>{l.text}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {hk !== null && bd && tipPos && typeof document !== "undefined" && createPortal(
        <div ref={tipRef} className="d2-wtip" id="d2-wtip" role="status" data-d2="wtip" data-i={hk + offset} style={{ left: tipPos.left, top: tipPos.top }}>
          <small>Week of</small>
          <span className="d2-wdt" data-d2="wtip-date">{weeks[hk].label}</span>
          <div className="d2-wbig"><b data-d2="wtip-total">{bd.total}</b><span>active queries</span><em data-d2="wtip-change">{bd.change}</em></div>
          <div className="d2-wbar" aria-hidden="true">
            {bd.rows.filter((r) => r.n > 0).map((r) => <i key={r.key} style={{ flex: r.n, background: r.color }} />)}
          </div>
          <ul>
            {bd.rows.filter((r) => r.n > 0).map((r) => (
              <li key={r.key} data-d2="wtip-row" data-key={r.key} data-n={r.n}><i style={{ background: r.color }} />{r.label}<b>{r.n}</b></li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </Frame>
  );
};
