/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcSummary — the summary row (Query Centre v11): what is live, stage by stage, and what has closed.
 *
 * ⚠️ THE ROW'S HEIGHT DOES NOT DEPEND ON HOW MANY QUERIES THERE ARE. Each stage column shows at most
 * four gauges in a fixed 27px area and says "+8 earlier in the window" for the rest; the closed card
 * is a grid of numbers. Nothing here grows with the account.
 *
 * ⚠️ A GAUGE IS AN HTML BOX, NEVER AN SVG. An svg with a viewBox left in the flow sets its card's
 * height; these are three-pixel divs with percentage widths from `lib/qcSummary.gaugeFor`.
 *
 * ⚠️ NO BUTTON INSIDE A BUTTON. A column is a filter AND holds gauges that select a query, so the
 * column is a `div`: its header is the button, stretched over the whole column by an `::after`, and
 * each gauge is a button of its own lifted above that. A status is drawn by `StatusDot` only.
 */
import React from "react";
import { QueryStatus } from "../../../types";
import { StatusDot } from "../../StatusDot";
import { FramedCard } from "../../containers/FramedCard";
import { stageFilter, type ClosedGrid, type QcFilter, type StageColumn } from "../../../lib/qcSummary";
import "./qcvPage.css";
import "./qcvSummary.css";

const SK_NAME = [62, 84, 70, 84, 60, 50];

