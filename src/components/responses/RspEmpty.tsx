/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 Phase 9 (ref `emptyPage`) — NOTHING BACK YET: the title card's empty variant, "While you wait" (three
 * cards from the writer's own queries) and "What this page will show you" (three rows, each a real component of this
 * page on an oat panel tagged Example).
 *
 * ⚠️ THE WAITING FIGURES ARE THE QUERY CENTRE'S: `waitingRows`, `nextExpected` (the row's own expected reply date) and
 *    `goneQuiet` (D6). The next-reply card is left out when no expected reply date lies ahead.
 * ⚠️ THE EXAMPLES ARE FIXED, CLEARLY FAKE AND NEVER THE WRITER'S: `EXAMPLE_*` below, with dates set relative to today so
 *    "10 days left" stays true of the example. They are inert: no opener, no data-id, no button in the tab order.
 * ⚠️ THE PAGE SWITCHES TO THE POPULATED ONE the moment the first answer is recorded, with no reload (the page decides,
 *    from live data, as v2 did).
 */
import React from "react";
import { QueryStatus } from "../../types";
import { goneQuiet, nextExpected, plural, respDate, waitingRows, type RespItem } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { MONTHS_SHORT } from "../../lib/dates";
import { Rsp5TitleCard } from "./Rsp5Head";
import { ReqCard } from "./RspCarousel";
import { NoteCard } from "./Rsp5Words";
import { Tally } from "./RspNos";

type Item = RespItem<QcRow>;
const DAY = 86_400_000;
export const RESPONSES_HAWK = { src: "/images/responses/responses-wall-hawk.webp", version: "e223df95" } as const;

/** a fake row for an example: only the fields the example components read */
function fakeRow(name: string, agency: string, initials: string, status: QueryStatus, steps: [QueryStatus, number][], nowMs: number, extra: Partial<QcRow> = {}): QcRow {
  const spans = steps.map(([s, d], i, a) => ({ status: s, startMs: nowMs - d * DAY, endMs: a[i + 1] ? nowMs - a[i + 1][1] * DAY : null, current: i === a.length - 1 }));
  return {
    id: `example-${initials}`, query: {} as QcRow["query"], status, agentName: name, agency, initials, sentMs: spans[0].startMs,
    history: { spans, currentStartMs: spans[spans.length - 1].startMs, dated: true }, dayN: steps[0][1], furthest: "partial",
    expectedMs: null, expectedKind: null, ...extra,
  } as QcRow;
}
/** Jonathan Marsh at The Marsh Agency: asked for the full after the partial, ten days left to send */
export function exampleRequest(nowMs: number): Item {
  const row = fakeRow("Jonathan Marsh", "The Marsh Agency", "JM", QueryStatus.FULL_REQUESTED,
    [[QueryStatus.QUERIED, 118], [QueryStatus.PARTIAL_REQUESTED, 94], [QueryStatus.PARTIAL_SENT, 92], [QueryStatus.FULL_REQUESTED, 4]], nowMs);
  return {
    id: row.id, row, group: "more", answer: "full", state: "toSend", yourMove: true, answerMs: nowMs - 4 * DAY, queriedMs: row.sentMs,
    waitDays: 114, pagesSentMs: null, dueMs: nowMs + 10 * DAY, afterPartial: true, personal: false, note: null, furthest: "partial",
  };
}
/** Mei Takahashi at Takahashi Literary: a pass with a note, after the partial */
export function exampleNote(nowMs: number): Item {
  const row = fakeRow("Mei Takahashi", "Takahashi Literary", "MT", QueryStatus.REJECTED,
    [[QueryStatus.QUERIED, 64], [QueryStatus.PARTIAL_REQUESTED, 48], [QueryStatus.PARTIAL_SENT, 46], [QueryStatus.REJECTED, 28]], nowMs);
  return {
    id: row.id, row, group: "passed", answer: "passed", state: null, yourMove: false, answerMs: nowMs - 28 * DAY, queriedMs: row.sentMs,
    waitDays: 36, pagesSentMs: null, dueMs: null, afterPartial: false, personal: true, furthest: "partial",
    note: "The opening pages are tense and well paced. I didn’t connect with Murphy as strongly as I’d hoped, and I need to love a lead to take a book on.",
  };
}

const dayMon = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

