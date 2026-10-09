/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK, v135 — three badge cards (ref design-refs/query-centre/query-centre-v135.html `.desk.v3`).
 * Each card: the count in a large white disc breaking out of the card's top edge, ringed in the court's
 * colour; a pale court-tint header strip carrying the title and the court's illustration; an inner
 * border; and a body holding v134's breakdown tiles, its ten-week chart and its month-on-month line.
 *
 * ⚠️ THE DATA, THE COPY AND THE BEHAVIOUR ARE v134's, UNCHANGED (baked decision 5): `DeskSection` from
 *    `lib/qcDesk`, the rust "hot" tile, the neutral grey month-on-month arrow, and a click that chooses
 *    for "Recently updated" only (clicking again clears it). The card is a group with a full-cover
 *    button behind its contents.
 * ⚠️ THE BADGE IS THE CARD'S COUNT. Its accessible name is the card's own label (`DeskSection.said`),
 *    as it was when the count sat in a line of words.
 * ⚠️ THE ILLUSTRATION IS A PLACEHOLDER UNTIL THE ART ARRIVES (baked decision 4): a dashed box with a
 *    label. The three slots are in `qcArt.ts`; a non-null slot renders an image in the same box with no
 *    dashed border, so the artist's files drop in with no layout change. Nothing is drawn here.
 * ⚠️ THE CHART IS `aria-hidden`; THE CARD'S LABEL SAYS WHAT IT DRAWS.
 * ⚠️ DESKTOP ONLY. Below 768px the page renders the v126 desk (`QcCourts`).
 *
 * Retired with v134's icon card: the icon disc, the "13 with you" line of words, and the underline bar
 * on the selected card.
 */
import React from "react";
import type { TileCourt } from "../../../lib/qcSummary";
import { trendStartLabel, type DeskSection } from "../../../lib/qcDesk";
import { QC_DESK_ART_AGENTS, QC_DESK_ART_CLOSED, QC_DESK_ART_YOU, type QcArt } from "./qcArt";
import "./qcvPage.css";
import "./qcv131.css";
import "./qcvDesk135.css";

/** the strip's title, per court */
export const DESK_TITLE: Record<TileCourt, string> = { you: "With you", agent: "With agents", closed: "Closed" };
/** what each court's illustration will show — the placeholder's label, exact */
export const DESK_ART_LABEL: Record<TileCourt, string> = { you: "Talon pointing at you", agent: "Thumbing at someone else", closed: "Talons laced, bad news" };
const DESK_ART: Record<TileCourt, QcArt | null> = { you: QC_DESK_ART_YOU, agent: QC_DESK_ART_AGENTS, closed: QC_DESK_ART_CLOSED };

/**
 * A review aid for the art slots: in a build that is not production, `window.__SA_QC_DESK_ART = { you: "/a.png" }`
 * fills a slot, so the swap from placeholder to image can be measured before any art exists (QC135 B9). The MODE test
 * is at this call site and is replaced at build time, so a production bundle carries none of it.
 */
function artFor(key: TileCourt): { src: string } | null {
  if (import.meta.env.MODE !== "production" && typeof window !== "undefined") {
    const o = (window as unknown as { __SA_QC_DESK_ART?: Partial<Record<TileCourt, string>> }).__SA_QC_DESK_ART;
    if (o?.[key]) return { src: o[key]! };
  }
  const a = DESK_ART[key];
  return a ? { src: `${a.src}?v=${a.version}` } : null;
}

/* the reference's chart box, 150 × 62; the sheet draws it at 96 × 46 where the page sheet is compact */
const CW = 150, CH = 62;
const Chart: React.FC<{ s: DeskSection; loading: boolean }> = ({ s, loading }) => {
  const v = s.trend.values.length > 1 ? s.trend.values : [0, 0];
  const max = Math.max(...v), min = Math.min(...v), span = Math.max(1, max - min);
  const pts = v.map((y, i) => [4 + (i * (CW - 8)) / (v.length - 1), CH - 6 - ((y - min) / span) * (CH - 16)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <span className="qc135-ch" data-qcv="court-chart" aria-hidden="true">
      <svg className={loading ? "qc13-sk" : undefined} viewBox={`0 0 ${CW} ${CH}`} data-qcv="court-trend" data-values={loading ? undefined : s.trend.values.join(",")}>
        {!loading && (
          <>
            <path d={`${d} L${last[0].toFixed(1)},${CH} L${pts[0][0].toFixed(1)},${CH} Z`} fill="var(--qc135-cl)" />
            <path data-qcv="trend-line" d={d} fill="none" stroke="var(--qc135-c)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={last[0]} cy={last[1]} r="3.8" fill="var(--qc135-c)" />
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
  <div className="qc131-desk qc135-desk" data-qcv="courts" data-v="135">
    {sections.map((s) => {
      const art = artFor(s.key);
      return (
        <section key={s.key} role="group" aria-label={loading ? `${s.label}: loading` : s.said}
          className={`qc135-card qc135-card--${s.key}${active === s.key ? " is-on" : ""}`}
          data-qcv="court" data-court={s.key} data-loading={loading ? "true" : "false"}>
          <button type="button" className="qc135-hit" data-qcv="court-pick" aria-pressed={active === s.key}
            disabled={loading} aria-label={loading ? `${s.label}: loading` : `${s.said}. Show them in Recently updated`} onClick={() => onCourt(s.key)} />
          <div className="qc135-strip" data-qcv="court-strip">
            {/* ⚠️ WHILE LOADING THE BADGE IS A BLANK DISC: the same box, no number */}
            <span className="qc135-badge" data-qcv="court-badge"><b data-qcv="court-count">{loading ? "" : s.total}</b></span>
            <b className="qc135-title" data-qcv="court-title">{DESK_TITLE[s.key]}</b>
            <span className={`qc135-art${art ? " qc135-art--img" : ""}`} data-qcv="court-art" aria-hidden="true">
              {art
                ? <img src={art.src} alt="" />
                : <span className="qc135-artlb"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>{DESK_ART_LABEL[s.key]}</span>}
            </span>
          </div>
          <div className="qc135-bd" data-qcv="court-body">
            <ul className="qc135-rows">
              {s.lines.map((l, i) => (
                <li key={i} className="qc135-row" data-qcv="court-line" data-hot={l.hot ? "true" : "false"}>
                  <b className={`qc135-tile${l.hot ? " is-hot" : ""}${!loading && l.n === 0 ? " is-zero" : ""}${loading ? " qc13-sk" : ""}`} data-qcv="court-tile">{loading ? "0" : l.n}</b>
                  <span className={`qc135-lb${loading ? " qc13-sk" : ""}`} data-qcv="court-label">{loading ? "00 responses overdue" : l.text}</span>
                </li>
              ))}
            </ul>
            <Chart s={s} loading={loading} />
            <span className={`qc135-mom${loading ? " qc13-sk" : ""}`} data-qcv="court-mom" data-dir={loading ? undefined : s.mom.dir} data-delta={loading ? undefined : s.mom.delta}>
              {!loading && s.mom.dir !== "none" && (
                <svg viewBox="0 0 11 11" aria-hidden="true"><path d={s.mom.dir === "up" ? "M5.5 1 L10.5 10 H0.5 Z" : "M5.5 10 L10.5 1 H0.5 Z"} /></svg>
              )}
              {loading ? "0 since last month" : s.mom.text}
            </span>
          </div>
        </section>
      );
    })}
  </div>
);
