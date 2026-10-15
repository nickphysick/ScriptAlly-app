/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 Part F — THE EMPTY PAGE (nothing answered for the book in scope) and THE ZERO-NOS SHEET (answers, but
 * no nos yet).
 *
 * ⚠️ PAGE-LOCAL, from the empty-page values packages v4, the Contact list and the Query Centre each hold page-local
 *    (`PkgEmpty4`, `ContactEmptyPage`, `QcEmpty138`): the navy panel with the art, "How it works" with one example,
 *    and "Ways to get started". Lift candidates, the four of them together.
 * ⚠️ THE EXAMPLE IS FIXED SAMPLE CONTENT: drawn here, never written, never counted, and never an answer. It reads no
 *    store, so nothing about it can reach a derivation.
 * ⚠️ COPY IS THE REFERENCE'S, EXACTLY (its straight apostrophes included). The zero-nos sheet carries no tag.
 */
import React from "react";

export const RESPONSES_HAWK = { src: "/images/responses/responses-wall-hawk.webp", version: "e223df95" } as const;

const sv = (d: React.ReactNode) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const LETTER = sv(<><rect x="2.5" y="4.5" width="15" height="11" rx="1.5" /><path d="m3 5.5 7 5.5 7-5.5" /></>);
const POINTS: { icon: React.ReactNode; h: string; p: string }[] = [
  { icon: sv(<path d="M4 5h12M4 10h12M4 15h8" />), h: "Every answer in one list", p: "See who asked for more, who passed and who never replied, with how long each one took." },
  { icon: sv(<><circle cx="10" cy="10" r="7" /><path d="M10 3a7 7 0 0 1 6.6 9.3" /></>), h: "Your reply rate", p: "Counted from every query no longer waiting, so a run of rejections still shows agents are reading." },
  { icon: sv(<path d="M3 5h14M3 10h14M3 15h14M8 5v5M13 10v5M6 15v3M14 2v3" />), h: "A wall of no to share", p: "Every rejection goes up as a card. Save it as an image and show writers starting out that it's part of the process." },
];

