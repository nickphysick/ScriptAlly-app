/**
 * MOCK v170 — a different list row. The status glyph leads (on its stage's colour), then the agent; then the query's
 * JOURNEY, a small bar drawn to time from the day it was sent: each stage in its colour, past the reply date hatched,
 * still to come dashed (Birds-eye's own drawing, one row at a time); then the materials' icons; then the next move as a
 * button in the app's own words, with the reason under it.
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
import { Track153, A_IN, A_OUT, A_QUIET, A_END } from "./QcSlip153";
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
import { slipTrack, queriedFact } from "../../../lib/qc153";
import { useMock169 } from "../../../mock169";
import type { DrawerMode } from "../../../lib/queryActions/drawerStore";

const DAY = 86_400_000;
const sod = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const span = (n: number) => (n >= 14 ? `${Math.round(n / 7)} wks` : `${n} ${n === 1 ? "day" : "days"}`);
const NAME: Record<string, string> = { "Queried": "Queried", "Partial Requested": "Partial asked", "Partial Sent": "Partial sent", "Full Requested": "Full asked", "Full Sent": "Full sent", "Revise & Resubmit": "R&R", "Resubmitted": "Resubmitted", "Offer": "Offer" };

function journey(r: QcRow, nowMs: number) {
  const today = sod(nowMs);
  const spans = r.history.spans.filter((x) => Number.isFinite(x.startMs)).map((x) => ({ status: x.status as string, from: sod(x.startMs as number) }));
  if (!spans.length && r.sentMs != null) spans.push({ status: r.status, from: sod(r.sentMs) });
  if (!spans.length) return null;
  const closed = stageOf(r.status) === "closed";
  const due0 = (r as { replyMs?: number | null }).replyMs ?? r.expectedMs;
  const due = !closed && due0 != null ? sod(due0) : null;
  const t0 = spans[0].from, end = Math.max(today, due ?? today, t0 + 7 * DAY);
  const W = (a: number, b: number) => `${(Math.max(0, b - a) / (end - t0)) * 100}%`, X = (a: number) => `${((a - t0) / (end - t0)) * 100}%`;
  const pieces: { left: string; width: string; bg: string; edge: string; kind: "stage" | "over" | "ahead"; title: string }[] = [];
  spans.forEach((s, i) => {
    const to = i < spans.length - 1 ? spans[i + 1].from : closed ? (r.stageStartMs ?? today) : due != null ? Math.min(due, today) : today;
    const bg = statusBand(s.status), edge = STAGE_COLOURS[stageOf(s.status)].edge;
    pieces.push({ left: X(s.from), width: W(s.from, Math.max(to, s.from + DAY)), bg, edge, kind: "stage", title: `${NAME[s.status] ?? s.status} · ${shortDate(s.from, nowMs)}` });
  });
  const last = spans[spans.length - 1], bg = statusBand(last.status), edge = STAGE_COLOURS[stageOf(last.status)].edge;
  if (due != null && due < today) pieces.push({ left: X(due), width: W(due, today), bg, edge, kind: "over", title: `Past its date by ${span(Math.round((today - due) / DAY))}` });
  if (due != null && due > today) pieces.push({ left: X(today), width: W(today, due), bg, edge, kind: "ahead", title: `${span(Math.round((due - today) / DAY))} to its date` });
  const yours = r.court === "you" || r.court === "offer" || stageOf(r.status) === "offer";
  const since = r.stageStartMs != null ? Math.round((today - sod(r.stageStartMs)) / DAY) : null;
  const right = closed ? "" : yours && due == null ? (since != null ? `with you ${span(since)}` : "with you") : due == null ? "no reply date" : due < today ? `${span(Math.round((today - due) / DAY))} past` : due === today ? "due today" : `due ${shortDate(due, nowMs)}`;
  return { pieces, left: `Sent ${shortDate(t0, nowMs)}`, right, late: due != null && due < today, today: due != null && due > today ? X(today) : null };
}

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
  const { tl, cw: m170cw } = useMock169();
  const t = slipTrack(r);
  const sent = queriedFact(r, nowMs);
  const word = NAME[r.status] ?? r.status;
  const since = r.stageStartMs != null ? Math.round((sod(nowMs) - sod(r.stageStartMs)) / DAY) : null;
  const sinceWords = r.stageStartMs != null ? `since ${shortDate(r.stageStartMs, nowMs)}${since != null && since > 0 ? `, ${span(since)}` : ""}` : "";
  const quiet = isQuietCard(r, nowMs);
  const track = <span className="qr170-trk" title={word}><Track153 t={t} status={r.status} quiet={quiet} /></span>;
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
    <div ref={ref} data-tl={tl} className={`qr170${selected ? " is-sel" : ""}${closed ? " is-closed" : ""}`} id={`query-row-${r.id}`} role="button" tabIndex={0} data-qcv="row" data-id={r.id}
      onClick={() => onOpen(r.id)} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpen(r.id); } }}
      aria-label={`${r.agentName}, ${r.agency}`}>
      {tl === "steps" ? <>
        {seal}
        <span className="qr170-who"><b>{r.agentName}</b><span><i>{r.agency}</i></span></span>
        {stepsCol}
      </> : tl === "beside" ? <>
        {seal}
        <span className="qr170-who"><b>{r.agentName}</b><span><i>{r.agency}</i></span></span>
        <span className="qr170-tb">{track}<span className="qr170-st"><b>{word}</b><em>{sinceWords}</em></span></span>
      </> : tl === "under" ? <>
        {seal}
        <span className="qr170-who"><b>{r.agentName}</b><span><i>{r.agency}</i><em>{word}</em></span></span>
        <span className="qr170-tu">{track}<em>Sent {sent.value}{r.stageStartMs != null && since != null ? ` · ${word.toLowerCase()} ${span(since)}` : ""}</em></span>
      </> : <>
        <span className="qr170-lead">{track}</span>
        <span className="qr170-who"><b>{r.agentName}</b><span><i>{r.agency}</i></span></span>
        <span className="qr170-st"><b>{word}</b><em>{sinceWords}</em></span>
      </>}
      <span className="qr170-sm" title={sendMethodLabel(r.query.sendMethod) || undefined}>{(() => { const m = String(r.query.sendMethod ?? "").toLowerCase().trim(); const l = sendMethodLabel(r.query.sendMethod); return l ? <>{METHOD_ICON[m] ?? METHOD_ICON["online form"]}<span>{l}</span></> : <span className="is-none">–</span>; })()}</span>
      <span className="qr170-m">{mats ? <MatTile pill id={r.id} g={mats} onOpen={setPop} cardRef={ref} /> : null}</span>
      <span className="qr170-n">
        {act && tone !== "plain" ? (
          <button type="button" className={`qr170-act t-${tone}`} onClick={(e) => { e.stopPropagation(); onAct(r.id, a.value === "Consider closing" ? "close" : act.mode); }}>{a.value === "Consider closing" && m170cw === "close" ? "Close it" : a.value}<span aria-hidden="true">→</span></button>
        ) : <b className="qr170-wait">{a.value}</b>}
        {a.line ? <em>{a.line}</em> : null}
      </span>
    </div>
  );
};
