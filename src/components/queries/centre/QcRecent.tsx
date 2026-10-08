/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "RECENTLY UPDATED" (Query Centre v132 §1; ref design-refs/query-centre/query-centre-v132.html, `#ruA`)
 * — words on the left third, then a featured query card lying over an "Also moved" list.
 *
 * ⚠️ THE DESK SCOPES THIS SECTION AND NOTHING ELSE. Choosing a desk card re-scopes the set (the
 * heading, the sentence, the card and the rows follow it); the list below is never touched, and the
 * button's number is the LIST's total, because the desk never filters the list (v131.1 D7).
 *
 * ⚠️ THE CARD IS THE APP'S LANDING-PAGE QUERY CARD — the one the carousel deals (`QueryCard` over
 * `fanCardModel`), in the carousel's own dress (`qcvCarousel.css`). There is no second card.
 *
 * ⚠️ NO PANEL AROUND THE SECTION. The lede sits on the page; the card overlaps the panel by 150px.
 */
import React, { useEffect, useState } from "react";
import { QueryCard, type QueryCardModel } from "../../dashboard/QueryCard";
import { tileCourt, type QcRow, type TileCourt } from "../../../lib/qcSummary";
import { ALSO_MOVED, moveDate, moveLine, movedAt, recentRows, recentSentence, sayRuns } from "../../../lib/qcRecent";
import "./qcvPage.css";
import "./qcvCarousel.css";
import "./qcvRecent.css";

export const QcRecent: React.FC<{
  /** every query on the page (the manuscript-scoped set) */
  rows: readonly QcRow[];
  /** the desk's chosen court, or null */
  court: TileCourt | null;
  /** "Recently updated", or the chosen card's name */
  title: string;
  /** the LIST's total — never the court's */
  listTotal: number;
  nowMs: number;
  model: (row: QcRow) => QueryCardModel;
  /** "See all" and "and N more": to the list, setting no filter */
  onSeeAll: () => void;
  loading?: boolean;
}> = ({ rows, court, title, listTotal, nowMs, model, onSeeAll, loading = false }) => {
  const set = recentRows(rows, court);
  const [featId, setFeatId] = useState<string | null>(null);
  /* the featured card starts as the set's newest, and goes back to it whenever the set changes */
  const setKey = `${court ?? "all"}|${set.length}`;
  useEffect(() => { setFeatId(null); }, [setKey]);
  const feat = set.find((r) => r.id === featId) ?? set[0] ?? null;
  const shown = set.slice(0, ALSO_MOVED);
  const more = Math.max(0, set.length - ALSO_MOVED);
  const say = sayRuns(recentSentence(set, nowMs));

  if (loading) {
    return (
      <section className="qcr" data-qcv="ru" data-sk="true" aria-hidden="true">
        <div className="qcr-lede" data-qcv="ru-lede">
          <h2 className="qcr-title"><span className="qcv-sk qcr-sk-title" /></h2>
          <p className="qcr-say"><span className="qcv-sk qcr-sk-line" /><span className="qcv-sk qcr-sk-line" /><span className="qcv-sk qcr-sk-line qcr-sk-short" /></p>
          <span className="qcv-sk qcr-sk-btn" />
        </div>
        <div className="qcr-stage" data-qcv="ru-stage">
          <div className="qcr-panel" data-qcv="ru-panel">
            <header className="qcr-ph"><b>Also moved</b><span>newest first</span></header>
            <ol className="qcr-rows">
              {Array.from({ length: ALSO_MOVED }, (_, i) => <li key={i} className="qcr-row qcr-row--sk"><span className="qcv-sk qcr-sk-disc" /><span className="qcv-sk qcr-sk-name" /></li>)}
            </ol>
            <span className="qcr-more" style={{ visibility: "hidden" }}>and 0 more</span>
          </div>
          <div className="qcr-feat" data-qcv="ru-feat"><span className="qcv-sk qcr-sk-card" /></div>
        </div>
      </section>
    );
  }

  return (
    <section className="qcr" data-qcv="ru" data-court={court ?? "all"} aria-label={title}>
      <div className="qcr-lede" data-qcv="ru-lede">
        <h2 className="qcr-title" data-qcv="ru-title">{title}</h2>
        <p className="qcr-say" data-qcv="ru-say">
          {say.map((r, i) => (r.bold ? <b key={i}>{r.text}</b> : <React.Fragment key={i}>{r.text}</React.Fragment>))}
        </p>
        <button type="button" className="qcr-all" data-qcv="ru-all" onClick={onSeeAll}>See all {listTotal} in the list</button>
      </div>
      <div className="qcr-stage" data-qcv="ru-stage">
        <div className="qcr-panel" data-qcv="ru-panel">
          <header className="qcr-ph"><b>Also moved</b><span>newest first</span></header>
          <ol className="qcr-rows" aria-label="Also moved, newest first">
            {shown.map((r) => {
              const t = movedAt(r);
              const on = feat?.id === r.id;
              return (
                <li key={r.id}>
                  <button type="button" className={`qcr-row qcr-row--${tileCourt(r.status) ?? "closed"}${on ? " on" : ""}`}
                    data-qcv="ru-row" data-qid={r.id} data-court={tileCourt(r.status) ?? "none"} data-moved={t ?? undefined} data-on={on || undefined} aria-pressed={on}
                    onClick={() => setFeatId(r.id)}>
                    <span className="qcr-disc" aria-hidden="true">{r.initials}</span>
                    <span className="qcr-who"><b>{r.agentName}</b><small>{moveLine(r.status)}</small></span>
                    <em className="qcr-date">{t != null ? moveDate(t) : ""}</em>
                  </button>
                </li>
              );
            })}
          </ol>
          {/* ⚠️ ALWAYS LAID OUT, hidden at none, so the panel is one height whatever the count — the
              loading frame draws the same line (W10) */}
          <button type="button" className="qcr-more" data-qcv="ru-more" onClick={onSeeAll}
            style={more > 0 ? undefined : { visibility: "hidden" }} aria-hidden={more > 0 ? undefined : true} tabIndex={more > 0 ? undefined : -1}>
            and {more} more
          </button>
        </div>
        {feat && (
          <div className="qcr-feat" data-qcv="ru-feat" data-qid={feat.id}>
            {/* keyed by the query, so a change replays the 250ms rise-and-fade */}
            <div key={feat.id} className="qcr-featin">
              <QueryCard model={model(feat)} actionProps={{ "data-qcv": "ru-act" }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