export const RspEmpty: React.FC<{
  msTitle: string | null;
  rows: readonly QcRow[];
  nowMs: number;
  /** the agent's stated reply time, for the next-reply card */
  weeksOf: (r: QcRow) => number | null;
  onRecord: () => void;
  onQueryCentre: () => void;
  onTodo: () => void;
}> = ({ msTitle, rows, nowMs, weeksOf, onRecord, onQueryCentre, onTodo }) => {
  const wait = waitingRows(rows).slice().sort((a, b) => (a.sentMs ?? 0) - (b.sentMs ?? 0));
  const firstSent = wait.find((r) => r.sentMs != null)?.sentMs ?? null;
  const next = nextExpected(rows, nowMs);
  const nextWeeks = next ? weeksOf(next) : null;
  const quiet = goneQuiet(rows, nowMs).length;
  const faces = wait; /* oldest query first, as the reference */
  const ex = <span className="rsp5-exm">Example</span>;
  return (
    <div className="rsp5-empty" data-rsp5="empty">
      <Rsp5TitleCard msTitle={msTitle} empty loading={false} onRecord={onRecord} onSecond={onQueryCentre} />
      <section className="rsp5-sec" data-rsp5="wait" aria-labelledby="rsp5-wait-h">
        <div className="rsp5-h2row"><div className="rsp5-h2"><h2 id="rsp5-wait-h" className="rsp5-h2t">While you wait</h2></div></div>
        <div className="rsp5-wyw">
          <div className="rsp5-wy" data-rsp5="wait-out">
            <b>{wait.length}</b>
            <span className="rsp5-wyl">{wait.length === 1 ? "query out with an agent" : "queries out with agents"}</span>
            {firstSent != null ? <span className="rsp5-wys">The first went out on {respDate(firstSent, nowMs)}.</span> : null}
            <span className="rsp5-faces">
              {faces.slice(0, 7).map((r) => <span key={r.id} className="rsp5-face rsp5-face--q" title={r.agentName}>{r.initials}</span>)}
              {faces.length > 7 ? <i className="rsp5-more">+{faces.length - 7}</i> : null}
            </span>
          </div>
          {next && next.expectedMs != null ? (
            <div className="rsp5-wy" data-rsp5="wait-next">
              <b>{dayMon(next.expectedMs)}</b>
              <span className="rsp5-wyl">the next reply you can expect</span>
              <span className="rsp5-wys">{next.agentName} at {next.agency}{nextWeeks ? ` gives ${plural(nextWeeks, "week", "weeks")}` : ""}.</span>
            </div>
          ) : null}
          <div className={`rsp5-wy${quiet ? " is-hot" : ""}`} data-rsp5="wait-quiet" data-n={quiet}>
            <b>{quiet}</b>
            <span className="rsp5-wyl">{quiet === 1 ? "agent has" : "agents have"} gone quiet</span>
            <span className="rsp5-wys">{quiet ? "They’re past the reply time they give. A nudge, or closing the query, is on your To-do list." : "Nobody is past the reply time they give."}</span>
            {quiet ? <button type="button" className="rsp5-go" data-rsp5="to-todo" onClick={onTodo}>Open your To-do list {"→"}</button> : null}
          </div>
        </div>
      </section>
      <section className="rsp5-sec" data-rsp5="feats" aria-labelledby="rsp5-feats-h">
        <div className="rsp5-h2row"><div className="rsp5-h2"><h2 id="rsp5-feats-h" className="rsp5-h2t">What this page will show you</h2></div></div>
        <div className="rsp5-feats">
          <div className="rsp5-ft" data-rsp5="feat" data-k="requests">
            <div className="rsp5-ftx"><h3>Track your requests</h3><p>See who asked for pages, what they want and when to send it.</p></div>
            <div className="rsp5-fpic" aria-hidden="true">{ex}<ReqCard i={exampleRequest(nowMs)} nowMs={nowMs} example /></div>
          </div>
          <div className="rsp5-ft rsp5-ft--rev" data-rsp5="feat" data-k="notes">
            <div className="rsp5-ftx"><h3>Keep your notes</h3><p>Every personal note from an agent, saved in one place.</p></div>
            <div className="rsp5-fpic" aria-hidden="true">{ex}<NoteCard i={exampleNote(nowMs)} nowMs={nowMs} example /></div>
          </div>
          <div className="rsp5-ft" data-rsp5="feat" data-k="tally">
            <div className="rsp5-ftx"><h3>Rejection collection</h3><p>Each no adds a mark to your wall. Share it when you&rsquo;re ready.</p></div>
            <div className="rsp5-fpic" aria-hidden="true">{ex}<div className="rsp5-extally"><Tally n={13} ghosts={false} /><div className="rsp5-tcap">10 passes, 3 no reply</div></div></div>
          </div>
        </div>
      </section>
    </div>
  );
};
