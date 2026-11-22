/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase B — TODAY'S HEADER (design-refs/phone-app-v5/phone-hub-v5.html `H({...})` "F1": `titleRow`, the
 * need pill and streak on the left, `fig("right")` on the right, `chartL`, `.hl-m`). It replaces v4.1's header.
 *   - "Today", with "Day N of your campaign" under it (from the first query sent); feedback and search on the right;
 *   - left: the need pill ("N things need you", Today's own task count — the dock badge's), which opens To do, and the
 *     streak pill under it (hidden at 0);
 *   - right: the active figure (`v3Counts.active`), "Active queries" and the change on last week (hidden when nothing
 *     moved);
 *   - the chart of active queries per week (v4.1's series and its draw-in), the Mentor mirrored on the left edge.
 * Day one keeps v4.1's headline in place of the figures and the chart.
 * ⚠️ THE MENTOR IS MIRRORED, FIXED TO THE LEFT EDGE AND NEVER MOVES WITH THE DATA. NO RED OR GREEN: both arrows of the
 *    change use the blush. Reduced motion: nothing animates (the count is simply the figure).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MONTHS_SHORT } from "../../../lib/dates";
import { changeWords, needWords, type WeekPoint } from "../../../lib/phoneV41";
import { CAST, Chev, IconBtn } from "../v4/V4Parts";
import { FEEDBACK_ICON } from "./V5Chrome";
import "../v4/phoneV4.css";
import "./phoneV5.css";

/** the ref's chart box (`chartL`, h 150); the line ends 28px short of the right edge, at Today */
const CH_W = 375, CH_H = 150, PAD = 10;
/** the chart starts behind the Mentor: months are labelled from the first one clear of him */
const MENTOR_CLEAR = 0.3;

export interface TodayHeaderV5Props {
  day: string;
  streakWeeks: number;
  active: number;
  change: number | null;
  need: number;
  series: readonly WeekPoint[];
  dayOne: boolean;
  onNeed: () => void;
  onFeedback: () => void;
  onSearch: () => void;
}

const reduced = (): boolean => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

/** v4.1's count-up: about 1.1s, ease-out cubic; with reduced motion it is simply the figure */
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

/** v4.1's chart geometry, unchanged but for the ref's height */
export function chartGeometry(series: readonly WeekPoint[]): null | { d: string; area: string; ex: number; ey: number; months: { x: number; label: string }[] } {
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
}

export const TodayHeaderV5: React.FC<TodayHeaderV5Props> = ({ day, streakWeeks, active, change, need, series, dayOne, onNeed, onFeedback, onSearch }) => {
  const shown = useCountUp(active);
  const ch = useMemo(() => chartGeometry(series), [series]);
  return (
    <header className={`pa5-hd${dayOne ? " one" : ""}`} data-pa5="today-hd" data-pa4="today-hero">
      <img className="pa5-hd-sh" src={CAST.shadow} alt="" />
      <div className="pa5-hd-t">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="pa5-hd-h">Today</h1>
          <div className="pa4-s pa5-hd-day" data-pa5="day">{day}</div>
        </div>
        <button type="button" className="pa4-ib" aria-label="Give feedback" data-pa5="feedback-btn" data-at="header" onClick={onFeedback}>
          <svg className="pa4-ic" viewBox="0 0 24 24" aria-hidden="true"><path d={FEEDBACK_ICON} /></svg>
        </button>
        <span style={{ marginRight: -12 }}><IconBtn label="Search" n="search" pa4="search" onClick={onSearch} /></span>
      </div>
      {dayOne ? (
        <div className="pa5-hd-one"><h2 className="pa4-d2 pa5-hd-hl" data-pa4="headline">Let’s get your<br />first query down.</h2></div>
      ) : (
        <div className="pa5-hd-r">
          <div className="pa5-hd-l">
            {need > 0 ? (
              <button type="button" className="pa5-need" data-pa5="need" data-n={need} onClick={onNeed}>
                <span><i aria-hidden="true" />{needWords(need)}<Chev /></span>
              </button>
            ) : null}
            {streakWeeks > 0 ? (
              <span className="pa4-pill" data-pa5="streak" data-pa4="streak"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2 .7-3.3 2-4.5 0 2 .7 2.7 2 2.7 0-3.2 0-5.7 1-8.7z" /></svg>{streakWeeks} {streakWeeks === 1 ? "week" : "weeks"}</span>
            ) : null}
          </div>
          <div className="pa5-hd-fig">
            <b className="pa5-hd-n" data-pa5="figure" data-n={active} aria-label={`${active} active queries`}>{shown}</b>
            <div className="pa4-s pa5-hd-cap">Active queries</div>
            {change != null ? <div className="pa4-s pa5-hd-chg" data-pa5="change" data-n={change}>{changeWords(change)}</div> : null}
          </div>
        </div>
      )}
      {!dayOne && ch ? (
        <div className="pa5-ch" data-pa5="chart" data-weeks={series.length} data-series={series.map((p) => p.active).join(",")}>
          <svg viewBox={`0 0 ${CH_W} ${CH_H}`} preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="pa5-hd-ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--pa-blush)" stopOpacity=".32" /><stop offset="1" stopColor="var(--pa-blush)" stopOpacity="0" /></linearGradient></defs>
            <path className="pa5-ch-a" d={ch.area} fill="url(#pa5-hd-ga)" />
            <path className="pa5-ch-l" d={ch.d} fill="none" stroke="var(--pa-blush)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength={1} vectorEffect="non-scaling-stroke" />
          </svg>
          <i className="pa5-ch-d" style={{ left: `${(ch.ex / CH_W) * 100}%`, top: ch.ey }} aria-hidden="true" />
          <span className="pa5-ch-tag" data-pa5="today-tag" style={ch.ey >= 34 ? { top: ch.ey - 34 } : { top: Math.max(0, ch.ey - 10), right: 44 }}>Today</span>
          <div className="pa5-ch-x" data-pa5="months">{ch.months.map((m) => <span key={m.label + m.x} style={{ left: `${(m.x / CH_W) * 100}%` }}>{m.label}</span>)}</div>
        </div>
      ) : null}
      <img className="pa5-hd-m" data-pa5="mentor" data-pa4="cast" src={CAST.mentor} alt="" />
    </header>
  );
};
