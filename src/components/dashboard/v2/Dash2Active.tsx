/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2 · the queries chart (Part C; refs design-refs/dashboard-v2, -v2-1, and v2.2 Part B, screens/01 and 02).
 *
 * The navy band: the count on the left ("{n} active queries" or "{n} queries sent"), the change beside it, and on the
 * right an Active / Sent toggle (session only — never stored). Under it, one of two plots in the same 270px:
 *   Active — v2.1's chart, unchanged: a small white dot per week, this week a 36px navy circle holding the total, the
 *            navy fill edge to edge; the y-scale runs to 1.35 × the highest week.
 *   Sent   — a bar per week over the SAME weeks (`dash2Weeks` → `visibleWeeks`): the queries first sent that week
 *            (`sentWeeks`, by `sentAt`), this week in rose; 0 to 1.15 × the highest week, gridlines at 25/50/75%.
 * Hovering or focusing a week draws a dashed line through it and shows that week's card; switching mode hides it.
 *
 * ⚠️ EVERY FIGURE IS AN EXISTING DERIVATION (lib/dash2): Active's totals are the ledger's weekly stock and its card's
 * rows are `weekMix` folded by `weekCallout`; Sent counts each query once at its first-sent date. A query with no sent
 * date is in neither plot.
 */
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import "./dash2Active.css";
import { createPortal } from "react-dom";
import type { Activity, Agent, Query } from "../../../types";
import { activeTitle } from "../OneScreenChart";
import {
  activityIndex, breakdownFor, dash2Weeks, dateLabels, sentAllTime, sentCount, sentThisWeek, sentWeekAria, sentWeeks, visibleWeeks, weekAria,
} from "../../../lib/dash2";
import { agentPrimary, agentSecondary } from "../../../lib/agentDisplay";
import { Frame } from "./Frame";

export const PLOT_H = 270;
export const EDGE = 22;
/** Active: the scale's top is this × the highest week, so the highest point sits well below the card's band */
export const HEADROOM = 1.35;
/** Sent: the scale's top */
export const SENT_HEADROOM = 1.15;
/** Active's y-range: 30px of room at the top, 34px at the foot for the date labels */
const TOP = 30;
const BOTTOM = 34;
/** Sent's top: room for this week's count over the tallest bar */
const SENT_TOP = 44;
const TIP_W = 250;
const SENT_AGENTS = 3;

export type ChartMode = "active" | "sent";

