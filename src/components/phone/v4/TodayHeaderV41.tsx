/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4.1 — TODAY'S HEADER (design-refs/phone-app-v4-1/phone-today-v4-1.html, "Today, at rest"). Four things:
 *   - the day line with the streak pill (hidden at 0) and search;
 *   - the active figure (`v3Counts.active`, the open courts) with "Active queries" and its change on last week;
 *   - one blush pill, "N things need you" (Today's own task rows), which scrolls the page to Up next;
 *   - the chart of active queries per week (the dashboard's ledger), growing from the Mentor to a dot at Today.
 * ⚠️ THE MENTOR IS MIRRORED, FIXED TO THE LEFT EDGE AND NEVER MOVES WITH THE DATA (baked decision 3).
 * ⚠️ NO RED OR GREEN: both arrows of the change use the blush. Motion honours prefers-reduced-motion (phoneV4.css).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MONTHS_SHORT } from "../../../lib/dates";
import { changeWords, needWords, type WeekPoint } from "../../../lib/phoneV41";
import { CAST, Chev, IconBtn } from "./V4Parts";
import { openV3 } from "../v3/v3Store";
import "./phoneV4.css";

const CH_W = 375, CH_H = 96, PAD = 10;
/** the chart starts behind the Mentor: months are labelled from the first one clear of him */
const MENTOR_CLEAR = 0.3;

export interface HeaderProps {
  day: string;
  streakWeeks: number;
  active: number;
  change: number | null;
  need: number;
  series: readonly WeekPoint[];
  dayOne: boolean;
  onNeed: () => void;
}

const reduced = (): boolean => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

/** the figure counts up on open (about 1.1s, ease-out cubic); with reduced motion it is simply the figure */
function useCountUp(to: number): number {
  const [n, setN] = useState(() => (reduced() ? to : 0));
  const done = useRef(false);
  useEffect(() => {
    if (done.current || reduced()) { setN(to); return undefined; }
    done.current = true;
    const t0 = performance.now();
    let raf = 0;
    const f = (t: number) => { const k = Math.min(1, (t - t0) / 1100); setN(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return n;
}

export const TodayHeaderV41: React.FC<HeaderProps> = ({ day, streakWeeks, active, change, need, series, dayOne, onNeed }) => {
  const shown = useCountUp(active);
  const ch = useMemo(() => {
    const n = series.length;
    if (n < 2) return null;
    const x1 = CH_W - 28;
    const mx = Math.max(1, ...series.map((p) => p.active));
    const xs = series.map((_, i) => (i / (n - 1)) * x1);
    const ys = series.map((p) => PAD + (1 - p.active / mx) * (CH_H - PAD - 6));
    const d = "M" + xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" L");
    /* months: each first-of-month that falls in the series, placed by its week, from the first clear of the Mentor */
    const t0 = series[0].endMs, t1 = series[n - 1].endMs;
    const months: { x: number; label: string }[] = [];
    const m = new Date(t0); m.setDate(1); m.setHours(0, 0, 0, 0); m.setMonth(m.getMonth() + 1);
    for (; m.getTime() <= t1; m.setMonth(m.getMonth() + 1)) {
      const x = ((m.getTime() - t0) / (t1 - t0 || 1)) * x1;
      if (x / CH_W >= MENTOR_CLEAR && x < x1 - 24) months.push({ x, label: m.getMonth() === 0 ? String(m.getFullYear()) : MONTHS_SHORT[m.getMonth()] });
    }
    /* a long campaign has more months than room: keep them at least 52px apart, counting back from the newest */
    const kept: typeof months = [];
    for (let i = months.length - 1; i >= 0; i--) if (!kept.length || kept[0].x - months[i].x >= 52) kept.unshift(months[i]);
    return { d, area: `${d} L${x1},${CH_H} L0,${CH_H} Z`, ex: xs[n - 1], ey: ys[n - 1], months: kept };
  }, [series]);

  return (
    <header className={`pa4-hero pa41-hd${dayOne ? " one" : ""}`} data-pa4="today-hero" data-pa41="header">
      <img className="pa4-shadow" src={CAST.shadow} alt="" />
      <div className="pa4-top">
        <span className="pa4-s" data-pa41="day">{day}</span>
        {streakWeeks > 0 ? (
          <span className="pa4-pill" data-pa4="streak"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2 .7-3.3 2-4.5 0 2 .7 2.7 2 2.7 0-3.2 0-5.7 1-8.7z" /></svg>{streakWeeks} {streakWeeks === 1 ? "week" : "weeks"}</span>
        ) : null}
        <span style={{ marginRight: -12 }}><IconBtn label="Search" n="search" pa4="search" onClick={() => openV3({ type: "search" })} /></span>
      </div>
      {dayOne ? (
        <div className="pa41-hr one"><h1 className="pa4-d2 pa4-hl" data-pa4="headline">Let’s get your<br />first query down.</h1></div>
      ) : (
        <div className="pa41-hr">
          <div className="pa41-fig">
            <div className="pa41-cap"><span className="pa41-capt">Active queries</span>{change != null ? <span className="pa41-chg" data-pa41="change" data-n={change}>{changeWords(change)}</span> : null}</div>
            <b className="pa41-n" data-pa41="figure" data-n={active} aria-label={`${active} active queries`}>{shown}</b>
          </div>
          {need > 0 ? (
            <button type="button" className="pa41-need" data-pa41="need" data-n={need} onClick={onNeed}>
              <span><i aria-hidden="true" />{needWords(need)}<Chev /></span>
            </button>
          ) : null}
        </div>
      )}
      {!dayOne && ch ? (
        <div className="pa41-ch" data-pa41="chart" data-weeks={series.length}>
          <svg viewBox={`0 0 ${CH_W} ${CH_H}`} preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="pa41-ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--pa-blush)" stopOpacity=".32" /><stop offset="1" stopColor="var(--pa-blush)" stopOpacity="0" /></linearGradient></defs>
            <path className="pa41-area" d={ch.area} fill="url(#pa41-ga)" />
            <path className="pa41-line" d={ch.d} fill="none" stroke="var(--pa-blush)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength={1} vectorEffect="non-scaling-stroke" />
          </svg>
          <i className="pa41-dot" style={{ left: `${(ch.ex / CH_W) * 100}%`, top: ch.ey }} aria-hidden="true" />
          {/* above the dot where there is room; beside it, to its left, where the line ends near the top */}
          <span className="pa41-tag" data-pa41="today-tag" style={ch.ey >= 34 ? { top: ch.ey - 34 } : { top: Math.max(0, ch.ey - 10), right: 44 }}>Today</span>
          <div className="pa41-x" data-pa41="months">{ch.months.map((m) => <span key={m.label + m.x} data-pa41="month" style={{ left: `${(m.x / CH_W) * 100}%` }}>{m.label}</span>)}</div>
        </div>
      ) : null}
      <img className="pa41-mentor" data-pa4="cast" data-pa41="mentor" src={CAST.mentor} alt="" />
    </header>
  );
};
