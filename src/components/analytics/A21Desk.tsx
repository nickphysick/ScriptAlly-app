/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v21 §B — THE DESK (design-refs/analytics-v21/analytics-v21.html, `.desk .dj`): three cards — Queries
 * sent, Request rate, Median wait — each a figure over its unit, two counted rows, a 40px chart and an axis, and a
 * rotated double-ringed stamp. DESKTOP ONLY: the phone keeps v17's at-a-glance strip.
 *
 * ⚠️ v24 §B / v24.1: THE CARDS ARE `deskV24` (lib/analyticsV24) — Queries sent, Asked to read more, Replies due —
 *    and the third draws the due strip (the past zone, today, the next eight weeks) rather than a line.
 * ⚠️ EVERY FIGURE IS the desk derivation's, and a stamp is drawn only where its comparison has something to compare.
 * ⚠️ THE WHOLE CARD SCROLLS TO ITS SECTION. It is a `role="button"` article, not a `<button>`: a heading is not
 *    phrasing content and may not sit inside one.
 * ⚠️ THE ICON DISC'S TINT IS PRE-COMPUTED (12% of the card's colour over white): no `color-mix()`.
 */
import React from "react";
import type { DeskCard } from "../../lib/analyticsV21";
import { chipN } from "../../lib/analyticsV21";

const TINT: Record<string, string> = { "#2a3a52": "#e5e7ea", "#2f5f86": "#e6ecf1", "#a0633f": "#f4ece8" };
const ICON: Record<DeskCard["key"], React.ReactNode> = {
  sent: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 9.5 17 3l-4.5 14-3-5.5z" /><path d="M9.5 11.5 17 3" /></svg>,
  rate: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M3.5 4.5h13v8.5h-7.2L5.5 16v-3H3.5z" /></svg>,
  wait: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /></svg>,
  /* v24.1: a calendar — an outlined square, two ring tabs and a top rule */
  due: <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="4.5" width="13" height="12" rx="2" /><path d="M3.5 8.5h13M7 3v3M13 3v3" /></svg>,
};

/** The line chart: points evenly along 6..514 of a 520 × 40 box, the higher value nearer the top. */
export function linePath(values: number[]): { d: string; end: { x: number; y: number } } | null {
  if (values.length === 0) return null;
  const lo = Math.min(...values), hi = Math.max(...values);
  const n = values.length;
  const pts = values.map((v, i) => [n === 1 ? 514 : 6 + (508 * i) / (n - 1), hi === lo ? 20 : 34 - ((v - lo) / (hi - lo)) * 28] as const);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return { d, end: { x: pts[n - 1][0], y: pts[n - 1][1] } };
}

const Chart: React.FC<{ card: DeskCard }> = ({ card }) => {
  if (card.chart.kind === "bars") {
    const vs = card.chart.values, max = Math.max(1, ...vs);
    return (
      <div className="a21-djbars" data-a21="desk-chart" aria-hidden="true">
        {vs.map((v, i) => <i key={i} style={{ height: `${Math.max(3, (v / max) * 100)}%`, opacity: i === vs.length - 1 ? 1 : undefined }} />)}
      </div>
    );
  }
  if (card.chart.kind === "due") {
    /* v24.1: the past zone (left 22%), today's mark, then a dot per open query across the next eight weeks */
    const { past, dots } = card.chart;
    return (
      <div className="a24-djstrip a24-dstrip" data-a24="desk-strip" aria-hidden="true">
        <span className="a24-pz">
          {past > 0 ? <b className="a24-past" data-a24="desk-past">{past} past</b> : <b className="a24-past none" data-a24="desk-past">none past</b>}
        </span>
        <u data-a24="desk-today" style={{ left: "22%" }}><span>today</span></u>
        {dots.map((d, i) => <i key={i} data-a24="desk-dot" style={{ left: `${d.left.toFixed(2)}%` }} title={d.title} />)}
      </div>
    );
  }
  const p = linePath(card.chart.values);
  const id = `a21-hatch-${card.key}`;
  return (
    <div className="a21-djch" data-a21="desk-chart" aria-hidden="true">
      {p ? (
        <>
          <svg viewBox="0 0 520 40" preserveAspectRatio="none">
            <defs><pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke={card.colour} strokeOpacity=".22" strokeWidth="1.1" /></pattern></defs>
            <path d={`${p.d} L${p.end.x.toFixed(1)},40 L6,40 Z`} fill={`url(#${id})`} />
            <path d={p.d} fill="none" stroke={card.colour} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="a21-djdot" style={{ left: `calc(${((p.end.x / 520) * 100).toFixed(2)}% - 7px)`, top: `${(p.end.y - 7).toFixed(1)}px` }} />
        </>
      ) : null}
    </div>
  );
};

export const A21Desk: React.FC<{ cards: DeskCard[]; onGo: (sec: number) => void }> = ({ cards, onGo }) => (
  <div className="a21-desk" data-a21="desk">
    {cards.map((c) => (
      <article key={c.key} className="a21-dj" data-a21="desk-card" data-key={c.key} role="button" tabIndex={0}
        style={{ "--c": c.colour, "--ct": TINT[c.colour] ?? "#eee" } as React.CSSProperties}
        onClick={() => onGo(c.sec)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onGo(c.sec); } }}>
        <header>
          <h3><span className="a21-djic" aria-hidden="true">{ICON[c.key]}</span>{c.title}</h3>
          {c.stamp ? <span className="a21-djstamp" data-a21="desk-stamp">{c.stamp}</span> : null}
        </header>
        <div className="a21-djb">
          <div className="a21-djn">
            <b data-a21="desk-figure" data-population={c.population ?? undefined} className={/^\d/.test(c.figure) ? undefined : "a21-djw"}>{c.figure}</b>
            {c.unit ? <small data-a21="desk-unit">{c.unit}</small> : null}
          </div>
          <ul>
            {c.rows.map((r, i) => (
              <li key={i} data-a21="desk-row"><span className={`a21-djc${r.tone ? ` ${r.tone}` : ""}`} data-a21="desk-n">{r.n === 0 && r.zero ? r.zero : chipN(r.n)}</span>{r.text}</li>
            ))}
          </ul>
        </div>
        <Chart card={c} />
        {c.axis.length ? <div className="a21-djax">{c.axis.map((a, i) => <span key={i}>{a}</span>)}</div> : null}
      </article>
    ))}
  </div>
);