export const RspEmpty: React.FC<{
  msTitle: string | null;
  stillOut: number;
  onRecord: () => void;
  onQueryCentre: () => void;
  onPastReplyTime: () => void;
  onImport: () => void;
}> = ({ msTitle, stillOut, onRecord, onQueryCentre, onPastReplyTime, onImport }) => (
  <div className="rsp-empty" data-rsp="empty">
    <section className="rsp-np" data-rsp="empty-panel" data-own-header="">
      <div className="rsp-npt">
        <span className="rsp-npey">— RESPONSES —</span>
        <h1 className="rsp-nph1" data-page-title="" data-rsp="empty-title"><span>Every answer,<br />in one place</span></h1>
        <p className="rsp-npl">
          When an agent answers a query for <b className="rsp-npms">{msTitle || "your book"}</b>, record it and it lands here: requests to read more, rejections, and the queries you close after the wait.
        </p>
        <div className="rsp-npacts">
          <button type="button" className="rsp-npb1" data-rsp="empty-record" onClick={onRecord}>+ Record a response</button>
          <button type="button" className="rsp-npb2" data-rsp="empty-qc" onClick={onQueryCentre}>Go to the Query Centre</button>
        </div>
      </div>
      <img className="rsp-npart" data-rsp="empty-art" src={`${RESPONSES_HAWK.src}?v=${RESPONSES_HAWK.version}`} alt="" aria-hidden="true" />
    </section>

    <div className="rsp-esh"><h2>How it works</h2><span>One query, from sent to answered</span></div>
    <div className="rsp-ex" data-rsp="example">
      <div className="rsp-ex-top"><b>A query to one agent</b><i>An example</i></div>
      <div className="rsp-chain">
        <div className="rsp-mt"><span className="rsp-ti">{LETTER}</span><span className="rsp-mtt"><span className="rsp-mono">Query sent</span><strong>21 Aug</strong></span></div>
        <div className="rsp-arrow" aria-hidden="true">→</div>
        <div className="rsp-pkx"><span className="rsp-mono">The agent answers</span><b>41 days later</b></div>
        <div className="rsp-arrow" aria-hidden="true">→</div>
        <div className="rsp-outs">
          <div className="rsp-out"><span className="rsp-tag rsp-tag--more">Asked for more</span><span className="rsp-oa">→</span><span>Your move in the Query Centre, with a date to send by</span></div>
          <div className="rsp-out"><span className="rsp-tag rsp-tag--passed">Passed</span><span className="rsp-oa">→</span><span>A card on your wall of no, and a mark on your tally</span></div>
          <div className="rsp-out"><span className="rsp-tag rsp-tag--noReply">No reply</span><span className="rsp-oa">→</span><span>Close it after the wait, and it goes on your wall too</span></div>
        </div>
      </div>
      <div className="rsp-exkey">
        <span className="rsp-key">
          <span><u className="rsp-sw--more" />Asked for more: a partial, a full, a revision or an offer</span>
          <span><u className="rsp-sw--passed" />Passed: a form reply or a personal note</span>
          <span><u className="rsp-sw--noReply" />No reply: closed after the wait</span>
        </span>
      </div>
    </div>
    <div className="rsp-pts">
      {POINTS.map((x) => (
        <div key={x.h} className="rsp-pt"><span className="rsp-pti">{x.icon}</span><h3>{x.h}</h3><p>{x.p}</p></div>
      ))}
    </div>

    <div className="rsp-esh"><h2>Ways to get started</h2><span>Pick whichever suits you</span></div>
    <div className="rsp-ways" data-rsp="ways">
      <div className="rsp-way rsp-way--n" data-rsp="way-1">
        <span className="rsp-wayq">Quickest</span>
        <h3>Record an answer</h3>
        <p>Had a reply from an agent? Record it against the query, and it lands here.</p>
        <button type="button" className="rsp-wayb" data-rsp="way-1-btn" onClick={onRecord}>+ Record a response</button>
        <small data-rsp="way-out">{stillOut} {stillOut === 1 ? "query" : "queries"} out with agents</small>
      </div>
      <div className="rsp-way" data-rsp="way-2">
        <h3>Close old queries</h3>
        <p>Some agents only reply if they want more. Close a query once its reply time has passed, and it counts as no reply.</p>
        <button type="button" className="rsp-wayb" data-rsp="way-2-btn" onClick={onPastReplyTime}>See queries past their reply time</button>
      </div>
      <div className="rsp-way" data-rsp="way-3">
        <h3>Bring in past replies</h3>
        <p>Kept a spreadsheet before QueryHawk? Import it, with the replies you've already had.</p>
        <button type="button" className="rsp-wayb" data-rsp="way-3-btn" onClick={onImport}>Import a spreadsheet</button>
      </div>
    </div>
  </div>
);

/** Answers, but no nos yet: the banner sheet in place of the tally and the list. No tag. */
export const RspZeroNos: React.FC = () => (
  <section className="rsp-ws rsp-zero" data-rsp="zero" aria-label="No rejections yet">
    <div className="rsp-wsh"><p className="rsp-say">The nos<span className="rsp-dim">, none yet</span></p></div>
    <div className="rsp-zb">
      <div className="rsp-zc">
        <h3>Rejections are part of querying</h3>
        <p>Almost every published writer heard no many times before they found their agent. A rejection is rarely a verdict on your book. More often:</p>
        <ul>
          <li>It isn't to this agent's taste, and no book suits every agent.</li>
          <li>Their list already has something close to it.</li>
          <li>It reached their desk at a busy time, or just before they closed to queries.</li>
        </ul>
        <p>When a no comes in, record it and it's listed here, with a mark on your tally.</p>
      </div>
      <div className="rsp-zart" aria-hidden="true">
        <div className="rsp-slate">
          <svg width="150" height="157" viewBox="0 0 42 44">
            <g fill="none" stroke="#f4eee5" strokeWidth={1.6} strokeLinecap="round" strokeDasharray="2.5 3.5" opacity={0.55}>
              <path d="M6 4 Q 6.5 22 6 40" /><path d="M15 5 Q 14.6 22 15.4 40" /><path d="M24 4 Q 24.6 22 24 39" /><path d="M33 4.5 Q 32.5 22 33.2 40" /><path d="M-1 30 L 40 10" />
            </g>
          </svg>
          <span>YOUR TALLY STARTS HERE</span>
        </div>
      </div>
    </div>
  </section>
);
