/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskDetail — the on-page capture surface for a board card (design ref:
 * design-refs/todo-workspace-v10.html). ONE component, two shells: the drawer (Phase 3, here) and
 * the walkthrough step (Phase 4) render the same body so the two views can't drift.
 *
 * The drawer WRITES IMMEDIATELY through the EXISTING paths (so query history is never invented):
 *   · mark-sent (partial/full/resubmit) → recordMaterialsSent (target from queryPrimaryAction)
 *   · nudge_overdue                     → logNudge  (draft is DISPLAY-ONLY — see the TODO below)
 *   · offer / record                    → the proven RecordResponseFocusForm
 *   · housekeeping                       → updateAgent / updateQueryStatus / dismissTask (in-drawer fix)
 *   · your task                          → updateUserTask / deleteUserTask
 *
 * Theme: rendered inside the F12 page — `.t-f12` tokens only. StatusDot consumed verbatim.
 */
import React, { useEffect, useMemo, useState } from "react";
import { StatusDot } from "../StatusDot";
import { RecordResponseFocusForm } from "../RecordResponseFocusForm";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { buildAgentTimeline } from "../../lib/agentsPage";
import { agentDataQualityNeeds } from "../../lib/agentDataQuality";
import { agentPrimary } from "../../lib/agentDisplay";
import { flagKeyForTask, MUTED_UNTIL } from "../../lib/taskFlags";
import { BoardCard } from "../../lib/todoBoard";
import { TaskCaptureForm } from "./TaskCaptureForm";
import { QueryStatus } from "../../types";

const localISODate = (): string => new Date().toISOString().slice(0, 10);

export interface TaskDetailProps {
  card: BoardCard;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ card, onClose, onPrev, onNext, onNavigate }) => {
  const { queries, agents, manuscripts, activities, recordMaterialsSent, logNudge, updateAgent, updateQueryStatus, dismissTask, updateUserTask, deleteUserTask, upsertTaskFlag, resolveTaskFlag } = useScriptAllyDb();

  const query = card.relatedRecordId ? queries.find((q) => q.id === card.relatedRecordId) : undefined;
  const agent = query ? agents.find((a) => a.id === query.agentId) : card.relatedRecordId ? agents.find((a) => a.id === card.relatedRecordId) : undefined;

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="tdb-scrim" onClick={onClose}>
      <div className="tdb-drawer" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="tdb-drawer-h">
          <div className="tdb-step-nav">
            <button type="button" className="tdb-drawer-x" disabled={!onPrev} onClick={onPrev} aria-label="Previous">‹</button>
            <button type="button" className="tdb-drawer-x" disabled={!onNext} onClick={onNext} aria-label="Next">›</button>
          </div>
          <span className="tdb-drawer-title">{card.title}</span>
          <button type="button" className="tdb-drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="tdb-drawer-body">
          {card.userTaskId
            ? <UserTaskBody card={card} onDone={onClose} update={updateUserTask} del={deleteUserTask} />
            : card.taskType === "data_quality_poor"
              ? <DataQualityBody card={card} agentId={card.relatedRecordId!} agent={agent} updateAgent={updateAgent} resolve={() => card.taskType && card.relatedRecordId && resolveTaskFlag(flagKeyForTask(card.taskType, card.relatedRecordId))} onDone={onClose} />
              : card.taskType === "no_response_close"
                ? <NoResponseBody card={card} query={query} updateQueryStatus={updateQueryStatus} dismiss={() => card.taskType && card.relatedRecordId && dismissTask(card.taskType, card.relatedRecordId, "fixed snooze", 14)} stopAsking={() => card.taskType && card.relatedRecordId && upsertTaskFlag(flagKeyForTask(card.taskType, card.relatedRecordId), { snoozedUntil: MUTED_UNTIL })} onDone={onClose} />
                : <DoNextBody card={card} query={query} agent={agent} agents={agents} queries={queries} manuscripts={manuscripts} activities={activities} recordMaterialsSent={recordMaterialsSent} logNudge={logNudge} onNavigate={onNavigate} onDone={onClose} />}
        </div>
      </div>
    </div>
  );
};

/* ── Do next: Why → Do it → Done. The Do-it capture is the SHARED TaskCaptureForm (write mode). ── */
const DoNextBody: React.FC<any> = ({ card, query, agent, queries, manuscripts, activities, onNavigate, onDone }) => {
  const [step, setStep] = useState<"why" | "doit" | "done">("why");
  const [recordOpen, setRecordOpen] = useState(false);
  const timeline = useMemo(() => (agent ? buildAgentTimeline(agent.id, queries, manuscripts, activities) : []), [agent, queries, manuscripts, activities]);

  if (recordOpen && query && agent) {
    const ms = manuscripts.find((m: any) => m.id === query.manuscriptId);
    return <RecordResponseFocusForm isOpen onClose={() => { setRecordOpen(false); onDone(); }} query={query} agent={agent} manuscript={{ title: ms?.title || "" }} onSuccessToast={() => { /* recorded via the proven path */ }} />;
  }

  return (
    <div className="tdb-dn">
      <div className="tdb-steprail">
        {(["why", "doit", "done"] as const).map((s) => <span key={s} className={`tdb-steppip${step === s ? " on" : ""}`}>{s === "why" ? "Why" : s === "doit" ? "Do it" : "Done"}</span>)}
      </div>

      {step === "why" && (
        <>
          <p className="tdb-why">{card.subtitle || card.title}</p>
          {timeline.length > 0 && (
            <div className="tdb-tl">
              {timeline.slice(0, 6).map((e: any) => (
                <div key={e.id} className="tdb-tlrow"><StatusDot status={e.status} overrideSize={16} /><span className="tdb-tllabel">{e.label}</span><span className="tdb-tldate">{e.dateLabel}</span></div>
              ))}
            </div>
          )}
          {query && <button type="button" className="tdb-link" onClick={() => onNavigate("queries", query.id)}>Open the full query →</button>}
          <div className="tdb-drawer-cmd"><button type="button" className="tdb-btn-pri" onClick={() => (card.taskType === "offer_received" ? setRecordOpen(true) : setStep("doit"))}>{card.taskType === "offer_received" ? "Record response" : "Do it →"}</button></div>
        </>
      )}

      {step === "doit" && query && (
        <TaskCaptureForm card={card} query={query} agent={agent} mode="write" onDone={() => setStep("done")} onBack={() => setStep("why")} />
      )}

      {step === "done" && (
        <div className="tdb-done"><div className="tdb-donebig">✓</div><p>Logged. It’s off your desk.</p><button type="button" className="tdb-btn-pri" onClick={onDone}>Close</button></div>
      )}
    </div>
  );
};

