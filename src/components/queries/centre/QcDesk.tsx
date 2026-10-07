/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK, v131.1 — three ledger cards (ref design-refs/desk-ledger-v6.html, `body[data-sub=tile]`).
 * Each card: the court's name and a rubber stamp, the big number beside two tiled lines, and a ten-week
 * trend of the running count drawn as an inked line over hatching.
 *
 * ⚠️ CLICKING A CARD CHOOSES FOR THE CAROUSEL ONLY, never the list (v126, as ruled), and clicking it again
 * clears it. The card is a group with a full-cover button behind its contents; the trend's hover
 * targets sit above that button so a week can be hovered, and a press on one does not select the card.
 *
 * ⚠️ THREE SEPARATE CARDS, NEVER ONE FRAME. The grid has no surface of its own.
 *
 * ⚠️ DESKTOP ONLY. Below 768px the page renders the v126 desk (`QcCourts`) — mobile is untouched.
 */
import React, { useId, useState } from "react";
import type { TileCourt } from "../../../lib/qcSummary";
import { trendLabel, trendStartLabel, trendTip, type DeskSection } from "../../../lib/qcDesk";
import "./qcvPage.css";
import "./qcv131.css";

/** The trend's box, in the reference's own units: a 340×52 viewBox stretched to the card. */
const TW = 340, TH = 52;
/** Points across the box, inset 4 at each end; heights to the series' own maximum. */
function trendPoints(values: readonly number[]): [number, number][] {
  const max = Math.max(1, ...values);
  const n = values.length;
  return values.map((v, i) => [4 + (i * (TW - 8)) / (n - 1), TH - 5 - (v / max) * (TH - 14)]);
}
/** Catmull-Rom through the points, written as cubic Béziers (the reference's own). */
function smooth(p: readonly [number, number][]): string {
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const Trend: React.FC<{ s: DeskSection; loading: boolean }> = ({ s, loading }) => {
  const uid = useId().replace(/:/g, "");
  const [hov, setHov] = useState<number | null>(null);
  const v = s.trend.values;
  const P = trendPoints(v);
  const line = smooth(P);
  const last = P[P.length - 1];
  const label = loading ? `${s.label}: loading` : trendLabel(s.label, s.trend.weeks[0], v[0], v[v.length - 1]);
  return (
    <div className={`qc131-chart${loading ? " qcv-skw" : ""}`} data-qcv="court-chart">
      <div className="qc131-plot">
        <svg viewBox={`0 0 ${TW} ${TH}`} preserveAspectRatio="none" role="img" aria-label={label} data-qcv="court-trend">
          <defs>
            <filter id={`pen-${uid}`} x="-5%" y="-20%" width="110%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves={2} seed={3} />
              <feDisplacementMap in="SourceGraphic" scale="1.3" />
            </filter>
            <pattern id={`hatch-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--c131-line)" strokeWidth="1.1" opacity=".55" />
            </pattern>
          </defs>
          {!loading && (
            <>
              <path d={`${line} L${last[0]} ${TH} L${P[0][0]} ${TH}Z`} fill={`url(#hatch-${uid})`} filter={`url(#pen-${uid})`} />
              <path d={line} fill="none" stroke="var(--c131-c)" strokeWidth="2.2" strokeLinecap="round" filter={`url(#pen-${uid})`} />
              <circle cx={last[0]} cy={last[1]} r="4" fill="var(--c131-c)" />
              <circle cx={last[0]} cy={last[1]} r="7" fill="none" stroke="var(--c131-c)" strokeWidth="1" opacity=".5" />
              {P.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="0" data-qcv="trend-pt" data-i={i} data-v={v[i]} />
              ))}
            </>
          )}
        </svg>
        {/* one hover target per week, a column of the plot, above the card's full-cover button */}
        {!loading && (
          <div className="qc131-hits" aria-hidden="true">
            {P.map(([x, y], i) => (
              <span key={i} className="qc131-hit" data-qcv="trend-hit" data-i={i}
                style={{ left: `${(x / TW) * 100}%`, ["--y" as string]: `${(y / TH) * 100}%` }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onClick={(e) => e.stopPropagation()}>
                {hov === i && <span className="qc13-tip" role="tooltip" data-qcv="trend-tip">{trendTip(s.key, s.trend.weeks[i], v[i])}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="qc131-ax" data-qcv="trend-ax" aria-hidden="true">
        <span>{loading ? " " : trendStartLabel(s.trend.weeks[0])}</span><span>Now</span>
      </div>
    </div>
  );
};

export const QcDesk: React.FC<{
  sections: readonly DeskSection[];
  active?: TileCourt | null;
  onCourt: (key: TileCourt) => void;
  loading?: boolean;
}> = ({ sections, active = null, onCourt, loading = false }) => (
  <div className="qc131-desk" data-qcv="courts" data-v="131.1">
    {sections.map((s) => {
      const label = `${s.label}: ${s.total} ${s.total === 1 ? "query" : "queries"}. ${s.lines.map((l) => `${l.n} ${l.text}`).join(", ")}. ${s.stamp.text}.`;
      return (
        <section key={s.key} role="group" aria-label={s.label}
          className={`qc131-card qc131-card--${s.key}${active === s.key ? " is-on" : ""}`}
          data-qcv="court" data-court={s.key} data-loading={loading ? "true" : "false"}>
          <button type="button" className="qc131-hit-all" data-qcv="court-pick" aria-pressed={active === s.key}
            disabled={loading} aria-label={loading ? `${s.label}: loading` : label} onClick={() => onCourt(s.key)} />
          <div className="qc131-hd">
            <span className="qc131-name" data-qcv="court-name">{s.label}</span>
            {/* ⚠️ WHILE LOADING NOTHING STATES A NUMBER: the same boxes, painted over (`qc13-sk`) */}
            <span className={`qc131-stamp${loading ? " qc13-sk" : ""}`} data-qcv="court-stamp" data-ago={loading ? undefined : s.stamp.ago}>
              {loading ? "No change this month" : s.stamp.text}
            </span>
          </div>
          <div className="qc131-body">
            <i className={`qc131-n${loading ? " qc13-sk" : ""}`} data-qcv="court-count">{loading ? "00" : s.total}</i>
            <ul className="qc131-lines">
              {s.lines.map((l, i) => (
                <li key={i} className="qc131-line" data-qcv="court-line" data-hot={l.hot ? "true" : "false"}>
                  <b className={`qc131-tile${l.hot ? " is-hot" : ""}${!loading && l.n === 0 ? " is-zero" : ""}${loading ? " qc13-sk" : ""}`} data-qcv="court-tile">{loading ? "0" : l.n}</b>
                  <span className={`qc131-lb${loading ? " qc13-sk" : ""}`} data-qcv="court-label">{loading ? "00 responses overdue" : l.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <Trend s={s} loading={loading} />
        </section>
      );
    })}
  </div>
);
