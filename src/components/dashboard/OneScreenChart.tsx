/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenChart — the active-queries chart card (spec §3–§4; ref dashboard-one-screen.html).
 *
 * ⚠️ REAL PIXEL COORDINATES, REDRAWN BY ResizeObserver (§3). Never a fixed viewBox stretched with
 * preserveAspectRatio:none — that distorts strokes and nodes. The viewBox always equals the
 * measured size, so one unit is one pixel.
 *
 * ⚠️ THE READING ZONE (§3): the hover popup activates on the line and BELOW it (10px grace
 * above). Above the line is the pins' territory — pins take priority over the crosshair, and the
 * cursor flips default↔crosshair across the boundary so the change is felt, not guessed.
 *
 * ⚠️ THE POPUP AND THE LEDGER ARE THE SAME NUMBERS READ TWICE — both render the weekly ledger,
 * which reconciles by construction (lib/oneScreen). The stage breakdown is as-of-NOW in both
 * captions' senses: "Where they stand" on the current week, "Where they stand today" on any past
 * week, because stage is only known as-of-now (§4).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Agent, Query, QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { activeStageBreakdown } from "../../lib/dashboardStats";
import { placeTooltip, Rect } from "../../lib/deskTooltip";
import {
  aggregateLedger, awaitingChip, bindEvents, chartEvents, ChartEvent, dailyLedger, DEFAULT_RANGE_DAYS,
  defaultFreq, Freq, LedgerPoint, monotonePath, nearestStop, periodLabel, RANGE_STOPS, rangeChip,
  rangeWindow, stopForDays, yScale,
} from "../../lib/oneScreen";
import { Skel } from "./OneScreenDashboard";

/* ── pure geometry (exported for the node-env tests — there is no layout engine to ask) ── */

export const PADX = 14, PADY = 16, PADTOP = 30;
export const READ_MARGIN = 10;

export const chartX = (i: number, W: number, len: number): number =>
  PADX + (i * (W - 2 * PADX)) / Math.max(1, len - 1);

export const chartY = (v: number, H: number, lo: number, hi: number): number =>
  H - PADY - ((v - lo) / Math.max(1, hi - lo)) * (H - PADY - PADTOP);

/** Snap a local x to the nearest week index, clamped to the series. */
export const snapIdx = (xLocal: number, W: number, len: number): number => {
  const step = (W - 2 * PADX) / Math.max(1, len - 1);
  return Math.max(0, Math.min(len - 1, Math.round((xLocal - PADX) / step)));
};

/** The line's y at an arbitrary x — linear between neighbours; the reading-zone boundary. */
export const lineYAtX = (ys: number[], xLocal: number, W: number): number => {
  const step = (W - 2 * PADX) / Math.max(1, ys.length - 1);
  const t = (xLocal - PADX) / step;
  const i0 = Math.max(0, Math.min(ys.length - 2, Math.floor(t)));
  const f = Math.max(0, Math.min(1, t - i0));
  return ys[i0] + (ys[i0 + 1] - ys[i0]) * f;
};

/** §3: x labels thin automatically — plus always the last. Daily dates are wider than "3 Aug"
    week starts, so daily gets fewer of them. */
export const xLabelEvery = (len: number, freq: Freq = "weekly"): number =>
  Math.max(1, Math.ceil(len / (freq === "daily" ? 6 : 8)));

/** The mockup's short stage names — display-only; the keys are the exact enum strings. */
export const STAGE_SHORT: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "Queried",
  [QueryStatus.PARTIAL_REQUESTED]: "Partial req",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_REQUESTED]: "Full req",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.REVISE_RESUBMIT]: "In revision",
  [QueryStatus.OFFER]: "Offer",
};

/* ── the fixed-position Form 11 tip (plain mode — it never takes the pointer) ── */

