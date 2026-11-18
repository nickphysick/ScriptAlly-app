/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 Phase G (ref `empty`) — NOTHING BACK YET: "While you wait" (every query still out on a line of dates,
 * at the reply date its agent gives) and three features, each with an example: "Track your requests", "Keep your
 * notes" and "Rejection collection".
 *
 * ⚠️ THE WAITING FIGURES ARE THE QUERY CENTRE'S, as v5's were: `waitingRows`, the row's own expected reply date
 *    (`expectedMs` with `expectedKind === "reply"`, from `expectedFor`) and `nextExpected`. A query whose agent gives no
 *    reply time is named in the chips instead of placed on the line. Nothing is invented.
 * ⚠️ THE EXAMPLES ARE FIXED, CLEARLY FAKE AND NEVER THE WRITER'S (the ref's own two agents), with dates relative to
 *    today. They are inert: no opener, no data-id, nothing in the tab order.
 * ⚠️ THE NEXT REPLY'S DOT DOES NOT PULSE: the ref loops a pulse on it, and this page's motion only confirms (decision
 *    13). It keeps the ref's ring.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { MONTHS_LONG, nextExpected, respDate, waitingRows } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { QcCard154 } from "../queries/centre/QcCard154";
import { StatusDot } from "../StatusDot";

const DAY = 86_400_000;
const sod = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const days = (a: number, b: number) => Math.round((sod(b) - sod(a)) / DAY);

/** a fake row for the example card: the fields the Query Centre's card reads, dated from today */
export function exampleRequestRow(nowMs: number): QcRow {
  const sent = nowMs - 42 * DAY, asked = nowMs - 5 * DAY;
  const spans = [
    { status: QueryStatus.QUERIED, startMs: sent, endMs: asked, current: false },
    { status: QueryStatus.PARTIAL_REQUESTED, startMs: asked, endMs: null, current: true },
  ];
  return {
    id: "example-cb", status: QueryStatus.PARTIAL_REQUESTED, agentName: "Clara Beaumont", agency: "Harbour Lane", initials: "CB",
    query: { id: "example-cb", status: QueryStatus.PARTIAL_REQUESTED, dateSent: new Date(sent).toISOString(), partialRequestedDate: new Date(asked).toISOString(), materialsWanted: [] },
    sentMs: sent, history: { spans, currentStartMs: asked, dated: true }, dayN: 42, furthest: "partial",
    expectedMs: null, expectedKind: null, stageStartMs: asked,
  } as unknown as QcRow;
}
export const EXAMPLE_NOTE = "I enjoyed Murphy’s voice a great deal, but I didn’t connect with the opening chapters as strongly as I’d hoped.";

interface Dot { r: QcRow; due: number; weeks: number | null; level: number; quiet: boolean; next: boolean }