export const QcSummary: React.FC<{
  loading: boolean;
  liveCount: number;
  withYouCount: number;
  columns: readonly StageColumn[];
  closed: ClosedGrid;
  filter: QcFilter;
  /** Toggles: pressing the current filter again clears it. */
  onFilter: (f: QcFilter) => void;
  onOpen: (id: string) => void;
  selectedId: string | null;
}> = ({ loading, liveCount, withYouCount, columns, closed, filter, onFilter, onOpen, selectedId }) => {
  const toggle = (f: QcFilter) => onFilter(filter === f ? "all" : f);
  return (
    <section className={`qcv-sum${columns.length > 6 ? " qcv-sum--seven" : ""}`} data-qcv="sum" aria-label="Summary">
      <FramedCard as="article" tone="navy" probe="sum-live" className="qcv-sum-live" bandClassName="qcv-sum-band" label="Live queries"
        band={<>
          <h3 className="qcv-sum-ttl">{loading ? <span className="qcv-sk qcv-sk--on" style={{ width: 150, height: 20 }} /> : `${liveCount} live ${liveCount === 1 ? "query" : "queries"}`}</h3>
          {!loading && (
            <button type="button" className="qcv-mini" data-qcv="with-you-chip" aria-pressed={filter === "you"} onClick={() => toggle("you")}>{withYouCount} with you</button>
          )}
        </>}>
        <div className="qcv-sbody">
          {loading ? (
            <div className="qcv-stages qcv-skw" aria-hidden="true">
              {SK_NAME.map((w, i) => (
                <div key={i} className="qcv-stg">
                  <div className="qcv-stg-top"><span className="qcv-sk qcv-sk--r" style={{ width: 15, height: 15 }} /><span className="qcv-sk" style={{ width: `${w}%`, height: 12 }} /></div>
                  <div className="qcv-stg-u">{[100, 72, 86].map((g) => <span key={g} className="qcv-sk qcv-sk--ga" style={{ width: `${g}%`, height: 3 }} />)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="qcv-stages">
              {columns.map((c, ci) => (
                <div key={c.status} className={`qcv-stg${c.count ? "" : " qcv-stg--zero"}`} data-qcv="stage" data-stage={c.status} data-count={c.count}
                  data-pressed={filter === stageFilter(c.status) ? "true" : undefined}>
                  <button type="button" className="qcv-stg-top" aria-pressed={filter === stageFilter(c.status)} onClick={() => toggle(stageFilter(c.status))}
                    aria-label={`${c.name}: ${c.count}. Show only these.`}>
                    <StatusDot status={c.status} overrideSize={15} decorative />
                    <b className="qcv-stg-l">{c.name}</b>
                    <b className="qcv-stg-n">{c.count}</b>
                  </button>
                  <div className="qcv-stg-u" data-qcv="stage-graphic">
                    {c.gauges.map((g) => (
                      <button key={g.id} type="button" className={`qcv-ga qcv-ga--${g.kind}`} data-qcv="gauge" data-kind={g.kind} title={g.title} aria-label={g.title}
                        aria-pressed={g.id === selectedId} onClick={() => onOpen(g.id)}>
                        {g.kind !== "nodate" && <i className="qcv-ga-fill" data-qcv="gauge-fill" style={{ width: `${g.fillPc.toFixed(2)}%` }} />}
                        {g.overPc > 0 && <i className="qcv-ga-over" data-qcv="gauge-over" style={{ width: `${g.overPc.toFixed(2)}%` }} />}
                      </button>
                    ))}
                    {c.gauges.length > 0 && <s className="qcv-notch" data-qcv="notch" aria-hidden="true" />}
                    {/* ⚠️ THE LONG FORM IS WIDER THAN ITS COLUMN AT EVERY WINDOW UP TO ~1640 (124px of ink
                        against a 98px column at 1440). The mockup gets away with it because ONE column
                        carries the line and it runs on into an empty neighbour; on an account where
                        several columns are over four, the lines ran into each other (measured with 56
                        live). So the words " in the window" are drawn only where the column to the
                        right has no line of its own to collide with — never on the last column, which
                        has nowhere to run on into. The `title` always carries the whole sentence. */}
                    {c.more > 0 && (
                      <em className={`qcv-ga-more${ci < columns.length - 1 && columns[ci + 1].more === 0 ? " qcv-ga-more--long" : ""}`}
                        data-qcv="gauge-more" title={`+${c.more} earlier in the window`}>
                        +{c.more} earlier<i className="qcv-ga-more-w"> in the window</i>
                      </em>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="qcv-keyline">{loading ? " " : "The four furthest through their window. The notch is the expected date; ink is past it."}</p>
        </div>
      </FramedCard>

      <FramedCard as="article" tone="stone" probe="sum-closed" className="qcv-sum-closed" bandClassName="qcv-sum-band qcv-sum-band--closed" label="Closed queries"
        band={<>
          <h3 className="qcv-sum-ttl qcv-sum-ttl--closed">{loading ? <span className="qcv-sk" style={{ width: 140, height: 18 }} /> : `${closed.total} closed ${closed.total === 1 ? "query" : "queries"}`}</h3>
          {!loading && <button type="button" className="qcv-mini qcv-mini--stone" data-qcv="see-them" aria-pressed={filter === "closed"} onClick={() => toggle("closed")}>See them</button>}
        </>}>
        <div className="qcv-sbody qcv-sbody--closed">
          <div className={`qcv-mx${loading ? " qcv-skw" : ""}${!loading && closed.withdrawn > 0 ? " qcv-mx--wd" : ""}`} data-qcv="closed-grid">
            <span /><em>{loading ? " " : "Passed"}</em><em>{loading ? " " : "No reply"}</em>
            {loading ? [96, 112, 92].map((w) => (
              <React.Fragment key={w}>
                <span className="qcv-mx-rl"><span className="qcv-sk qcv-sk--r" style={{ width: 14, height: 14 }} /><span className="qcv-sk" style={{ width: w, height: 12 }} /></span>
                <span className="qcv-sk qcv-sk--c" style={{ width: 14, height: 14 }} /><span className="qcv-sk qcv-sk--c" style={{ width: 14, height: 14 }} />
              </React.Fragment>
            )) : closed.rows.map((r) => (
              <React.Fragment key={r.key}>
                <span className="qcv-mx-rl" title={r.title}><StatusDot status={r.status as QueryStatus} overrideSize={14} decorative />{r.label}</span>
                <b className={`qcv-mx-n${r.passed ? "" : " qcv-mx-n--z"}`}>{r.passed}</b>
                <b className={`qcv-mx-n${r.noReply ? "" : " qcv-mx-n--z"}`}>{r.noReply}</b>
              </React.Fragment>
            ))}
          </div>
          {!loading && closed.withdrawn > 0 && <p className="qcv-mx-wd" data-qcv="withdrawn-line">+{closed.withdrawn} withdrawn, not counted here</p>}
        </div>
      </FramedCard>
    </section>
  );
};