const ChartTip: React.FC<{ anchor: Rect | null; children: React.ReactNode }> = ({ anchor, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  React.useLayoutEffect(() => {
    if (!anchor || !ref.current) { setPos(null); return; }
    const box = ref.current.getBoundingClientRect();
    setPos(placeTooltip(anchor, { width: box.width, height: box.height },
      { width: window.innerWidth, height: window.innerHeight }));
  }, [anchor, children]);
  if (!anchor || typeof document === "undefined") return null;
  return createPortal(
    <div ref={ref} className={`os-tip${pos ? " show" : ""}`} style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0 }} role="presentation">
      {children}
    </div>,
    document.body,
  );
};

/* ── the card ── */

/** §10: the headline counts up once on first paint — instant under reduced motion. */
const useCountUp = (to: number, ms = 700): number => {
  const [shown, setShown] = useState(to);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) { setShown(to); return; } // later data changes land instantly
    ran.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || to === 0) { setShown(to); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setShown(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return shown;
};

export const OneScreenChart: React.FC<{
  loading: boolean;
  queries: Query[];
  agents: Agent[];
  now: Date;
  dayOne?: boolean;
  earlyDays?: boolean;
  onSendFirst?: () => void;
}> = ({ loading, queries, agents, now, dayOne = false, earlyDays = false, onSendFirst }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  /* ⚠️ TWO INDEPENDENT CONTROLS: frequency is the GRAIN of a point, range is the WINDOW of days
     on show. They compose — 8 weeks of daily points and 8 weeks of weekly points are the same
     history at two resolutions. `freq` is null until the record decides the opening grain. */
  const [freq, setFreq] = useState<Freq | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(DEFAULT_RANGE_DAYS);
  const [reading, setReading] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [pinIdx, setPinIdx] = useState<number | null>(null);
  const [tipAnchor, setTipAnchor] = useState<Rect | null>(null);
  const [liveText, setLiveText] = useState("");
  const drewIn = useRef(false);

  const daily = useMemo(() => dailyLedger(queries, now), [queries, now]);
  /* ⚠️ A NEW ACCOUNT OPENS ON DAILY — under a month of record makes a two-point weekly line,
     which says nothing. Once chosen by hand, the choice stands. */
  const openFreq = defaultFreq(daily);
  const effFreq: Freq = freq ?? openFreq;
  const ledger = useMemo(() => aggregateLedger(daily, effFreq), [daily, effFreq]);
  const view = useMemo(() => rangeWindow(ledger, rangeDays), [ledger, rangeDays]);
  const active = daily.length ? daily[daily.length - 1].active : 0;
  const shownActive = useCountUp(active);
  const stages = useMemo(() => activeStageBreakdown(queries), [queries]);
  const activeTotal = stages.reduce((a, r) => a + r.count, 0);

  const agentName = useCallback((q: Query) => {
    const a = agents.find((x) => x.id === q.agentId);
    return a?.name || a?.agency || "An agent";
  }, [agents]);
  /* ⚠️ EVENTS LAND ON REAL DATES and a point carries a pin if it CONTAINS one — so the same
     offer pins one day at daily grain and the week that holds it at weekly, without the event
     itself knowing anything about periods. Rebinds whenever the view changes. */
  const allEvents = useMemo(() => chartEvents(queries, agentName), [queries, agentName]);
  const events = useMemo(() => bindEvents(view, allEvents), [view, allEvents]);

  /* §3: measured, and remeasured on resize. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = size?.w ?? 0, H = size?.h ?? 0;
  const sparse = view.length < 2;
  const { lo, hi } = useMemo(() => (sparse ? { lo: 0, hi: 5 } : yScale(view.map((w) => w.active))), [view, sparse]);
  const pts = useMemo<[number, number][]>(
    () => (sparse || !W ? [] : view.map((w, i) => [chartX(i, W, view.length), chartY(w.active, H, lo, hi)])),
    [view, W, H, lo, hi, sparse],
  );
  const path = useMemo(() => monotonePath(pts), [pts]);
  const ys = useMemo(() => pts.map((p) => p[1]), [pts]);

  /* ⚠️ THE DRAW-IN RUNS ONCE, EVER (§3) — never on resize, never on range change, never under
     reduced motion. `drewIn` is a ref for exactly that reason: state would re-arm it on remount
     of the effect, a ref survives every re-render of this mounted card. */
  useEffect(() => {
    if (drewIn.current || !path || loading) return;
    drewIn.current = true;
    const line = lineRef.current, area = areaRef.current;
    if (!line || !area || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const L = line.getTotalLength();
    line.style.strokeDasharray = String(L);
    line.style.strokeDashoffset = String(L);
    area.style.opacity = "0";
    requestAnimationFrame(() => {
      line.style.transition = "stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)";
      area.style.transition = "opacity .6s ease .35s";
      line.style.strokeDashoffset = "0";
      area.style.opacity = "1";
    });
    const id = window.setTimeout(() => {
      line.style.strokeDasharray = ""; line.style.transition = "";
    }, 1100);
    return () => window.clearTimeout(id);
  }, [path, loading]);

  const blurPoint = useCallback(() => { setFocusIdx(-1); setTipAnchor(null); }, []);

  const focusPoint = useCallback((i: number, announce: boolean) => {
    if (!svgRef.current || !view[i]) return;
    setFocusIdx(i);
    setPinIdx(null);
    const r = svgRef.current.getBoundingClientRect();
    setTipAnchor({ left: r.left + chartX(i, W, view.length), top: r.top + chartY(view[i].active, H, lo, hi), width: 0, height: 0 });
    if (announce) {
      const w = view[i];
      setLiveText(`${periodLabel(effFreq, w.label)}. ${w.active} active ${w.active === 1 ? "query" : "queries"}. ${w.sent} sent, ${w.closed} closed.`);
    }
  }, [view, W, H, lo, hi, effFreq]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (sparse || !svgRef.current || pinIdx !== null) return;
    const r = svgRef.current.getBoundingClientRect();
    const xLocal = e.clientX - r.left, yLocal = e.clientY - r.top;
    const onOrBelow = ys.length >= 2 && yLocal >= lineYAtX(ys, xLocal, W) - READ_MARGIN;
    setReading(onOrBelow);
    if (!onOrBelow) { if (focusIdx >= 0) blurPoint(); return; }
    focusPoint(snapIdx(xLocal, W, view.length), false);
  };

  const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (sparse) return;
    let i = focusIdx < 0 ? view.length - 1 : focusIdx;
    if (e.key === "ArrowRight") i = Math.min(view.length - 1, i + 1);
    else if (e.key === "ArrowLeft") i = Math.max(0, i - 1);
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = view.length - 1;
    else if (e.key === "Escape") { blurPoint(); svgRef.current?.blur(); return; }
    else return;
    e.preventDefault();
    focusPoint(i, true);
  };

  /* every control change drops the focused point and any open pin — both index into a view that
     is about to be a different length */
  const resetRead = () => { blurPoint(); setPinIdx(null); };
  const stop = stopForDays(rangeDays);

  const every = xLabelEvery(view.length, effFreq);
  const lastIdx = view.length - 1;
  const focusedWeek: LedgerPoint | null = focusIdx >= 0 ? view[focusIdx] : null;
  const pinEvent = pinIdx !== null ? events.get(pinIdx) ?? null : null;

  return (
    <div className={`os-card os-lift os-lead${loading ? " isload" : ""}`}>
      {loading && <Skel bars={["h", "grow", ""]} />}
      <div className="os-lh">
        <span className="os-ll">Active queries</span>
        <div className="os-freqsel">
          <select
            aria-label="Chart frequency"
            value={effFreq}
            onChange={(e) => { setFreq(e.target.value as Freq); resetRead(); }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <span className="os-cv" aria-hidden="true">▾</span>
        </div>
        {/* ⚠️ CONTINUOUS BUT SNAPPING: the thumb can only rest on a landmark, so every position
            it can hold names a real span. The label is the control's value in words. */}
        <div className="os-rangeslider">
          <input
            type="range" min={0} max={100} step={1} value={stop.p}
            aria-label="Chart range"
            aria-valuetext={stop.label}
            onChange={(e) => { setRangeDays(nearestStop(Number(e.target.value)).days); resetRead(); }}
          />
        </div>
        <span className="os-rangelbl">{stop.label}</span>
      </div>
      <div className="os-fig">
        <span className="os-n">{shownActive}</span>
        {/* §9: in the first fortnight the chip states what is out, not a movement — a two-point
            range delta is noise dressed as trend */}
        {earlyDays
          ? <span className="os-chip">{awaitingChip(queries)}</span>
          : view.length >= 2 && <span className="os-chip">{rangeChip(view)}</span>}
      </div>

      <div className="os-chartwrap" ref={wrapRef}>
        {dayOne ? (
          /* §9: the day-one card is an invitation, not an empty chart */
          <div className="os-dayone on">
            <svg className="os-dayone-art" viewBox="0 0 120 90" aria-hidden="true">
              <rect x="18" y="34" width="60" height="40" rx="4" />
              <path d="M18 38l30 22 30-22" />
              <path d="M70 30l14-14M84 16h-10M84 16v10" />
              <path d="M90 44c6-2 10-8 10-14" />
            </svg>
            <span className="os-dayone-copy">Every query you send and every reply that comes back will be charted here.</span>
            <button type="button" className="os-btn-mini" onClick={onSendFirst}>Send your first query</button>
          </div>
        ) : sparse ? (
          <div className="os-sparse on">
            {/* ⚠️ GRAIN-AWARE, because the grain decides when the second point arrives. The old
                wording named weeks unconditionally and became false the moment the chart could
                be read daily — at that grain the line begins the next day. */}
            <span>The line begins once there are two {effFreq === "daily" ? "days" : effFreq === "weekly" ? "weeks" : "months"} on the record.</span>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className={reading ? "reading" : undefined}
            width={W || undefined}
            height={H || undefined}
            viewBox={W && H ? `0 0 ${W} ${H}` : undefined}
            tabIndex={0}
            role="img"
            aria-label="Active queries over time. Use the arrow keys to step through each point."
            onMouseMove={onMove}
            onMouseLeave={() => { setReading(false); blurPoint(); setPinIdx(null); }}
            onKeyDown={onKey}
            onFocus={() => { if (focusIdx < 0 && view.length > 1) focusPoint(view.length - 1, true); }}
            onBlur={blurPoint}
          >
            {W > 0 && H > 0 && (
              <>
                <defs>
                  <linearGradient id="os-aqg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#8a9e88" stopOpacity=".26" />
                    <stop offset="1" stopColor="#8a9e88" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* the only scale furniture: axis lo and hi, faint mono, left edge (§3) */}
                <text className="os-ylab" x={3} y={chartY(hi, H, lo, hi) + 3}>{hi}</text>
                <text className="os-ylab" x={3} y={chartY(lo, H, lo, hi) + 3}>{lo}</text>
                <path ref={areaRef} d={`${path} L ${chartX(lastIdx, W, view.length).toFixed(1)} ${H} L ${chartX(0, W, view.length).toFixed(1)} ${H} Z`} fill="url(#os-aqg)" />
                <path ref={lineRef} d={path} fill="none" stroke="#8a9e88" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                {/* event pins — 20px above the line, priority over the crosshair (§3) */}
                {view.map((w, i) => {
                  const ev = events.get(i);
                  if (!ev) return null;
                  const x = chartX(i, W, view.length), y = chartY(w.active, H, lo, hi);
                  return (
                    <g
                      key={w.start.toISOString()}
                      className="os-pin"
                      onMouseMove={(e) => e.stopPropagation()}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        blurPoint();
                        setPinIdx(i);
                        const pr = (e.currentTarget as SVGGElement).getBoundingClientRect();
                        setTipAnchor({ left: pr.left, top: pr.top, width: pr.width, height: pr.height });
                      }}
                      onMouseLeave={() => { setPinIdx(null); setTipAnchor(null); }}
                    >
                      <line x1={x} x2={x} y1={y} y2={y - 17} stroke="#c9a89e" strokeWidth={1} />
                      <circle className="hit" cx={x} cy={y - 20} r={6} fill="#f3e0d6" stroke="#7c3a2a" strokeWidth={1.4} />
                      <circle cx={x} cy={y - 20} r={1.8} fill="#7c3a2a" />
                    </g>
                  );
                })}
                {/* ⚠️ A NODE AT EVERY POINT — the line alone hides how many readings it is drawn
                    from, and at daily grain that is the difference between a trend and a guess.
                    The latest sits bigger, as the resting mark. */}
                {pts.map(([x, y], i) => (
                  <circle
                    key={i} cx={x.toFixed(1)} cy={y.toFixed(1)}
                    r={i === lastIdx ? 4 : 2.6} fill="#fdfaf5" stroke="#8a9e88"
                    strokeWidth={i === lastIdx ? 2 : 1.6}
                  />
                ))}
                {/* crosshair + black node while a week is focused */}
                {focusIdx >= 0 && (
                  <>
                    <line x1={chartX(focusIdx, W, view.length)} x2={chartX(focusIdx, W, view.length)} y1={4} y2={H - 3} stroke="#c9a89e" strokeWidth={1.1} strokeDasharray="3 5" />
                    <circle cx={chartX(focusIdx, W, view.length)} cy={chartY(view[focusIdx].active, H, lo, hi)} r={5} fill="#fdfaf5" stroke="#241811" strokeWidth={2} />
                  </>
                )}
              </>
            )}
          </svg>
        )}
      </div>

      <div className="os-xlabels">
        {view.map((w, i) =>
          (i % every === 0 || i === lastIdx)
            ? <span key={w.start.toISOString()} className={i === lastIdx ? "now" : undefined}>{w.label}</span>
            : null,
        )}
      </div>
      {/* §3: the keyboard walk narrates here */}
      <div className="os-sr" aria-live="polite">{liveText}</div>

      {/* ── the Form 11 popup: a week, or a pin ── */}
      <ChartTip anchor={tipAnchor}>
        {pinEvent ? (
          <div className="frame pinframe">
            <div className="fhdr pk"><span className="wkl">{pinEvent.kind} · {pinIdx !== null ? view[pinIdx].label : ""}</span></div>
            <div className="fbd"><div className="pintext"><b>{pinEvent.who}</b> {pinEvent.text}</div></div>
          </div>
        ) : focusedWeek ? (
          <div className="frame">
            <div className="fhdr"><span className="wkl">{periodLabel(effFreq, focusedWeek.label)}</span><span className="big">{focusedWeek.active}</span></div>
            <div className="fbd">
              <div className="flowrow">
                <div className="fc"><div className="fv">{focusedWeek.sent}</div><div className="fl">Sent</div></div>
                <div className="fc"><div className="fv">{focusedWeek.closed}</div><div className="fl">Closed</div></div>
                {(() => {
                  const net = focusedWeek.sent - focusedWeek.closed;
                  return (
                    <div className="fc">
                      <div className={`fv ${net > 0 ? "net" : net < 0 ? "netdn" : "none"}`}>{net === 0 ? "—" : `${net > 0 ? "+" : ""}${net}`}</div>
                      <div className="fl">Net</div>
                    </div>
                  );
                })()}
              </div>
              <div className="fsep" />
              {/* stage is only known AS-OF-NOW — the caption is what stops the card implying
                  historical stage data it does not have (§4) */}
              <div className="fcap">{focusIdx === lastIdx ? "Where they stand" : "Where they stand today"}</div>
              {stages.map((s) => (
                <div key={s.status} className={`srow${s.count === 0 ? " dim" : ""}`}>
                  <StatusDot status={s.status} overrideSize={12} ghost={s.count === 0} decorative />
                  <span className="nm">{STAGE_SHORT[s.status] ?? s.label}</span>
                  <span className="ct">{s.count}</span>
                </div>
              ))}
              {activeTotal === 0 && <div className="fl" style={{ marginTop: 4 }}>Nothing in flight</div>}
            </div>
          </div>
        ) : null}
      </ChartTip>
    </div>
  );
};
