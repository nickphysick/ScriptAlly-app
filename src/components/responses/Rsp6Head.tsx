/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v6 Phases 2–3 (design-refs/responses-v6/responses-v6.html `header`, `glance` at GV R1) — THE NAVY HEADER CARD
 * and THE TWO STAT CARDS.
 *
 * ⚠️ THE HEADER IS A PAGE-LOCAL COPY of the Query Centre v151.2 banner (`QcHeader151`, `.qc151 .qc1512-ban` in
 *    qcv151.css): that component is exported but bound to its page's words and its own `.qc151` token scope. Same values,
 *    restated under `rsp6-hn`. A LIFT CANDIDATE.
 * ⚠️ THE TALLY LINE IS ONE MARK PER QUERY QUERIED (`tallyMarks`) and the ONE response-rate figure on the page
 *    (`responseRate`: replies over queried, D3).
 * ⚠️ THE STAT CARDS ARE REPLIES ONLY (Asked for more, Passed): no No reply card, no Still waiting card, no corner facts.
 *    Their rows are `requestBreakdown` / `passBreakdown`, which leave a row at zero out. The cards are the Dashboard v2
 *    `Frame` construction (white rim, hairline frame, tinted band), restated here: `Frame` is scoped to `.d58.d2`.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import {
  noRequestsState, passBreakdown, requestBreakdown, responseRate, tallyMarks, type BreakRow, type PageCounts, type RespItem,
} from "../../lib/responses";

export const Rsp6Header: React.FC<{
  msTitle: string | null;
  counts: PageCounts | null;
  /** nothing answered yet: the empty page's subline, buttons and all-faint tally */
  empty: boolean;
  loading: boolean;
  onRecord: () => void;
  /** populated: to the wall · empty: open the Query Centre */
  onSecond: () => void;
}> = ({ msTitle, counts: c, empty, loading, onRecord, onSecond }) => {
  const book = msTitle || "Your book";
  const rate = c ? responseRate(c) : null;
  const marks = c ? tallyMarks(empty ? { more: 0, passed: 0, sent: c.sent } : c) : [];
  return (
    <section className="rsp6-hn" data-rsp6="header" data-own-header="" aria-labelledby="rsp6T">
      <div className="rsp6-hn-tx">
        <h1 id="rsp6T" data-page-title="true">Responses</h1>
        <p className="rsp6-hsub" data-rsp6="sub">{book} · <b>{c ? c.sent : "–"}</b> queried</p>
        {c && c.sent ? (
          <p className="rsp6-hrate" data-rsp6="tally-line">
            <span className="rsp6-md" aria-hidden="true" data-rsp6="tally">
              {marks.map((m, i) => <i key={i} className={m === "more" ? "m" : m === "passed" ? "p" : undefined} data-mark={m} />)}
            </span>
            {empty
              ? <><b>Nothing back yet</b><span>· {c.waiting} out with agents</span></>
              : <><b data-rsp6="rate">{rate}%</b> response rate <span>· {c.replies} of {c.sent} replied</span></>}
          </p>
        ) : null}
      </div>
      <div className="rsp6-cta">
        <button type="button" className="rsp6-hb rsp6-hb--o" data-rsp6={empty ? "to-qc" : "to-wall"} disabled={loading} onClick={onSecond}>
          {empty ? "Open the Query Centre" : "Share your wall of no"}
        </button>
        <button type="button" className="rsp6-hb rsp6-hb--w" data-rsp6="record" disabled={loading} onClick={onRecord}>+ Record a response</button>
      </div>
    </section>
  );
};

const Rows: React.FC<{ rows: BreakRow[]; cap: string }> = ({ rows, cap }) => (
  <ul data-rsp6="stat-rows">
    {rows.map((r) => (
      <li key={r.key} data-rsp6="stat-row" data-k={r.key} data-n={r.n}>
        <span className="rsp6-gi" style={{ background: cap }} aria-hidden="true"><StatusDot status={r.glyph} overrideSize={14} decorative /></span>
        <span className="rsp6-sl">{r.label}</span><b>{r.n}</b>
      </li>
    ))}
  </ul>
);

export const Rsp6Stats: React.FC<{
  items: readonly RespItem[];
  counts: PageCounts;
  onMore: () => void;
  onPassed: () => void;
  onWall: () => void;
}> = ({ items, counts: c, onMore, onPassed, onWall }) => {
  if (!c.replies) return null;
  const req = requestBreakdown(items), pas = passBreakdown(items);
  const none = noRequestsState(c);
  const card = (k: "more" | "passed", title: string, n: number, rows: BreakRow[], band: string, cap: string, onClick: () => void) => (
    <button type="button" className="rsp6-sc" data-rsp6="stat" data-k={k} data-n={n} onClick={onClick}
      aria-label={`${title}: ${n}. ${k === "more" ? "Go to the requests" : "Go to your wall of no, passes only"}`}>
      <span className="rsp6-gin">
        <span className="rsp6-sch" style={{ background: band }}><span>{title}</span></span>
        <span className="rsp6-scb"><b className="rsp6-scn" data-rsp6="stat-n">{n}</b><Rows rows={rows} cap={cap} /></span>
      </span>
    </button>
  );
  return (
    <div className="rsp6-stats" data-rsp6="stats">
      {none ? (
        <div className="rsp6-sc rsp6-sc--none" data-rsp6="stat" data-k="more" data-n={0} data-none={none}>
          <span className="rsp6-gin">
            <span className="rsp6-sch" style={{ background: "#f5e6df" }}><span>Asked for more</span><b className="rsp6-r0n" data-rsp6="stat-n">0</b></span>
            <span className="rsp6-r0b">
              <span className="rsp6-r0i" aria-hidden="true"><StatusDot status={none === "early" ? QueryStatus.QUERIED : QueryStatus.PARTIAL_REQUESTED} overrideSize={22} decorative /></span>
              <span className="rsp6-r0t" data-rsp6="none-copy">
                {none === "early" ? (
                  <>
                    <h4>It&rsquo;s early days</h4>
                    <p>Only {c.replies} of the {c.sent} agents you&rsquo;ve queried {c.replies === 1 ? "has" : "have"} replied so far, and {c.waiting} are still to come back to you. A few noes before the first request is a normal part of querying.</p>
                  </>
                ) : (
                  <>
                    <h4>No requests from {c.replies} replies</h4>
                    <p>That&rsquo;s worth a pause before you send your next batch. Writers in this spot often take a fresh look at their query letter and opening pages, and check that each agent is actively looking for their genre.</p>
                    <button type="button" className="rsp6-r0l" data-rsp6="to-passes" onClick={onWall}>See what the passes said {"→"}</button>
                  </>
                )}
              </span>
            </span>
          </span>
        </div>
      ) : card("more", "Asked for more", c.more, req, "#f5e6df", "#f8e3db", onMore)}
      {card("passed", "Passed", c.passed, pas, "#f1efec", "#efece8", onPassed)}
    </div>
  );
};