export const RspEmpty: React.FC<{
  rows: readonly QcRow[];
  nowMs: number;
  /** the agent's stated reply time, for a dot's tooltip */
  weeksOf: (r: QcRow) => number | null;
}> = ({ rows, nowMs, weeksOf }) => {
  const wait = waitingRows(rows);
  const isDated = (r: QcRow) => r.expectedKind === "reply" && r.expectedMs != null;
  const dated = wait.filter(isDated).sort((a, b) => a.expectedMs! - b.expectedMs!);
  const undated = wait.filter((r) => !isDated(r)).sort((a, b) => (a.sentMs ?? 0) - (b.sentMs ?? 0));
  const next = nextExpected(rows, nowMs);
  const quiet = dated.filter((r) => r.expectedMs! < nowMs).length;
  /* the line: from the first of the month of the earliest date shown to a fortnight past the last (the ref's Oct →
     Feb), so every dot and Today sit inside it */
  const lo = Math.min(nowMs, ...dated.map((r) => r.expectedMs!));
  const hi = Math.max(nowMs, ...dated.map((r) => r.expectedMs!)) + 14 * DAY;
  const t0d = new Date(lo); t0d.setDate(1); t0d.setHours(0, 0, 0, 0);
  const t0 = t0d.getTime(), span = Math.max(1, days(t0, hi));
  const x = (ms: number) => `${((days(t0, ms) / span) * 100).toFixed(2)}%`;
  let lastX = -99, lvl = 0;
  const dots: Dot[] = dated.map((r) => {
    const px = days(t0, r.expectedMs!);
    lvl = px - lastX < 5 ? lvl + 1 : 0; lastX = px;
    return { r, due: r.expectedMs!, weeks: weeksOf(r), level: lvl, quiet: r.expectedMs! < nowMs, next: !!next && next.id === r.id };
  });
  const months: number[] = [];
  for (let m = new Date(t0d.getFullYear(), t0d.getMonth() + 1, 1); m.getTime() < hi; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) months.push(m.getTime());
  return (
    <div className="rsp15-empty" data-rsp15="empty">
      <section className="rsp15-ww" data-rsp15="wait" aria-labelledby="rsp15-wait-h">
        <h2 id="rsp15-wait-h" className="rsp15-wwt">While you wait</h2>
        <p data-rsp15="wait-line">{wait.length === 1 ? "Your query is with an agent." : `Your ${wait.length} queries are with agents.`}{dated.length ? " Here’s when each agent says they’ll reply by." : ""}</p>
        {dated.length ? (
          <div className="rsp15-tl" data-rsp15="timeline">
            <div className="rsp15-ax" />
            {months.map((m) => <span key={m} className="rsp15-mo" style={{ ["--x" as string]: x(m) }}>{MONTHS_LONG[new Date(m).getMonth()]}</span>)}
            <span className="rsp15-now" style={{ ["--x" as string]: x(nowMs) }}><span>Today</span></span>
            {dots.map((d) => {
              const n = Math.abs(days(nowMs, d.due));
              return (
                <span key={d.r.id} tabIndex={0} className={`rsp15-dot${d.quiet ? " is-q" : ""}${d.next ? " is-nx" : ""}`} data-rsp15="wait-dot"
                  style={{ ["--x" as string]: x(d.due), ["--y" as string]: `${75 - d.level * 40}px` }}
                  aria-label={`${d.r.agentName}, ${d.quiet ? `their reply time passed ${n} days ago` : `reply due ${respDate(d.due, nowMs)}`}`}>
                  {d.r.initials}
                  <span className="rsp15-tip" aria-hidden="true"><b>{d.r.agentName}</b><em>{d.r.agency}</em>
                    {d.r.sentMs != null ? `Queried ${respDate(d.r.sentMs, nowMs)}` : ""}{d.weeks ? ` · they say ${d.weeks} weeks` : ""}
                    <u className={d.quiet ? "is-q" : undefined}>{d.quiet ? `Their reply time passed ${n} days ago` : `Reply due ${respDate(d.due, nowMs)} · in ${n} days`}</u>
                  </span>
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="rsp15-wfacts" data-rsp15="wait-facts">
          {next && next.expectedMs != null
            ? <span>Next reply due <b>{respDate(next.expectedMs, nowMs)}</b> · {quiet} past the time their agent gives{undated.length ? " · No reply time given:" : ""}</span>
            : undated.length ? <span>No reply time given:</span> : null}
          {undated.map((r) => <span key={r.id} className="rsp15-ch" data-rsp15="wait-chip">{r.agentName}{r.sentMs != null ? ` · queried ${respDate(r.sentMs, nowMs)}` : ""}</span>)}
        </div>
      </section>
      <div className="rsp15-three" data-rsp15="features">
        <div className="rsp15-ft" data-rsp15="feature" data-k="requests">
          <div className="rsp15-ex" aria-hidden="true" inert><em>Example</em>
            <div className="qc151 qc153 rsp15-exc"><QcCard154 row={exampleRequestRow(nowMs)} nowMs={nowMs} selected={false} packageName={null} act={null} onOpen={() => {}} onAct={() => {}} /></div>
          </div>
          <h3 className="rsp15-fth">Track your requests</h3>
          <p>When an agent asks for pages, their card sits at the top until you{"’"}ve sent them.</p>
        </div>
        <div className="rsp15-ft" data-rsp15="feature" data-k="notes">
          <div className="rsp15-ex" aria-hidden="true" inert><em>Example</em>
            <span className="rsp15-bub" data-tone="closed"><span className="rsp15-g"><StatusDot status={QueryStatus.REJECTED} overrideSize={18} decorative /></span><b>Passed</b><q>{EXAMPLE_NOTE}</q><time>{respDate(nowMs - 3 * DAY, nowMs)}</time></span>
          </div>
          <h3 className="rsp15-fth">Keep your notes</h3>
          <p>Anything an agent says about your book is kept with their reply, so you can read them all together.</p>
        </div>
        <div className="rsp15-ft" data-rsp15="feature" data-k="collection">
          <div className="rsp15-ex" aria-hidden="true" inert><em>Example</em>
            <div className="rsp15-minis">{[-2, 1.5, -1].map((r) => <span key={r} className="rsp15-mini" style={{ transform: `rotate(${r}deg)` }}><span /><span /></span>)}</div>
          </div>
          <h3 className="rsp15-fth">Rejection collection</h3>
          <p>Every pass is kept in your Rejection collection. Rejections are part of querying, and you can share it when you{"’"}re ready.</p>
        </div>
      </div>
    </div>
  );
};
