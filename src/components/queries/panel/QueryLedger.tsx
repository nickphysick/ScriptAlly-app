/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryLedger — the Tracking tab in the query's side panel (Query panel v2 §B; ref design-refs/query-panel-v2,
 * `.lg`): a three-column ledger. The date, right-aligned, in the first column; the entry's StatusDot on a spine
 * in the second; what happened, as a sentence, in the third. It ends in the stand card (`stand`, §C).
 *
 * ⚠️ THE ROWS ARE `buildTimelineRows`' OWN. This is a second DRESS for the same derivation, never a second
 *    derivation: which entries exist, their order, and which carry an activity are decided there.
 * ⚠️ A STATUS IS STILL DRAWN ONLY BY `StatusDot` — 20px on the spine in a 26px disc of the body's colour; a minor
 *    entry (a nudge, a holding reply) at 12px.
 * ⚠️ THE ··· IS THE ONE CORRECTION TRIGGER. It opens the fork with the entry and its own button, exactly as the
 *    timeline's ⋯ did; the send method is plain text here and is corrected through the same fork.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import type { RowSpec, TimelineEntryRef } from "../../reading-pane/QueryTimeline";
import { ledgerDate, ledgerSentence } from "../../../lib/ledgerSentence";
import "./queryLedger.css";

const REQUESTS = new Set<QueryStatus>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]);

export const QueryLedger: React.FC<{
  rows: readonly RowSpec[];
  nowMs: number;
  sendMethod?: string | null;
  revisionRound?: number | null;
  onFork?: (entry: TimelineEntryRef, trigger: HTMLElement) => void;
  /** the entry the correction is open on */
  highlightId?: string | null;
  /** the entry just saved: one pulse */
  freshId?: string | null;
  /** the entry whose inline delete confirm is showing, and the confirm */
  confirmFor?: string | null;
  confirmNode?: React.ReactNode;
  /** under the query-sent entry: the slip (and a requery's line) */
  sentExtra?: React.ReactNode;
  /** under each request: which package it came from, as words */
  fromPackage?: string | null;
  /** the stand card, closing the ledger across all three columns */
  stand?: React.ReactNode;
}> = ({ rows, nowMs, sendMethod, revisionRound, onFork, highlightId = null, freshId = null, confirmFor = null, confirmNode = null, sentExtra, fromPackage, stand }) => (
  <div className="qlg" data-qp="ledger">
    {rows.map((row) => {
      if (confirmFor && row.activityId === confirmFor && confirmNode) {
        return <div key={row.key} className="qlg-del tl-delrow" data-qcv="entry-delc">{confirmNode}</div>;
      }
      const minor = !!row.kind;
      const s = ledgerSentence(row, { sendMethod, revisionRound });
      const d = ledgerDate(row.timeMs, nowMs);
      const isSend = row.status === QueryStatus.QUERIED && !row.kind;
      const on = !!highlightId && row.activityId === highlightId;
      return (
        <React.Fragment key={row.key}>
          <div className="qlg-d" data-qp="ledger-date">{d ? <>{d.day}{d.year ? <small>{d.year}</small> : null}</> : null}</div>
          <div className={`qlg-g${minor ? " qlg-g--sm" : ""}`} data-qp="ledger-mark">
            <StatusDot status={row.status} overrideSize={minor ? 12 : 20} ghost={!!row.reconstructed} decorative />
          </div>
          <div className={`qlg-c tl-ev${minor ? " qlg-c--quiet" : ""}${on ? " qlg-c--on" : ""}${freshId && row.activityId === freshId ? " qlg-c--fresh" : ""}`}
            data-qp="ledger-entry" data-kind={row.kind ?? "status"} data-status={row.status} data-activity={row.activityId}>
            {/* not a heading element: brand.tsx forces h1–h3 into the brand serif, and an entry is a sentence */}
            <p className="qlg-t tl-ttl">{s.text}{s.manner ? <> <em>{s.manner}</em></> : null}</p>
            {isSend ? sentExtra : null}
            {!row.kind && REQUESTS.has(row.status) && fromPackage ? <p className="qlg-from" data-sent-from>from the {fromPackage} package</p> : null}
            {row.activityId && onFork ? (
              <button type="button" className="qlg-fix tl-more" aria-label="Correct this entry" title="Correct this entry"
                onClick={(e) => onFork({ activityId: row.activityId!, status: row.status, label: s.text, dateISO: row.dateISO || "", note: row.note || "" }, e.currentTarget)}>
                <span aria-hidden="true">···</span>
              </button>
            ) : null}
          </div>
        </React.Fragment>
      );
    })}
    {stand}
  </div>
);

/** What went with the query, as the ledger's white slip — or the dashed one when nothing was recorded. */
export const LedgerSlip: React.FC<{
  how: "package" | "individual" | "unrecorded";
  name: string | null;
  /** one line under the name, in the record's own words */
  detail: string | null;
  items: readonly string[];
  onAdd?: () => void;
  onOpenPackage?: () => void;
}> = ({ how, name, detail, items, onAdd, onOpenPackage }) => {
  if (how === "unrecorded" && items.length === 0) {
    return (
      <div className="qlg-slip qlg-slip--none" data-qp="slip" data-sent-box="unrecorded">
        <b>Nothing recorded about what went</b>
        {onAdd ? <button type="button" className="qlg-slipadd" data-qp="slip-add" onClick={onAdd}>Add what you sent</button> : null}
      </div>
    );
  }
  return (
    <div className="qlg-slip" data-qp="slip" data-sent-box={how}>
      <div className="qlg-sh">
        {onOpenPackage && how === "package"
          ? <button type="button" className="qlg-slipname" onClick={onOpenPackage}>{name ?? "A package"}</button>
          : <b>{name ?? (how === "individual" ? "Sent individually" : "Listed on the query")}</b>}
        {detail ? <span>{detail}</span> : null}
      </div>
      {items.length ? <ul>{items.map((it) => <li key={it}><i aria-hidden="true" />{it}</li>)}</ul> : null}
      {how === "unrecorded" && onAdd ? <button type="button" className="qlg-slipadd" data-qp="slip-add" onClick={onAdd}>Add what you sent</button> : null}
    </div>
  );
};
