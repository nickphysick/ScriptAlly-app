/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The phone dashboard's stat cards (Dashboard on the phone v1, Part B; ref screens 01, 04, 08): Active queries with
 * its scrubbable twelve-week chart and the Mentor, then With agents · Closed · Agents. Every figure arrives from
 * `lib/dashPhone`, which reads the desktop's own functions.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, TrendingUp } from "lucide-react";
import { DASH_ART, artUrl } from "../../../lib/dashArt";
import { activeLine, ZERO_LINE, type ActiveCard, type AgentsCard, type ClosedCard, type Seg, type WithAgentsCard } from "../../../lib/dashPhone";

/** The scrub's rest: the card restores this long after the pointer lets go. */
export const SCRUB_RESTORE_MS = 800;
const CHART_H = 84;
/** the room on the right the Mentor stands in, outside the line's extent */
const MENTOR_W = 40;
const MENTOR_ROOM = 48;
const PAD_Y = 8;

const Bar: React.FC<{ segs: Seg[] }> = ({ segs }) => {
  const total = segs.reduce((n, s) => n + s.count, 0);
  return (
    <span className="dm1-bar" data-dm1="bar" aria-hidden="true">
      {total > 0 && segs.filter((s) => s.count > 0).map((s) => (
        <i key={s.key} data-k={s.key} style={{ flexGrow: s.count, background: s.color }} />
      ))}
    </span>
  );
};

