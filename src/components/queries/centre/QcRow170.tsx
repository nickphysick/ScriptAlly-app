/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172 — the list's row: the agent's seal and name; where it stands as the four steps, each with the day
 * it was reached; how it was sent (the method's icon and word); the materials as an icon pill; and the next move as a
 * button in the app's own words with the reason under it (lib/next169).
 */
import React, { useRef, useState } from "react";
import { QueryStatus } from "../../../types";
import type { QcRow } from "../../../lib/qcSummary";
import { rowAct } from "../../../lib/qc1512";
import { next169 } from "../../../lib/next169";
import { materialGroups } from "../../../lib/qc1533";
import { shortDate } from "../../../lib/qc151";
import { STAGE_COLOURS, stageOf, statusBand } from "../../../lib/stageColours";
import { StatusDot } from "../../StatusDot";
import { MatTile } from "./QcMatTile";
import { A_IN, A_OUT, A_END } from "./QcSlip153";
import { isQuietCard } from "../../../lib/qc154";
import { sendMethodLabel } from "../../../lib/agentDisplay";
/* how it was sent: the app's own words, with a line drawing each */
const SVG = (d: string) => <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.split("|").map((x, i) => <path key={i} d={x} />)}</svg>;
export const METHOD_ICON: Record<string, React.ReactNode> = {
  email: SVG("M3 5.5h14v9H3z|M3.5 6l6.5 5 6.5-5"),
  "online form": SVG("M4.5 3h11v14h-11z|M7 7h6|M7 10h6|M7 13h3"),
  "query manager": SVG("M3 4h14v12H3z|M3 7.5h14|M6 10.5h4|M6 13h7"),
  post: SVG("M3.5 5h13v10h-13z|M12.5 7h2v2.5h-2z|M5.5 11h5|M5.5 13h3"),
};
const ZZZ = <span className="qr170-zz"><i>z</i><i>z</i><i>z</i></span>;
import { slipTrack } from "../../../lib/qc153";
import type { DrawerMode } from "../../../lib/queryActions/drawerStore";

const NAME: Record<string, string> = { "Queried": "Queried", "Partial Requested": "Partial asked", "Partial Sent": "Partial sent", "Full Requested": "Full asked", "Full Sent": "Full sent", "Revise & Resubmit": "R&R", "Resubmitted": "Resubmitted", "Offer": "Offer" };

const LEVEL: Record<string, number> = { "Queried": 0, "Partial Requested": 1, "Partial Sent": 1, "Full Requested": 2, "Full Sent": 2, "Revise & Resubmit": 2, "Resubmitted": 2, "Offer": 3, "Signed": 3 };
const STEP_ST = [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.OFFER];
const STEP_NAME = ["Queried", "Partial", "Full", "Offer"];
/** the four steps, each with the day it was first reached (the Queried step's is the day it was sent) */
function steps(r: QcRow, nowMs: number) {
  const t = slipTrack(r);
  const first: (number | null)[] = [r.sentMs, null, null, null];
  const last: (string | null)[] = [null, null, null, null];
  r.history.spans.forEach((x) => { const l = LEVEL[x.status as string]; if (l == null || !Number.isFinite(x.startMs)) return; if (first[l] == null || (x.startMs as number) < (first[l] as number)) first[l] = x.startMs as number; last[l] = x.status as string; });
  return t.nodes.map((n, i) => ({ n, name: STEP_NAME[i], date: n === "fut" || n === "skip" ? null : first[i] != null ? shortDate(first[i] as number, nowMs) : null,
    status: (n === "cur" && !t.ended ? r.status : last[i] ?? STEP_ST[i]) as QueryStatus }));
}

export const QcRow170: React.FC<{ row: QcRow; nowMs: number; selected: boolean; packageName: string | null; onOpen: (id: string) => void; onAct: (id: string, mode?: DrawerMode) => void }> = ({ row: r, nowMs, selected, packageName, onOpen, onAct }) => {
  const a = next169(r, nowMs);
  const act = rowAct(r, nowMs);
  const mats = materialGroups(r.query, r.status, packageName, r.stageStartMs, nowMs);
  const [, setPop] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const stage = stageOf(r.status);
  const closed = stage === "closed";
  const tone = !act ? "none" : act.tone;
  const t = slipTrack(r);
  const word = NAME[r.status] ?? r.status;
  const quiet = isQuietCard(r, nowMs);
  const seal = <span className="qr170-seal" aria-hidden="true">{r.initials}</span>;
  const stepsCol = (
    <span className="qr170-steps" aria-label={`Where it stands: ${word}`}>
      {steps(r, nowMs).map((x, i) => (
        <span key={i} className={`qr170-sp is-${x.n}`} style={x.n === "cur" ? { "--c": statusBand(r.status), "--e": STAGE_COLOURS[stage].edge } as React.CSSProperties : undefined}>
          <span className="qr170-sn"><StatusDot status={x.status} overrideSize={x.n === "cur" ? 18 : 15} tone="inherit" reached={i === 3 ? x.n === "cur" : true} decorative />
            {x.n === "cur" ? <b className={`qr170-arw d-${quiet ? "quiet" : t.dir}`} aria-hidden="true">{quiet ? ZZZ : t.dir === "in" ? A_IN : t.dir === "out" ? A_OUT : A_END}</b> : null}</span>
          <b>{x.n === "cur" ? <><span className="w-l">{word}</span><span className="w-s">{x.name}</span></> : x.name}</b>
          <em>{x.date ?? (x.n === "skip" ? "–" : "")}</em>
        </span>
      ))}
    </span>
  );
  return (
    <div ref={ref} className={`qr170${selected ? " is-sel" : ""}${closed ? " is-closed" : ""}`} id={`query-row-${r.id}`} role="button" tabIndex={0} data-qcv="row" data-id={r.id}
      onClick={() => onOpen(r.id)} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpen(r.id); } }}
      aria-label={`${r.agentName}, ${r.agency}`}>
      {seal}
      <span className="qr170-who"><b>{r.agentName}</b><span><i>{r.agency}</i></span></span>
      {stepsCol}
      <span className="qr170-sm" title={sendMethodLabel(r.query.sendMethod) || undefined}>{(() => { const m = String(r.query.sendMethod ?? "").toLowerCase().trim(); const l = sendMethodLabel(r.query.sendMethod); return l ? <>{METHOD_ICON[m] ?? METHOD_ICON["online form"]}<span>{l}</span></> : <span className="is-none">–</span>; })()}</span>
      <span className="qr170-m">{mats ? <MatTile pill id={r.id} g={mats} onOpen={setPop} cardRef={ref} /> : null}</span>
      <span className="qr170-n">
        {act && tone !== "plain" ? (
          <button type="button" className={`qr170-act t-${tone}`} onClick={(e) => { e.stopPropagation(); onAct(r.id, a.value === "Consider closing" ? "close" : act.mode); }}>{a.value}<span aria-hidden="true">→</span></button>
        ) : <b className="qr170-wait">{a.value}</b>}
        {a.line ? <em>{a.line}</em> : null}
      </span>
    </div>
  );
};
