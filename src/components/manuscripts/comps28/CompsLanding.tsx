/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v28 §D · "What's landing" (design-refs/comps-v28/comps-v28.html): a paper-white band to the sheet's
 * edges, two panes — by comp and by letter.
 *
 * ⚠️ EVERY FIGURE IS DERIVED ELSEWHERE: the rows are `landingRows` (lib/compsShelf, from compUsage's queries and
 *    asked), "your average" is `averageAsked` (compUsage: the Analytics request-rate derivation), each letter's rate is
 *    `letterRate` (compUsage). This file only draws them.
 */
import React from "react";
import type { AskedRate } from "../../../lib/compUsage";
import { andList, type LandingRow, type LetterBlock } from "../../../lib/compsShelf";
import { KindIcon, LetterIcon, LockIcon } from "../comps25/marks";

export const LANDING_FOOT = "A comp needs about five queries before its rate means much. Every figure comes from what you log.";

export const CompsLanding: React.FC<{
  sent: number;
  rows: LandingRow[];
  rest: { lead: string; rest: string } | null;
  average: AskedRate;
  letters: LetterBlock[];
  bandRef: React.Ref<HTMLElement>;
  onOpen: (key: string) => void;
  onLog: (letterId: string) => void;
}> = ({ sent, rows, rest, average, letters, bandRef, onOpen, onLog }) => {
  const max = Math.max(1, ...rows.map((r) => r.queries));
  const avg = average.pct ?? 0;
  return (
    <section className="cx-band" data-cx="landing" aria-labelledby="cx-land-h" ref={bandRef}>
      <div className="cx-sec cx-sec--band">
        <div className="cx-sh">
          <h2 className="cx-h2" id="cx-land-h">What’s landing</h2>
          <span className="cx-tag" data-cx="landing-tag">From {sent} sent {sent === 1 ? "query" : "queries"}</span>
        </div>
        <div className="cx-land">
          <div className="cx-pane" data-cx="by-comp">
            <h3 className="cx-pane-h">By comp</h3>
            <p className="cx-pane-sub">How often agents asked to read more when a query named it.</p>
            {rows.length ? (
              <div className="cx-tbl" role="table" aria-label="By comp">
                <div className="cx-tr cx-thd" role="row"><span role="columnheader">Comp</span><span role="columnheader">Queries it went out with</span><span role="columnheader">Asked for more</span></div>
                {rows.map((r) => (
                  <div key={r.key} className="cx-tr" role="row" data-cx="land-row" data-key={r.key} data-queries={r.queries} data-asked={r.asked} data-pct={r.pct}>
                    <button type="button" className="cx-tc" role="cell" data-cx-key={`land:${r.key}`} onClick={() => onOpen(r.key)}>
                      <span className="cx-ti is-k" aria-hidden="true"><KindIcon kind={r.kind} /></span><b>{r.title}</b>
                    </button>
                    <span className="cx-qb" role="cell" title={`${r.asked} of ${r.queries} asked for more`}>
                      <span className="cx-qtr"><i data-cx="land-qbar" style={{ width: `${(r.queries / max) * 100}%` }}><u data-cx="land-abar" style={{ width: `${(r.asked / r.queries) * 100}%` }} /></i></span>
                      <em>{r.queries}</em>
                    </span>
                    <span className="cx-rt" role="cell" title={`${r.asked} of ${r.queries}${r.light ? " · fewer than five queries, so read it lightly" : ""}`}>
                      <span className="cx-tk" data-cx="land-track">
                        <span className="cx-av" data-cx="land-avg" style={{ left: `${avg}%` }} />
                        <span className={`cx-dt${r.light ? " is-light" : ""}`} data-cx="land-dot" data-light={r.light ? "true" : "false"} style={{ left: `${r.pct}%` }} />
                      </span>
                      <b>{r.pct}%</b>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cx-empq" data-cx="land-none">Once a letter that names your comps goes out, each comp’s queries and requests show here.</div>
            )}
            <div className="cx-key" data-cx="land-key">
              <span><i style={{ background: "#b4553f" }} />Asked for more</span>
              <span><i style={{ background: "#e2e7ef", boxShadow: "inset 0 0 0 1px rgba(47,69,102,.25)" }} />No request yet</span>
              <span><i className="cx-key-av" /><span data-cx="land-avg-label">Your average, {avg}% of all queries</span></span>
            </div>
            {rest ? <p className="cx-rest" data-cx="land-rest"><b>{rest.lead}</b>{rest.rest}</p> : null}
          </div>

          <div className="cx-pane" data-cx="by-letter">
            <h3 className="cx-pane-h">By letter</h3>
            <p className="cx-pane-sub">Each letter’s comps, and how its queries did.</p>
            {letters.map((l) => (
              <div key={l.id} className="cx-lt" data-cx="land-letter" data-letter={l.id} data-group={l.group}>
                <div className="cx-lt-h">
                  <LetterIcon /><b>{l.name}</b>
                  {l.current ? <span className="cx-inuse" data-cx="in-use">In use</span> : null}
                  <span className="cx-st">{l.sent ? <><LockIcon />Sent · {l.sent}</> : "Not sent yet"}</span>
                </div>
                {!l.recorded ? (
                  <p className="cx-cs is-miss" data-cx="land-unrecorded">Comps not recorded. <button type="button" className="cx-lnk" data-cx="land-log" data-cx-key={`landlog:${l.id}`} onClick={() => onLog(l.id)}>Log them</button></p>
                ) : l.comps.length ? (
                  <p className="cx-cs">{andList(l.comps)}</p>
                ) : <p className="cx-cs">Names no comps</p>}
                {l.sent ? (
                  <div className="cx-nums" data-cx="land-letter-rate" data-pct={l.rate.pct ?? 0}>
                    <span className="cx-bar" aria-hidden="true"><i style={{ width: `${l.rate.pct ?? 0}%` }} /></span>
                    <span><b>{l.rate.pct ?? 0}%</b> asked for more</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <p className="cx-foot" data-cx="land-foot">{LANDING_FOOT}</p>
      </div>
    </section>
  );
};
