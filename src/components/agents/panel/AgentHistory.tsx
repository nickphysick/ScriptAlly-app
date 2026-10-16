/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.2 §B — THE HISTORY TAB: the agent's whole correspondence as one timeline, newest first, with a
 * month divider at each change and, first, a "Next" entry while it is the writer's move or the agent's. Every entry is
 * `lib/agentHistory`'s; the Next entry's words are v16's stand (`panelStand`) and its date is the one the stand read.
 * Nothing here is written by QueryHawk: titles are the app's own labels, details are what the writer recorded.
 */
import React from "react";
import type { QueryStatus } from "../../../types";
import { histDay, monthKey, monthLabel, type HistEntry, type HistNext } from "../../../lib/agentHistory";
import { formatDate } from "../../../lib/dates";
import { StatusDot } from "../../StatusDot";

const Icon: React.FC<{ kind: "added" | "note" | "nudge" | "offer" | "next" }> = ({ kind }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "added" ? <><circle cx="10" cy="10" r="7.5" strokeDasharray="2 2.2" /><path d="M10 6.5v7M6.5 10h7" /></>
      : kind === "note" ? <path d="M4 16l1-3.6L13.3 4.1a1.6 1.6 0 0 1 2.3 0l.3.3a1.6 1.6 0 0 1 0 2.3L7.6 15 4 16z" />
      : kind === "nudge" ? <><path d="M6 13.5V9a4 4 0 0 1 8 0v4.5l1.2 1.5H4.8z" /><path d="M8.5 17h3" /></>
      : kind === "offer" ? <><path d="M5.5 2.5h6l3 3v12h-9z" /><path d="M11.5 2.5v3h3M8 10h4.5M8 13h4.5" /></>
      : <><circle cx="10" cy="10" r="7.5" /><path d="M10 6v4.2l2.8 1.8" /></>}
  </svg>
);

const DateCol: React.FC<{ ms: number }> = ({ ms }) => (
  <div className="hzz-d" data-ap-h="date">
    <b>{new Date(ms).getDate()}</b>
    <small>{formatDate(new Date(ms), { weekday: "short" })}</small>
  </div>
);

/** an entry's body: a button that opens its query where it has one, a plain block otherwise */
const Body: React.FC<{ e: HistEntry; onOpenQuery?: (id: string) => void; children: React.ReactNode }> = ({ e, onOpenQuery, children }) => (
  e.queryId && onOpenQuery
    ? <button type="button" className="hzz-c hzz-open" data-ap-h="open" data-query={e.queryId} aria-label={`${e.title}. Open the query`} onClick={() => onOpenQuery(e.queryId!)}>{children}</button>
    : <div className="hzz-c">{children}</div>
);

export const AgentHistory: React.FC<{
  entries: readonly HistEntry[];
  summary: string;
  next: HistNext | null;
  first: string;
  /** the agent's current stage, for the Next entry's glyph; null with no query */
  nextStatus: QueryStatus | null;
  queried: boolean;
  nowMs: number;
  /** an entry that belongs to a query opens it in this panel (the box changing hands, as the old ledger did) */
  onOpenQuery?: (queryId: string) => void;
}> = ({ entries, summary, next, first, nextStatus, queried, nowMs, onOpenQuery }) => {
  const rows: React.ReactNode[] = [];
  let month: string | null = null;
  for (const e of entries) {
    const k = monthKey(e.ms);
    if (k !== month) {
      month = k;
      rows.push(<li key={`m:${k}`} className="hzz-m" data-ap-h="month"><span>{monthLabel(e.ms, nowMs)}</span></li>);
    }
    rows.push(
      <li key={e.id} className="hzz-e" data-ap-h="entry" data-dir={e.dir} data-ms={e.ms} data-id={e.id}>
        <DateCol ms={e.ms} />
        <span className="hzz-g" aria-hidden="true">
          {e.status ? <StatusDot status={e.status} overrideSize={20} decorative /> : <Icon kind={e.icon ?? "added"} />}
        </span>
        <Body e={e} onOpenQuery={onOpenQuery}>
          {e.dir === "in" ? <span className="hzz-dir" data-ap-h="dir">{first} → You</span>
            : e.dir === "out" ? <span className="hzz-dir" data-ap-h="dir">You → {first}</span> : null}
          <b className="hzz-t" data-ap-h="title">{e.title}</b>
          {e.detail ? <span className="hzz-s" data-ap-h="detail">{e.detail}</span> : null}
          {e.quote ? <span className="hzz-s" data-ap-h="quote">{"“"}{e.quote}{"”"}</span> : null}
          {e.chips.length ? <span className="hzz-ch" data-ap-h="chips">{e.chips.map((c) => <i key={c}>{c}</i>)}</span> : null}
          {e.manuscript ? <span className="hzz-bk" data-ap-h="ms"><i>For</i> {e.manuscript}</span> : null}
        </Body>
      </li>,
    );
  }
  return (
    <div className="hzz" data-ap="history">
      <p className="hzz-sum" data-ap-h="summary">{summary}</p>
      <ol className="hzz-l" data-ap-h="list">
        {next ? (
          <li className="hzz-e hzz-next" data-ap-h="next" data-r={next.who}>
            <div className="hzz-d"><b>Next</b></div>
            <span className="hzz-g" aria-hidden="true">{nextStatus ? <StatusDot status={nextStatus} overrideSize={20} decorative /> : <Icon kind="next" />}</span>
            <div className="hzz-c">
              <b className="hzz-t" data-ap-h="next-title">{next.title}</b>
              {next.due ? <span className="hzz-s" data-ap-h="next-due">{next.due}</span> : null}
            </div>
          </li>
        ) : null}
        {rows}
      </ol>
      {!queried ? <p className="hzz-empty" data-ap-h="empty">When you query {first}, every letter, request and reply lands here.</p> : null}
    </div>
  );
};

/** the Next entry, from v16's stand and the date it read (never recomputed). Null unless it is your move or theirs. */
export function historyNext(slipKind: string, standState: string, heading: string, expectedMs: number | null, nowMs: number): HistNext | null {
  const d = expectedMs != null ? histDay(expectedMs, nowMs) : null;
  if (slipKind === "you") {
    const due = d == null ? null : standState === "send" ? `Send by ${d}` : standState === "offer" ? `Answer by ${d}` : `Reply expected by ${d}`;
    return { who: "you", title: heading, due };
  }
  if (slipKind === "waiting") return { who: "agent", title: heading, due: d ? `Reply expected by ${d}` : null };
  return null;
}
