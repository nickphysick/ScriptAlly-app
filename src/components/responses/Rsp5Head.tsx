/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 Phase B (design-refs/responses-v15/responses-v15.html, `header`, `tally`) — THE PAGE'S HEADER: the shared
 * navy workspace header (`shell/WorkspaceNavyHeader`, Workspace headers v1, unchanged) with this page's words, and in
 * its right-hand slot the reply count, the rate line and the hand-drawn tally (`RspTallyBlock`). v5's At a glance cards
 * are gone (Analytics owns those figures now).
 *
 * ⚠️ THE TALLY IS ONE MARK PER QUERY SENT: asked for more first (terracotta), then passed (cream), then no answer yet
 *    (faint): `headerTally` + `tallyMarks` (lib/responses), the ref's seeded jitter.
 */
import React, { useState } from "react";
import { WorkspaceNavyHeader } from "../shell/WorkspaceNavyHeader";
import { plural, respDate, tallyClasses, tallyMarks, type HeaderTally } from "../../lib/responses";

/** "18 responses": the agents who replied (asked for more + passed) */
export const responsesTitle = (n: number): string => `${n} ${n === 1 ? "response" : "responses"}`;
/** the empty page's headline (its own paragraph does not fit one line) */
export const RSP_EMPTY_TITLE = "No responses yet";

/* Responses v15 (ref `header`) — the navy header (Workspace headers v1, position and height unchanged): the count of
   agents who replied, the book on the ruled line, Record and Share your story, and on the right the reply count, the
   rate line and the hand-drawn tally, one mark per query sent. Every figure is `headerTally` (lib/responses).
   ⚠️ SHARE YOUR STORY HIDES WHEN THE REJECTION COLLECTION IS EMPTY, and opens the existing share builder (decision 3).
   ⚠️ A LABEL IS NAVIGATION: asked for more → the carousel, passed → the Rejection collection, no answer yet → the Query
      Centre. Hovering or focusing one lifts its marks (`data-h` on the block). */
export type TallyKey = "a" | "p" | "w";
const KEY_SWATCH: Record<TallyKey, string> = { a: "#e7a184", p: "#f4eee5", w: "rgba(244,238,229,.35)" };

export const RspTally: React.FC<{ classes: readonly TallyKey[]; height: number; className?: string; probe?: string }> = ({ classes, height, className = "rsp15-tally", probe = "tally" }) => {
  const { paths, width } = tallyMarks(classes, height);
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMinYMid meet" role="img" aria-label={`Tally of ${classes.length}`} data-rsp15={probe}>
      {paths.map((p, k) => <path key={k} className={p.cls} d={p.d} data-k={p.cls} />)}
    </svg>
  );
};

export const RspTallyBlock: React.FC<{
  tally: HeaderTally;
  early: boolean;
  /** nothing back yet: the next reply's due date (the reply times the agents give), or null */
  nextDueMs: number | null;
  nowMs: number;
  onKey: (k: TallyKey) => void;
}> = ({ tally: t, early, nextDueMs, nowMs, onKey }) => {
  const [h, setH] = useState<TallyKey | null>(null);
  const none = t.replies === 0;
  const keys: [TallyKey, number, string][] = none ? [["w", t.unanswered, "no answer yet"]]
    : [["a", t.more, "asked for more"], ["p", t.passed, "passed"], ["w", t.unanswered, "no answer yet"]];
  return (
    <div className="rsp15-rt" data-rsp15="tally-block" data-h={h ?? undefined}>
      <div className="rsp15-st" data-rsp15="replied">{none ? `${plural(t.queried, "query", "queries")} out` : `${t.replies} of ${t.queried} have replied`}</div>
      <div className="rsp15-sl" data-rsp15="rate">
        {none
          ? (nextDueMs != null ? `The next reply is due around ${respDate(nextDueMs, nowMs)}, going by the reply times your agents give.` : null)
          : early ? "It’s early days. Most of your queries are still with agents."
          : `That’s a ${t.pct}% response rate, counting the passes. ${t.more} asked to read more.`}
      </div>
      <RspTally classes={tallyClasses(t)} height={58} />
      <div className="rsp15-tkey" data-rsp15="tally-key">
        {keys.map(([k, n, label]) => (
          <button key={k} type="button" data-rsp15="tally-label" data-k={k}
            onMouseEnter={() => setH(k)} onMouseLeave={() => setH(null)} onFocus={() => setH(k)} onBlur={() => setH(null)}
            onClick={() => onKey(k)}>
            <i style={{ background: KEY_SWATCH[k] }} aria-hidden="true" /><b>{n}</b> {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export const RspHeader: React.FC<{
  msTitle: string | null;
  loading: boolean;
  /** no replies at all (asked for more + passed = 0) */
  noReplies: boolean;
  tally: HeaderTally;
  early: boolean;
  nextDueMs: number | null;
  nowMs: number;
  /** the Rejection collection has at least one entry: Share your story shows */
  canShare: boolean;
  more: number;
  yourMove: number;
  onRecord: () => void;
  onShare: () => void;
  onKey: (k: TallyKey) => void;
}> = ({ msTitle, loading, noReplies, tally, early, nextDueMs, nowMs, canShare, more, yourMove, onRecord, onShare, onKey }) => {
  const title = noReplies ? RSP_EMPTY_TITLE : responsesTitle(tally.replies);
  return (
    <WorkspaceNavyHeader page="responses" art="responses-header" loading={loading} className="rsp15-hd"
      title={title}
      forLine={msTitle ? { lead: "for", text: msTitle } : null}
      actions={<>
        <button type="button" className="qc1531-b qc1531-b--n" data-rsp5="record" disabled={loading} onClick={onRecord}>+ Record a response</button>
        {canShare ? <button type="button" className="qc1531-b qc1531-b--g" data-rsp15="share-top" disabled={loading} onClick={onShare}>Share your story</button> : null}
      </>}
      right={tally.queried > 0 ? <RspTallyBlock tally={tally} early={early} nextDueMs={nextDueMs} nowMs={nowMs} onKey={onKey} /> : null}
      bar={{
        title,
        aside: noReplies ? null : <><b>{more} asked for more</b><em>{yourMove} waiting on you</em></>,
        button: { label: "+ Record a response", onClick: onRecord },
      }} />
  );
};