const Chart: React.FC<{ card: ActiveCard; scrub: number | null; setScrub: (i: number | null) => void }> = ({ card, scrub, setScrub }) => {
  const [w, setW] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const boxRef = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    if (!el) return;
    const read = () => setW(Math.round(el.getBoundingClientRect().width));
    read();
    ro.current = new ResizeObserver(read);
    ro.current.observe(el);
  }, []);
  const weeks = card.weeks;
  const lineW = Math.max(0, w - MENTOR_ROOM);
  const n = weeks.length;
  const max = Math.max(1, ...weeks.map((p) => p.active));
  const xAt = (i: number) => (n > 1 ? (i / (n - 1)) * lineW : lineW);
  const yAt = (v: number) => PAD_Y + (1 - v / max) * (CHART_H - PAD_Y * 2);
  const pts = weeks.map((p, i) => [xAt(i), yAt(p.active)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = pts.length > 1 ? `${line} L${xAt(n - 1).toFixed(1)},${CHART_H} L0,${CHART_H} Z` : "";
  const last = pts[pts.length - 1];

  /* the scrub: pointer-down or a drag moves the rule to the nearest week; vertical page scroll still works */
  const drag = useRef(false);
  const nearest = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(lineW, clientX - r.left));
    return n > 1 ? Math.round((x / lineW) * (n - 1)) : 0;
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (n < 1 || w === 0) return;
    e.stopPropagation();
    drag.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not every pointer can be captured */ }
    setScrub(nearest(e.clientX, e.currentTarget));
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => { if (drag.current) setScrub(nearest(e.clientX, e.currentTarget)); };
  const up = () => { drag.current = false; setScrub(null); };

  const gid = "dm1-area";
  return (
    <div
      className="dm1-chart" data-dm1="chart" ref={boxRef}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClick={(e) => e.stopPropagation()}
    >
      {w > 0 && n > 1 && (
        <svg width={w} height={CHART_H} viewBox={`0 0 ${w} ${CHART_H}`} aria-hidden="true">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a3a52" stopOpacity="0.22" />
              <stop offset="1" stopColor="#2a3a52" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gid})`} />
          <path d={line} fill="none" stroke="#2a3a52" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" data-dm1="line" />
          {last && <circle cx={last[0]} cy={last[1]} r="4.5" fill="#2a3a52" data-dm1="dot" />}
          {scrub != null && <line x1={xAt(scrub)} x2={xAt(scrub)} y1="0" y2={CHART_H} stroke="rgba(28,19,15,0.3)" strokeWidth="1" data-dm1="rule" data-week={scrub} />}
        </svg>
      )}
      <img
        className="dm1-mentor" data-dm1="mentor" src={artUrl(DASH_ART.mentor)} alt="" aria-hidden="true" draggable={false}
        style={{ width: MENTOR_W }}
      />
      {w > 0 && (
        <div className="dm1-axis" aria-hidden="true">
          {card.months.map((m) => {
            const x = xAt(m.index);
            const left = Math.max(0, Math.min(lineW + MENTOR_ROOM - 28, x - 12));
            return <span key={`${m.label}${m.index}`} style={{ left }}>{m.label}</span>;
          })}
        </div>
      )}
    </div>
  );
};

export const PhoneStats: React.FC<{
  loading: boolean;
  active: ActiveCard;
  withAgents: WithAgentsCard;
  closed: ClosedCard | null;
  agents: AgentsCard;
  onActive: () => void;
  onWithAgents: () => void;
  onClosed: () => void;
  onAgents: () => void;
}> = ({ loading, active, withAgents, closed, agents, onActive, onWithAgents, onClosed, onAgents }) => {
  const [scrub, setScrubNow] = useState<number | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current != null) window.clearTimeout(timer.current); }, []);
  /* the rule follows the pointer; on release the card holds the week for 0.8s, then restores */
  const setScrub = useCallback((i: number | null) => {
    if (timer.current != null) { window.clearTimeout(timer.current); timer.current = null; }
    if (i != null) { setScrubNow(i); setHeld(i); return; }
    setScrubNow(null);
    timer.current = window.setTimeout(() => { setHeld(null); timer.current = null; }, SCRUB_RESTORE_MS);
  }, []);
  const shown = scrub ?? held;
  const week = shown != null ? active.weeks[shown] : null;
  const line = activeLine(active);
  const fig = (n: number | null | undefined) => (loading || n == null ? "" : String(n));

  return (
    <section className="dm1-stats" data-dm1="stats" aria-label="Your numbers">
      <div
        className={`dm1-card dm1-active${loading ? " is-loading" : ""}`} data-dm1="card-active" role="link" tabIndex={0}
        onClick={onActive} onKeyDown={(e) => { if (e.key === "Enter") onActive(); }}
        aria-label={loading ? "Active queries" : `Active queries: ${active.count}. Open the Query Centre.`}
      >
        <div className="dm1-ahead">
          <span className="dm1-attl"><TrendingUp aria-hidden="true" />Active queries</span>
          <span className="dm1-aweeks">12 weeks<ChevronRight aria-hidden="true" /></span>
        </div>
        <div className="dm1-arow">
          <span className="dm1-num dm1-num--big" data-dm1="active-num">{week ? week.active : fig(active.count)}</span>
          {!loading && !week && active.chip != null && <span className="dm1-chip" data-dm1="chip">↑ {active.chip} this month</span>}
        </div>
        <p className="dm1-aline" data-dm1="active-line">
          {loading ? " " : week
            ? <>active in the week of <b>{week.label}</b></>
            : <>{line.bold && <><b>{line.bold}</b> · </>}{line.rest}</>}
        </p>
        {!loading && <Chart card={active} scrub={scrub} setScrub={setScrub} />}
        {loading && <div className="dm1-chart dm1-chart--sk" aria-hidden="true" />}
      </div>

      <div className="dm1-trio">
        <button type="button" className={`dm1-card dm1-small${loading ? " is-loading" : ""}`} data-dm1="card-with" onClick={onWithAgents}>
          <span className="dm1-sttl" style={{ color: "#2a3a52" }}>With agents</span>
          <span className="dm1-num" data-dm1="num">{fig(withAgents.n)}</span>
          <span className="dm1-sline">{loading ? " " : withAgents.n > 0 ? `${withAgents.reading} reading` : ZERO_LINE.withAgents}</span>
          <Bar segs={withAgents.segs} />
        </button>
        <button type="button" className={`dm1-card dm1-small${loading ? " is-loading" : ""}`} data-dm1="card-closed" onClick={onClosed}>
          <span className="dm1-sttl" style={{ color: "#6d665e" }}>Closed</span>
          <span className="dm1-num" data-dm1="num">{fig(closed?.n)}</span>
          <span className="dm1-sline">{loading || !closed ? " " : closed.top ? `${closed.top.count} ${closed.top.label}` : ZERO_LINE.closed}</span>
          <Bar segs={closed?.segs ?? []} />
        </button>
        <button type="button" className={`dm1-card dm1-small${loading ? " is-loading" : ""}`} data-dm1="card-agents" onClick={onAgents}>
          <span className="dm1-sttl" style={{ color: "#5f7591" }}>Agents</span>
          <span className="dm1-num" data-dm1="num">{fig(agents.queried)}{!loading && <small>/{agents.total}</small>}</span>
          <span className="dm1-sline">{loading ? " " : agents.toQuery > 0 ? `${agents.toQuery} to query` : ZERO_LINE.agents}</span>
          <Bar segs={agents.segs} />
        </button>
      </div>
    </section>
  );
};
