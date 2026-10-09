/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK, v134 — three icon cards (ref design-refs/query-centre/query-centre-v134.html `.desk`; the
 * Contact list v15.2 desk card's shell, built beside it). Each card: a disc in the court's colour breaking
 * out of its top-left corner, the figure and its words on one line, v131.1's two tiled lines, the change
 * since the end of last month, and a small line chart of the ten-week running count.
 *
 * ⚠️ THE COURT COLOURS, NOT INK (baked decision 2): the disc, the chart's line, fill and end dot.
 * ⚠️ THE MONTH-ON-MONTH ARROW IS NEUTRAL GREY (baked decision 3): on this page more or fewer is neither
 *    good nor bad, so it takes no green and no rust.
 * ⚠️ CLICKING A CARD CHOOSES FOR "RECENTLY UPDATED" ONLY, never the list, and clicking it again clears
 *    it. The card is a group with a full-cover button behind its contents.
 * ⚠️ THE CHART IS `aria-hidden`; THE CARD'S ACCESSIBLE LABEL SAYS WHAT IT DRAWS (`DeskSection.said`).
 * ⚠️ THREE SEPARATE CARDS, NEVER ONE FRAME. The grid has no surface of its own.
 * ⚠️ DESKTOP ONLY. Below 768px the page renders the v126 desk (`QcCourts`).
 *
 * Retired from this page with v131.1's ledger card: the court-coloured title row, the rubber stamp, and
 * the 52px pen-filtered trend with its hover tooltip. `ContactDesk` / `shell/desk/DeskCard` is the same
 * shell in ink with other charts — a lift candidate.
 */
import React from "react";
import type { TileCourt } from "../../../lib/qcSummary";
import { COURT_WORDS, trendStartLabel, type DeskSection } from "../../../lib/qcDesk";
import "./qcvPage.css";
import "./qcv131.css";

/* cream line icons on a 64-unit grid, 3px stroke, round caps and joins — the reference's own paths */
const ICON_PROPS = { viewBox: "0 0 64 64", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ICON: Record<TileCourt, React.ReactNode> = {
  /* an open envelope with a letter */
  you: <svg {...ICON_PROPS}><path d="M12 26 L32 12 L52 26 V50 H12 Z" /><path d="M12 26 L32 40 L52 26" /><path d="M22 20 V30 M42 20 V30 M22 20 H42" /></svg>,
  /* a paper plane */
  agent: <svg {...ICON_PROPS}><path d="M10 30 L54 12 L44 52 L31 38 Z" /><path d="M54 12 L31 38 V50 L38 42" /></svg>,
  /* an archive box */
  closed: <svg {...ICON_PROPS}><rect x="10" y="14" width="44" height="11" rx="3" /><path d="M14 25 V50 H50 V25" /><path d="M26 34 H38" /></svg>,
};

/** The chart's box, in its own units: 112 × 38, inset 3 at each side, 6 from the top, 4 from the foot. */
const CW = 112, CH = 38;
const Chart: React.FC<{ s: DeskSection; loading: boolean }> = ({ s, loading }) => {
  const v = s.trend.values.length > 1 ? s.trend.values : [0, 0];
  const max = Math.max(...v), min = Math.min(...v), span = Math.max(1, max - min);
  const pts = v.map((y, i) => [3 + (i * (CW - 6)) / (v.length - 1), CH - 4 - ((y - min) / span) * (CH - 10)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <span className="qc134-ch" data-qcv="court-chart" aria-hidden="true">
      <svg className={loading ? "qc13-sk" : undefined} viewBox={`0 0 ${CW} ${CH}`} data-qcv="court-trend" data-values={loading ? undefined : s.trend.values.join(",")}>
        {!loading && (
          <>
            <path d={`${d} L${last[0].toFixed(1)},${CH} L${pts[0][0].toFixed(1)},${CH} Z`} fill="var(--c131-c)" fillOpacity=".07" />
            <path data-qcv="trend-line" d={d} fill="none" stroke="var(--c131-c)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={last[0]} cy={last[1]} r="3.2" fill="var(--c131-c)" />
          </>
        )}
      </svg>
      <small className={loading ? "qc13-sk" : undefined} data-qcv="trend-cap">{loading ? "Aug → now" : `${trendStartLabel(s.trend.weeks[0])} → now`}</small>
    </span>
  );
};

export const QcDesk: React.FC<{
  sections: readonly DeskSection[];
  active?: TileCourt | null;
  onCourt: (key: TileCourt) => void;
  loading?: boolean;
}> = ({ sections, active = null, onCourt, loading = false }) => (
  <div className="qc131-desk" data-qcv="courts" data-v="134">
    {sections.map((s) => (
      <section key={s.key} role="group" aria-label={loading ? `${s.label}: loading` : s.said}
        className={`qc131-card qc131-card--${s.key}${active === s.key ? " is-on" : ""}`}
        data-qcv="court" data-court={s.key} data-loading={loading ? "true" : "false"}>
        <button type="button" className="qc131-hit-all" data-qcv="court-pick" aria-pressed={active === s.key}
          disabled={loading} aria-label={loading ? `${s.label}: loading` : `${s.said}. Show them in Recently updated`} onClick={() => onCourt(s.key)} />
        <span className="qc134-disc" data-qcv="court-disc" aria-hidden="true">{ICON[s.key]}</span>
        {/* ⚠️ WHILE LOADING NOTHING STATES A NUMBER: the same boxes, painted over (`qc13-sk`) */}
        <p className={`qc134-line${loading ? " qc13-sk" : ""}`} data-qcv="court-words">
          <b data-qcv="court-count">{loading ? "00" : s.total}</b>{COURT_WORDS[s.key]}
        </p>
        <ul className="qc131-lines">
          {s.lines.map((l, i) => (
            <li key={i} className="qc131-line" data-qcv="court-line" data-hot={l.hot ? "true" : "false"}>
              <b className={`qc131-tile${l.hot ? " is-hot" : ""}${!loading && l.n === 0 ? " is-zero" : ""}${loading ? " qc13-sk" : ""}`} data-qcv="court-tile">{loading ? "0" : l.n}</b>
              <span className={`qc131-lb${loading ? " qc13-sk" : ""}`} data-qcv="court-label">{loading ? "00 responses overdue" : l.text}</span>
            </li>
          ))}
        </ul>
        <div className="qc134-foot">
          <span className={`qc134-mom${loading ? " qc13-sk" : ""}`} data-qcv="court-mom" data-dir={loading ? undefined : s.mom.dir} data-delta={loading ? undefined : s.mom.delta}>
            {!loading && s.mom.dir !== "none" && (
              <svg viewBox="0 0 11 11" aria-hidden="true"><path d={s.mom.dir === "up" ? "M5.5 1 L10.5 10 H0.5 Z" : "M5.5 10 L10.5 1 H0.5 Z"} /></svg>
            )}
            {loading ? "0 since last month" : s.mom.text}
          </span>
          <Chart s={s} loading={loading} />
        </div>
      </section>
    ))}
  </div>
);
