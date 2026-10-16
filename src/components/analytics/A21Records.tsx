/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v21 §F — FIRSTS AND RECORDS (design-refs/analytics-v21/analytics-v21.html, `.fs`): a tinted band laid
 * out like the Query Centre's "Recently updated" — the text on the left (kicker, h2, lede, "See the campaign over
 * time"), and on the right a white panel of "Other records" with a FEATURED CARD overhanging its left edge.
 * DESKTOP ONLY: the phone keeps v17's records.
 *
 * ⚠️ THE FEATURED CARD IS THE FIRST OFFER, ELSE THE FIRST FULL REQUEST, ELSE THE FIRST REQUEST, and none at all when
 *    no agent has asked for more. Its stages are the query's own dated stages; every status is a `StatusDot`.
 * ⚠️ "LONGEST FULL READ" IS RETIRED — v17's figure for it disagreed with the offer dates. A row the data cannot
 *    support is omitted, never shown as "Not yet".
 */
import React from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { STATE_FILL, dayMonth, stateBucket } from "../../lib/analyticsModel";
import type { Records, RecordRow } from "../../lib/analyticsV21";
import { openQueryPanel } from "../../lib/queryPanelStore";

const ICON: Record<RecordRow["key"], React.ReactNode> = {
  quickest: <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>,
  "first-request": <StatusDot status={QueryStatus.PARTIAL_REQUESTED} overrideSize={18} />,
  busiest: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 15h14M5 15V9M9 15V5M13 15V8" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>,
  run: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>,
  "quickest-pass": <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3h6M7 17h6M8 3c0 4 4 4 4 7s-4 3-4 7M12 3c0 4-4 4-4 7" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>,
};

export const A21Records: React.FC<{ rec: Records; count: string; title: string; msTitle: string | null; onOverTime: () => void }> = ({ rec, count, title, msTitle, onOverTime }) => {
  const f = rec.featured;
  return (
    <div className={`a21-fs${f ? "" : " a21-fs--nocard"}`} data-a21="records">
      <div className="a21-fst">
        <div className="a21-fsk">{count}</div>
        <h2>{title}</h2>
        <p data-a21="records-lede">{rec.lede.lead}{rec.lede.bold.length ? <><b>{rec.lede.bold[0]}</b>{rec.lede.rest[0]}<b>{rec.lede.bold[1]}</b>{rec.lede.rest[1]}</> : null}</p>
        <button type="button" className="a21-fsbtn" data-a21="records-overtime" onClick={onOverTime}>See the campaign over time</button>
      </div>
      <div className="a21-fsr">
        {f ? (
          <article className="a21-fc" data-a21="featured" data-label={f.label}>
            <div className="a21-fch" style={{ background: STATE_FILL[stateBucket(f.label === "First offer" ? QueryStatus.OFFER : QueryStatus.PARTIAL_REQUESTED)] }}><span>{f.label}</span><span>{dayMonth(f.atMs)}</span></div>
            <div className="a21-fcwho"><span className="a21-fcini" aria-hidden="true">{f.initials}</span><div><b data-a21="featured-name">{f.name}</b>{f.meta ? <small>{f.meta}</small> : null}</div></div>
            <span className="a21-fcst" data-a21="featured-status"><StatusDot status={f.status} overrideSize={15} />{f.statusLabel}</span>
            {msTitle ? <div className="a21-fcq"><small>QUERYING</small><b>{msTitle}</b></div> : null}
            <ol className="a21-fcl" data-a21="featured-stages">
              {f.stages.map((s, i) => <li key={i}><StatusDot status={s.status} overrideSize={15} />{s.label}<em>{dayMonth(s.atMs)}</em></li>)}
            </ol>
            <div className="a21-fcf"><span>{f.open ? "Still open" : "Ended"}</span><button type="button" data-a21="featured-open" onClick={() => openQueryPanel(f.id, "other")}>Open</button></div>
          </article>
        ) : null}
        <div className="a21-fsp" data-a21="records-panel">
          <div className="a21-fph"><h3>Other records</h3><em>update as replies come in</em></div>
          {rec.rows.length ? (
            <ul className="a21-fpl">
              {rec.rows.map((r) => (
                <li key={r.key} data-a21="record" data-key={r.key}>
                  <span className="a21-md" aria-hidden="true">{ICON[r.key]}</span>
                  <div><b>{r.label}</b><i>{r.detail}</i></div>
                  <span className="a21-fpv" data-a21="record-v">{r.value}</span>
                </li>
              ))}
            </ul>
          ) : <p className="a17-none">No records yet: they arrive with the first dated query.</p>}
        </div>
      </div>
    </div>
  );
};
