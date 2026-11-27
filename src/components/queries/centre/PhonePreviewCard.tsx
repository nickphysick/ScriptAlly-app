/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone query sheet v1 — THE REVIEW'S CARD ON THE PHONE (ref `preview`): the query's card as the save's own plans leave
 * it (the same `QcRow` the desktop review draws with QcCard154, whose grid styles are desktop-only): the band in the
 * stage's colour with the seal, the name and the track, over two tiles — the stage and its date, and what comes next
 * (the reply date, the send-by date or the answer-by date), outlined.
 */
import React from "react";
import type { QcRow } from "../../../lib/qcSummary";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { bandInk, statusBand } from "../../../lib/stageColours";
import { QueryStatus } from "../../../types";
import { dayMonth } from "../../../lib/dates";
import { V3Glyph } from "../../phone/v3/V3Parts";
import { trackStage } from "../../phone/qsheet/track";

const TRACK: QueryStatus[] = [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.OFFER];
const NEXT: Record<string, string> = { reply: "Reply expected by", sendBy: "Send by", offer: "Answer by" };

export const PhonePreviewCard: React.FC<{ row: QcRow; data: string; logged?: boolean }> = ({ row, data, logged = false }) => {
  const st = String(row.status), at = trackStage(st);
  const since = row.stageStartMs ?? row.sentMs;
  const agency = row.agency && row.agency !== "No agency" ? row.agency : "";
  return (
    <div className={`pqj-pv${logged ? " is-logged" : ""}`} data-cj={data} data-status={st}>
      <div className="pb" style={{ background: statusBand(st), color: bandInk(st) }}>
        <span className="seal" aria-hidden="true">{row.initials}</span>
        <span className="nm"><b>{row.agentName}</b>{agency ? <i>{agency}</i> : null}</span>
        <span className="trk" aria-label={at >= 0 ? `Stage ${at + 1} of 4` : "Closed"}>
          {TRACK.map((s, k) => <React.Fragment key={s}>{k ? <i className={`ln${at >= 0 && k <= at ? "" : " fut"}`} /> : null}<span className={`nd${k === at ? " cur" : at < 0 || k > at ? " fut" : ""}`}><V3Glyph status={k === at ? st : s} size={k === at ? 20 : 14} label={false} /></span></React.Fragment>)}
        </span>
      </div>
      <div className="pf">
        <div data-k="stage"><small>{STAGE_NAME[st as QueryStatus] ?? st}</small><b>{since != null ? dayMonth(since) : "No date"}</b></div>
        {row.expectedKind && row.court !== "closed" ? (
          <div className="nx" data-k="next"><small>{NEXT[row.expectedKind] ?? "Next"}</small><b>{row.expectedMs != null ? dayMonth(row.expectedMs) : "No date"}</b></div>
        ) : <div data-k="next"><small>{row.court === "closed" ? "Closed" : "Next"}</small><b>{row.court === "closed" ? (row.lastMs != null ? dayMonth(row.lastMs) : "—") : "—"}</b></div>}
      </div>
    </div>
  );
};