export const Dash2Active: React.FC<{
  loading: boolean;
  queries: readonly Query[];
  activities: readonly Activity[];
  agents?: readonly Agent[];
  activeCount: number | null;
  undatedCount: number;
  now: Date;
}> = ({ loading, queries, activities, agents = [], activeCount, undatedCount, now }) => {
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

  const [mode, setMode] = useState<ChartMode>("active");
  const all = useMemo(() => (loading ? [] : dash2Weeks(queries, now)), [loading, queries, now]);
  const weeks = useMemo(() => visibleWeeks(all, w, EDGE), [all, w]);
  const offset = all.length - weeks.length;
  const index = useMemo(() => activityIndex(activities), [activities]);
  const sent = useMemo(() => (loading ? [] : sentWeeks(queries, weeks, now)), [loading, queries, weeks, now]);
  const [hover, setHover] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  /* the card's own height, measured once it is drawn, so it centres on its anchor whatever its rows */
  const [tipH, setTipH] = useState(200);
  const tipRef = (el: HTMLDivElement | null) => { if (el) { const h = el.offsetHeight; if (h > 0 && Math.abs(h - tipH) > 1) setTipH(h); } };

  const H = PLOT_H;
  const bot = H - BOTTOM;
  const xs = weeks.map((_, i) => (weeks.length === 1 ? w - EDGE : EDGE + (i * (w - 2 * EDGE)) / (weeks.length - 1)));
  /* Active */
  const max = Math.max(1, ...weeks.map((p) => p.total)) * HEADROOM;
  const ys = weeks.map((p) => bot - (p.total / max) * (bot - TOP));
  const pts: [number, number][] = xs.map((x, i) => [x, ys[i]]);
  const line = pts.length ? [[0, ys[0]] as [number, number], ...pts, [w, ys[ys.length - 1]] as [number, number]] : [];
  const lineD = line.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fillD = line.length ? `${lineD} L${w},${H} L0,${H} Z` : "";
  const labels = dateLabels(weeks);
  /* Sent */
  const sMax = Math.max(1, ...sent.map((s) => s.n)) * SENT_HEADROOM;
  const sY = (n: number) => bot - (n / sMax) * (bot - SENT_TOP);
  const step = weeks.length > 1 ? (w - 2 * EDGE) / (weeks.length - 1) : w - 2 * EDGE;
  const barW = Math.min(26, 0.62 * step);
  const colW = weeks.length > 1 ? step : Math.max(barW, 40);

  const hk = hover !== null && weeks[hover] ? hover : null;
  const bd = useMemo(() => {
    if (hk === null || mode !== "active") return null;
    const gi = hk + offset;
    return breakdownFor(queries, index, all[gi].atMs, gi > 0 ? all[gi - 1].atMs : null, now);
  }, [hk, mode, offset, queries, index, all, now]);
  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const qById = useMemo(() => new Map(queries.map((q) => [q.id, q])), [queries]);
  const sentRows = hk !== null && mode === "sent" && sent[hk]
    ? sent[hk].ids.map((id) => { const a = agentById.get(qById.get(id)?.agentId ?? ""); const sec = agentSecondary(a); return sec ? `${agentPrimary(a)} · ${sec}` : agentPrimary(a); })
    : [];

  const show = (i: number, el: HTMLElement) => { setHover(i); setAnchor(el.getBoundingClientRect()); };
  const hide = () => { setHover(null); setAnchor(null); };
  const pick = (m: ChartMode) => { hide(); setMode(m); };

  /* the card: beside its anchor, flipped left near the right edge, held on screen */
  const tipPos = (() => {
    if (!anchor || typeof window === "undefined") return null;
    const vw = window.innerWidth, vh = window.innerHeight;
    const ax = mode === "sent" ? anchor.left + anchor.width / 2 + barW / 2 : anchor.right;
    let left = ax + 14;
    if (left + TIP_W > vw - 8) left = (mode === "sent" ? anchor.left + anchor.width / 2 - barW / 2 : anchor.left) - 14 - TIP_W;
    left = Math.max(8, Math.min(left, vw - TIP_W - 8));
    const cy = mode === "sent" && hk !== null ? anchor.top + sY(sent[hk]?.n ?? 0) : anchor.top + anchor.height / 2;
    const top = Math.max(8, Math.min(cy - tipH / 2, vh - tipH - 8));
    return { left, top };
  })();

  const fresh = loading ? 0 : sentThisWeek(queries, now);
  const title = mode === "sent" ? (loading ? "Queries sent" : sentCount(sentAllTime(queries, now))) : activeTitle(activeCount, undatedCount);
  const change = fresh > 0 ? (mode === "sent" ? `${fresh} this week` : `+${fresh} this week`) : null;

  return (
    <Frame tone="navy" label="Active queries" probe="active" loading={loading} className="d22-chart" data={{ mode }}
      title={<span data-d2="chart-count">{title}</span>}
      after={change ? <span className="d2-bpill" data-d2="this-week">{change}</span> : null}
      meta={
        <span className="d22-tog" role="tablist" aria-label="Chart" data-d2="chart-toggle">
          {(["active", "sent"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} aria-controls="d22-plot" data-m={m} onClick={() => pick(m)}>
              {m === "active" ? "Active" : "Sent"}
            </button>
          ))}
        </span>
      }>
      <div className="d2-aq" data-d2="aq">
        <div className={`d2-plot${mode === "sent" ? " is-sent" : ""}`} id="d22-plot" role="tabpanel" ref={plotRef} data-d2="plot" data-mode={mode} style={{ height: H }}>
          {w > 0 && weeks.length > 0 && mode === "active" && (
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
            </>
          )}
          {w > 0 && weeks.length > 0 && mode === "sent" && (
            <>
              {[0.25, 0.5, 0.75].map((f) => <i key={f} className="d22-grid" aria-hidden="true" style={{ top: bot - f * (bot - SENT_TOP) }} />)}
              {hk !== null && <i className="d2-vline d22-svline" data-d2="vline" style={{ left: xs[hk] }} />}
              {weeks.map((p, i) => {
                const s = sent[i] ?? { n: 0, cumulative: 0, ids: [] };
                const h = s.n > 0 ? bot - sY(s.n) : 3;
                return (
                  <button key={p.start.getTime()} type="button" className={`d22-col${p.now ? " is-now" : ""}${hk === i ? " is-on" : ""}`}
                    data-d2="sweek" data-i={i + offset} data-n={s.n} data-cum={s.cumulative}
                    style={{ left: xs[i] - colW / 2, width: colW }}
                    aria-label={sentWeekAria(p.label, s.n)} aria-describedby={hk === i ? "d2-wtip" : undefined}
                    onMouseEnter={(e) => show(i, e.currentTarget)} onMouseLeave={hide}
                    onFocus={(e) => show(i, e.currentTarget)} onBlur={hide}>
                    <span className={`d22-bar${s.n === 0 ? " is-zero" : ""}`} data-d2="sbar" style={{ width: barW, height: h, top: bot - h }} />
                    {s.n > 0 && <span className="d22-bn" data-d2="sbar-n" style={{ top: sY(s.n) - 6 }}>{s.n}</span>}
                  </button>
                );
              })}
            </>
          )}
          {w > 0 && weeks.length > 0 && (
            <div className="d2-axis" aria-hidden="true">
              {labels.map((l, k) => (
                <span key={l.i} data-d2="axis" className={l.text === "Today" ? "is-today" : undefined}
                  style={{ left: xs[l.i], transform: k === 0 ? "none" : k === labels.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}>{l.text}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      {hk !== null && mode === "active" && bd && tipPos && typeof document !== "undefined" && createPortal(
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
      {hk !== null && mode === "sent" && sent[hk] && tipPos && typeof document !== "undefined" && createPortal(
        <div ref={tipRef} className="d2-wtip d22-stip" id="d2-wtip" role="status" data-d2="stip" data-i={hk + offset} style={{ left: tipPos.left, top: tipPos.top }}>
          <small>Week of</small>
          <span className="d2-wdt" data-d2="wtip-date">{weeks[hk].label}</span>
          {sent[hk].n === 0 ? <p className="d22-snone" data-d2="stip-none">None sent this week.</p> : (
            <>
              <div className="d2-wbig"><b data-d2="stip-n">{sent[hk].n}</b><span>{sent[hk].n === 1 ? "query sent" : "queries sent"}</span></div>
              <ul>
                {sentRows.slice(0, SENT_AGENTS).map((r, k) => <li key={k} data-d2="stip-row"><i style={{ background: "#2d3a50" }} />{r}</li>)}
                {sentRows.length > SENT_AGENTS && <li className="d22-smore" data-d2="stip-more">and {sentRows.length - SENT_AGENTS} more</li>}
              </ul>
            </>
          )}
          <p className="d22-scum" data-d2="stip-cum">{sent[hk].cumulative} sent in all</p>
        </div>,
        document.body,
      )}
    </Frame>
  );
};
