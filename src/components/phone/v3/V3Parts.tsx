/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — the parts every v3 screen shares (ref `gl`, `qRow`, `taskRow`, `spark`).
 *
 * ⚠️ THE STATUS GLYPH IS StatusDot, IMPORTED, NEVER REDRAWN (baked decision 5). The disc behind it is the status fill:
 *    the five phone tokens, chosen the ref's way (`fillOf`): closed grey, an offer slate, a request pink, the rest sand.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import type { V3Query } from "../../../lib/phoneV3";
import type { WsTask } from "../../../lib/todoWs";

/** the existing hawk portrait (public/images/hawk-portrait.webp, the marketing pages' own file and version) */
export const HAWK_SRC = "/images/hawk-portrait.webp?v=a8d0e9fe";

const CLOSED = new Set<string>([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN, QueryStatus.SIGNED]);
const ASKED = new Set<string>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]);
/** the status fill (ref `fillOf`) */
export function statusFill(status: string | null | undefined): string {
  if (!status) return "var(--pa-st-sand)";
  if (CLOSED.has(status)) return "var(--pa-st-grey)";
  if (status === QueryStatus.OFFER) return "var(--pa-st-slate)";
  if (ASKED.has(status)) return "var(--pa-st-pink)";
  return "var(--pa-st-sand)";
}

export const V3Glyph: React.FC<{ status: string | null | undefined; size?: number; bg?: string; label?: boolean }> = ({ status, size = 40, bg, label = true }) => (
  <span className="pa3-gl" data-pa3="glyph" data-status={status ?? ""} style={{ background: bg ?? statusFill(status), width: size, height: size }}>
    {status ? <StatusDot status={status} overrideSize={Math.round(size * 0.55)} decorative={!label} /> : null}
  </span>
);

/** a pill's look by the task it does (ref: an offer blush, gone quiet the quiet outline, the rest navy) */
export const pillClass = (t: Pick<WsTask, "kind"> | null): string => (t?.kind === "offer" ? " b" : t?.kind === "quiet" ? " q" : "");

/**
 * A query row (ref `qRow`): the glyph in its status fill, the agent, the agency, then ONE line — the status and the short
 * line. With-you rows carry their verb pill. The status is said once (PA3-5).
 */
export const QueryRowV3: React.FC<{ q: V3Query; onOpen: (id: string) => void; onVerb?: (q: V3Query) => void }> = ({ q, onOpen, onVerb }) => {
  const agency = q.row.agency && q.row.agency !== "No agency" ? q.row.agency : "";
  const verb = q.court === "you" && q.verb && onVerb ? q.verb : null;
  return (
    <div className="pa3-row" role="button" tabIndex={0} data-pa3="qrow" data-id={q.id} data-court={q.court}
      onClick={() => onOpen(q.id)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(q.id); }}>
      <V3Glyph status={q.row.status} />
      <span className="pa3-tx">
        <span className="pa3-t">{q.row.agentName}</span>
        {agency ? <span className="pa3-s">{agency}</span> : null}
        <span className="pa3-s" data-pa3="qline">{q.court === "you" ? <b>{q.status}</b> : q.status}{q.short ? ` · ${q.short}` : ""}</span>
      </span>
      {verb ? (
        <button type="button" className={`pa3-pill${pillClass(q.task)}`} data-pa3="verb" onClick={(e) => { e.stopPropagation(); onVerb!(q); }}>{verb}</button>
      ) : null}
    </div>
  );
};

/** a task row (ref `taskRow`): glyph, the title (two lines at most), "agency · short line", one verb pill */
export const TaskRowV3: React.FC<{ t: WsTask; line: string; status: string | null; onOpen: () => void; onVerb: () => void; hidden?: boolean }> = ({ t, line, status, onOpen, onVerb, hidden }) => (
  <div className="pa3-row" role="button" tabIndex={0} data-pa3="task" data-key={t.key} data-kind={t.kind} hidden={hidden}
    onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}>
    <V3Glyph status={status} />
    <span className="pa3-tx">
      <span className="pa3-t w" data-pa3="task-title">{t.title}</span>
      {line ? <span className="pa3-s">{line}</span> : null}
    </span>
    <button type="button" className={`pa3-pill${pillClass(t)}`} data-pa3="verb" onClick={(e) => { e.stopPropagation(); onVerb(); }}>{t.type ?? "Open"}</button>
  </div>
);

/** the ref's line chart: a straight polyline with its fill, the last point a blush dot (ref `spark`) */