/* ── Housekeeping: data_quality_poor — fix in the drawer (no bounce to EditAgent) ── */
const DataQualityBody: React.FC<any> = ({ agent, updateAgent, resolve, onDone }) => {
  const needs: string[] = agent ? agentDataQualityNeeds(agent) : [];
  const [mswl, setMswl] = useState(agent?.mswlNotes ?? "");
  const [weeks, setWeeks] = useState<string>(agent?.responseTimeWeeks ? String(agent.responseTimeWeeks) : "");
  const [noMeansNo, setNoMeansNo] = useState<boolean>(!!agent?.noResponseMeansNo);
  const [mats, setMats] = useState<Record<string, boolean>>(Object.fromEntries((agent?.materialsWanted ?? []).map((m: string) => [m, true])));
  const matOpts = ["Query Letter", "Synopsis", "Sample Pages", "Full Manuscript"];

  async function save() {
    if (!agent) return;
    const fields: any = {};
    if (needs.includes("mswl")) fields.mswlNotes = mswl;
    if (needs.includes("responseTime") && weeks) { fields.responseTimeWeeks = Number(weeks); fields.noResponseMeansNo = noMeansNo; }
    if (needs.includes("materials")) fields.materialsWanted = matOpts.filter((m) => mats[m]);
    await updateAgent(agent.id, fields);
    resolve();
    onDone();
  }

  return (
    <div className="tdb-hkfix">
      <p className="tdb-why">Clean data is how ScriptAlly judges fit and checks your package. It’s worth most before you query.</p>
      {needs.includes("mswl") && <label className="tdb-fld"><span>Manuscript wish list</span><textarea value={mswl} onChange={(e) => setMswl(e.target.value)} placeholder="What are they looking for?" /></label>}
      {needs.includes("responseTime") && (
        <>
          <label className="tdb-fld"><span>Reply window (weeks)</span><input type="number" min={1} value={weeks} onChange={(e) => setWeeks(e.target.value)} /></label>
          <label className="tdb-tick"><input type="checkbox" checked={noMeansNo} onChange={(e) => setNoMeansNo(e.target.checked)} />No reply means no</label>
        </>
      )}
      {needs.includes("materials") && (
        <div className="tdb-fld"><span>Materials they want</span>
          <div className="tdb-ticks">{matOpts.map((m) => <label key={m} className="tdb-tick"><input type="checkbox" checked={!!mats[m]} onChange={(e) => setMats((p) => ({ ...p, [m]: e.target.checked }))} />{m}</label>)}</div>
        </div>
      )}
      <div className="tdb-drawer-cmd"><button type="button" className="tdb-btn-pri" onClick={save}>Save</button></div>
    </div>
  );
};

/* ── Housekeeping: no_response_close — the three-way ── */
const NoResponseBody: React.FC<any> = ({ query, updateQueryStatus, dismiss, stopAsking, onDone }) => (
  <div className="tdb-hkfix">
    <p className="tdb-why">No reply in a long time. Marking it as no response keeps your Responses figure honest — distinct from an explicit rejection.</p>
    <div className="tdb-threeway">
      <button type="button" className="tdb-btn-pri" onClick={async () => { if (query) await updateQueryStatus(query.id, QueryStatus.NO_RESPONSE, "Marked as no response from the To-do board"); onDone(); }}>Close as no response</button>
      <button type="button" className="tdb-btn-sec" onClick={() => { dismiss(); onDone(); }}>Still waiting</button>
      <button type="button" className="tdb-btn-sec" onClick={() => { stopAsking(); onDone(); }}>Stop asking</button>
    </div>
  </div>
);

/* ── Your task ── */
const UserTaskBody: React.FC<any> = ({ card, update, del, onDone }) => {
  const [text, setText] = useState(card.title === "New task" ? "" : card.title);
  return (
    <div className="tdb-usertask">
      <label className="tdb-fld"><span>Task</span><textarea value={text} onChange={(e) => setText(e.target.value)} /></label>
      {card.record && <div className="tdb-drawer-meta">{card.record}</div>}
      <div className="tdb-drawer-cmd">
        <button type="button" className="tdb-btn-sec" onClick={() => { del(card.userTaskId); onDone(); }}>Delete</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-btn-sec" onClick={() => { if (text.trim()) update(card.userTaskId, { text: text.trim() }); onDone(); }}>Save</button>
        <button type="button" className="tdb-btn-pri" onClick={() => { update(card.userTaskId, { done: true, completedAt: new Date().toISOString() }); onDone(); }}>Mark done</button>
      </div>
    </div>
  );
};

export default TaskDetail;
