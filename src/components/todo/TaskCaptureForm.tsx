/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskCaptureForm — the ONE mark-sent / nudge capture form, rendered by BOTH the drawer (write mode:
 * writes immediately through the proven handler) AND the walkthrough (stage mode: returns a payload,
 * nothing persists until Save). One form, two shells — so the drawer and walkthrough can't drift.
 *
 * mark-sent → recordMaterialsSent (target/isResubmit from queryPrimaryAction — the shared map).
 * nudge     → logNudge (draft is display-only via the shared nudgeDraft helper — never sent).
 */
import React, { useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { nudgeDraft } from "../../lib/nudgeDraft";
import { agentPrimary } from "../../lib/agentDisplay";
import { BoardCard } from "../../lib/todoBoard";
import { StagedPayload } from "../../lib/todoWalk";
import { Query, Agent, QueryStatus } from "../../types";

const todayISODate = (): string => new Date().toISOString().slice(0, 10);
const plusDaysISODate = (n: number): string => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export interface TaskCaptureFormProps {
  card: BoardCard;
  query: Query;
  agent?: Agent;
  mode: "write" | "stage";
  onStage?: (p: StagedPayload) => void; // stage mode
  onDone?: () => void; // called after a write (write mode) or after staging (stage mode)
  onBack?: () => void;
}

export const TaskCaptureForm: React.FC<TaskCaptureFormProps> = ({ card, query, agent, mode, onStage, onDone, onBack }) => {
  const { recordMaterialsSent, logNudge } = useScriptAllyDb();
  const isNudge = card.taskType === "nudge_overdue";
  const action = getPrimaryAction(query.status as QueryStatus);
  const isMarkSent = action.kind === "mark-sent";

  // mark-sent state
  const [sentDate, setSentDate] = useState(todayISODate());
  const [method, setMethod] = useState("Email");
  const [materials, setMaterials] = useState<Record<string, boolean>>({});
  const materialOpts = card.taskType === "partial_requested" ? ["First pages", "Synopsis", "Covering email"]
    : card.taskType === "revise_resubmit" ? ["Revised manuscript", "Revision letter"]
      : ["Full manuscript", "Synopsis", "Covering email"];
  const anyTicked = Object.values(materials).some(Boolean);

  // nudge state
  const [checkBack, setCheckBack] = useState(plusDaysISODate(14));
  const [note, setNote] = useState("");
  const draft = nudgeDraft({ agentName: agent ? agentPrimary(agent) : null, dateSent: query.dateSent });

  async function saveMarkSent() {
    if (action.kind !== "mark-sent") return;
    const target = action.target as QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT;
    const isResubmit = action.markKind === "resubmit";
    if (mode === "stage") {
      onStage?.({ kind: "mark-sent", cardKey: card.key, queryId: query.id, targetStatus: target, sentDate: new Date(sentDate).toISOString(), isResubmit });
    } else {
      await recordMaterialsSent({ queryId: query.id, targetStatus: target, sentDate: new Date(sentDate).toISOString(), isResubmit });
    }
    onDone?.();
  }
  async function saveNudge() {
    if (mode === "stage") {
      onStage?.({ kind: "nudge", cardKey: card.key, queryId: query.id, checkBackDate: new Date(checkBack).toISOString(), note: note || undefined });
    } else {
      await logNudge(query.id, { checkBackDate: new Date(checkBack).toISOString(), note: note || undefined });
    }
    onDone?.();
  }

  if (isNudge || !isMarkSent) {
    // nudge (and any non-mark-sent that reaches here — only nudge does in practice)
    return (
      <>
        <div className="tdb-nudgenote">ScriptAlly never sends anything for you. Copy this, send it yourself, then log it below.</div>
        <div className="tdb-draft">{draft}<button type="button" className="tdb-copy" onClick={() => navigator.clipboard?.writeText(draft)}>Copy</button></div>
        <label className="tdb-fld"><span>Check back on</span><input type="date" value={checkBack} onChange={(e) => setCheckBack(e.target.value)} /></label>
        <label className="tdb-fld"><span>Note (optional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="tdb-drawer-cmd">
          {onBack && <button type="button" className="tdb-btn-sec" onClick={onBack}>← Back</button>}
          <button type="button" className="tdb-btn-pri" onClick={saveNudge}>{mode === "stage" ? "Stage nudge →" : "Log the nudge"}</button>
        </div>
      </>
    );
  }

  return (
    <>
      <label className="tdb-fld"><span>Date sent</span><input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} /></label>
      <label className="tdb-fld"><span>Method</span>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>{["Email", "QueryManager", "Post", "Other"].map((m) => <option key={m}>{m}</option>)}</select>
      </label>
      <div className="tdb-fld"><span>What you sent</span>
        <div className="tdb-ticks">{materialOpts.map((m) => (
          <label key={m} className="tdb-tick"><input type="checkbox" checked={!!materials[m]} onChange={(e) => setMaterials((prev) => ({ ...prev, [m]: e.target.checked }))} />{m}</label>
        ))}</div>
      </div>
      <label className="tdb-fld"><span>Note (optional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="tdb-drawer-cmd">
        {onBack && <button type="button" className="tdb-btn-sec" onClick={onBack}>← Back</button>}
        <button type="button" className="tdb-btn-pri" disabled={!anyTicked} onClick={saveMarkSent}>{mode === "stage" ? "Stage →" : "Mark sent"}</button>
      </div>
    </>
  );
};

export default TaskCaptureForm;
