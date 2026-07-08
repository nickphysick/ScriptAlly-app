/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToDoPage — the "To-do" workspace under the Querying parent (design ref:
 * design-refs/todo-desk-to-ledger.html). It opens in a "Clear the Desk" focus ritual for the
 * urgent (writer's-turn) items and falls through to "the Ledger" — a two-pane workspace over
 * three streams (Do next · Housekeeping · Notes).
 *
 * SCOPE SO FAR:
 *   Prompt 1 — themed shell (masthead + Ledger skeleton + mode switch).
 *   Prompt 2 — the Clear-the-Desk focus flow.
 *   Prompt 3 (this commit) — the Ledger's two DERIVED streams: Do next (offer/partial/full/rr/nudge)
 *     and Housekeeping (data_quality_poor → Edit Agent drawer, no_response_close → CNR / Still
 *     waiting), a list (furniture) + working pane (document, footer-closed) whose command bar is
 *     the SOLE action home. Every action routes through the shared status→action map
 *     (queryPrimaryAction / todoLedger) so the Ledger pane and the focus card can't drift.
 *   Prompt 4 — the Notes store (the segment is present but disabled until then).
 *
 * THEMES come from the Queries-Hub layer; every surface reads a --hub-* token. Locked components are
 * imported, never recreated. Layout follows THE DESK RULE (list fills; pane clamps, footer-closed).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { HubHeaderBar } from "../shell/HubHeaderBar";
import { StatusDot } from "../StatusDot";
import { MarkSentPopover } from "../MarkSentPopover";
import { RecordResponseFocusForm } from "../RecordResponseFocusForm";
import { NudgeModal } from "../NudgeModal";
import { useFixedMenu } from "../forms/useFixedMenu";
import { useOpenEditAgent } from "../EditAgentHost";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { focusQueue, shouldOpenFocus } from "../../lib/todoFocus";
import { doNextTasks, housekeepingTasks, ledgerCommandActions, LedgerActionId } from "../../lib/todoLedger";
import { queryAmbientStatus } from "../../lib/queryAmbient";
import { agentDataQualityNeeds } from "../../lib/agentDataQuality";
import { agentPrimary } from "../../lib/agentDisplay";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";
import { QueryStatus, Task, Query, Agent } from "../../types";
import "./todo.css";

type Mode = "focus" | "ledger";
type Stream = "all" | "do" | "hk" | "note";

/** Tunable document floor for the working pane (mirrors the mockup's .pane min-height). */
const TODO_PANE_FLOOR_PX = 430;
/** Ritual + deferral snooze is fixed at 7 days — speed is the point (finer control lands later). */
const FOCUS_SNOOZE_DAYS = 7;

const Quill: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--hub-label)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 4c-6 1-11 6-13 12l-2 4 4-2c6-2 11-7 12-13z" />
    <path d="M14 7l3 3" />
  </svg>
);
const Clock: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" />
  </svg>
);
/** Housekeeping glyph — the one Do-next/HK item with no query status (data_quality_poor). */
const Wrench: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--hub-label)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 4l6 6" /><path d="M11 7l6 6" /><path d="M4 20l6-9 3 3-9 6z" />
  </svg>
);

function focusVerb(markKind: "partial" | "full" | "resubmit"): string {
  return markKind === "partial" ? "Send your partial" : markKind === "full" ? "Send your full" : "Resubmit your revision";
}

export interface ToDoPageProps {
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
}

export const ToDoPage: React.FC<ToDoPageProps> = () => {
  const { tasks, queries, agents, manuscripts, currentUser, dismissTask, updateUserProfile, recordMaterialsSent, updateQueryStatus, logNudge } = useScriptAllyDb();
  const openEditAgent = useOpenEditAgent();

  const location = useLocation();
  const onTodo = (location.pathname.replace(/\/+$/, "") || "/") === "/todo";

  const [mode, setMode] = useState<Mode>("ledger");
  const [stream, setStream] = useState<Stream>("all");
  const [selId, setSelId] = useState<string | null>(null);
  // Session-only ritual state (never stored).
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [resolved, setResolved] = useState<Set<string>>(() => new Set());
  const [cleared, setCleared] = useState(0);
  const [focusTotal, setFocusTotal] = useState(0);

  const [isMarkSentOpen, setIsMarkSentOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);
  const { triggerRef: doItRef, menuStyle: markSentMenuStyle } = useFixedMenu<HTMLButtonElement>(isMarkSentOpen, { placement: "up" });

  // ── Derived streams ──
  const doNext = useMemo(() => doNextTasks(tasks, queries), [tasks, queries]);
  const housekeeping = useMemo(() => housekeepingTasks(tasks), [tasks]);
  const counts = { all: doNext.length + housekeeping.length, do: doNext.length, hk: housekeeping.length, note: 0 };

  const groups = useMemo<{ key: Exclude<Stream, "all">; label: string; items: Task[] }[]>(() => {
    if (stream === "do") return [{ key: "do", label: "Do next", items: doNext }];
    if (stream === "hk") return [{ key: "hk", label: "Housekeeping", items: housekeeping }];
    if (stream === "note") return [];
    return [
      { key: "do", label: "Do next", items: doNext },
      { key: "hk", label: "Housekeeping", items: housekeeping },
    ];
  }, [stream, doNext, housekeeping]);
  const flatVisible = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Keep the Ledger selection valid — default to the first visible item.
  useEffect(() => {
    if (mode !== "ledger") return;
    if (!selId || !flatVisible.some((t) => t.id === selId)) setSelId(flatVisible[0]?.id ?? null);
  }, [mode, flatVisible, selId]);

  // ── Focus queue ──
  const queue = useMemo(() => focusQueue(tasks, queries, skipped).filter((t) => !resolved.has(t.id)), [tasks, queries, skipped, resolved]);
  const pendingFocus = useMemo(() => focusQueue(tasks, queries, new Set()).length, [tasks, queries]);

  // Entry cadence: decide focus vs ledger when the page is entered (pathname → /todo).
  const prevOnTodo = useRef(false);
  const stampedRef = useRef(false);
  useEffect(() => {
    const entering = onTodo && !prevOnTodo.current;
    prevOnTodo.current = onTodo;
    if (!entering || !currentUser) return;
    const initial = focusQueue(tasks, queries, new Set());
    if (shouldOpenFocus({ queue: initial, queries, todoLastFocusedAt: currentUser.todoLastFocusedAt })) startRitual(initial.length);
    else setMode("ledger");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTodo, currentUser, tasks, queries]);

  function startRitual(total: number) {
    setSkipped(new Set());
    setResolved(new Set());
    setCleared(0);
    setFocusTotal(total);
    stampedRef.current = false;
    setMode("focus");
  }
  function stampFocus() {
    if (stampedRef.current || !currentUser) return;
    stampedRef.current = true;
    updateUserProfile({ todoLastFocusedAt: new Date().toISOString() }).catch(() => {});
  }
  function leaveToLedger() {
    stampFocus();
    setStream("all");
    setMode("ledger");
  }
  useEffect(() => {
    if (mode === "focus" && queue.length === 0) stampFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, queue.length]);

  // ── The shared action target: the focus item in focus mode, the selection in the Ledger. ──
  const actionTask: Task | undefined = mode === "focus" ? queue[0] : flatVisible.find((t) => t.id === selId);
  const actionQuery: Query | undefined = actionTask ? queries.find((q) => q.id === actionTask.relatedRecordId) : undefined;
  const actionAgent: Agent | undefined = actionQuery
    ? agents.find((a) => a.id === actionQuery.agentId)
    : actionTask?.taskType === "data_quality_poor"
      ? agents.find((a) => a.id === actionTask.relatedRecordId)
      : undefined;
  const actionMs = actionQuery ? manuscripts.find((m) => m.id === actionQuery.manuscriptId) : undefined;

  // A genuine completion — counts toward "cleared today"; advances the focus queue or drops the
  // Ledger selection (the recompute removes the resolved row).
  function onCleared(t: Task) {
    setCleared((c) => c + 1);
    if (mode === "focus") setResolved((prev) => new Set(prev).add(t.id));
    else setSelId(null);
    setIsMarkSentOpen(false);
    setIsRecordOpen(false);
    setIsNudgeOpen(false);
  }
  // A deferral (snooze / still-waiting) — leaves the queue but does NOT count as cleared.
  function onDeferred(t: Task) {
    dismissTask(t.taskType, t.relatedRecordId, "fixed snooze", FOCUS_SNOOZE_DAYS).catch(() => {});
    if (mode === "focus") setResolved((prev) => new Set(prev).add(t.id));
    else setSelId(null);
    setIsMarkSentOpen(false);
    setIsNudgeOpen(false);
  }
  function doSkip(t: Task) {
    setSkipped((prev) => new Set(prev).add(t.id));
    setIsMarkSentOpen(false);
  }

  // Dispatch a command-bar action. mark-sent/record/nudge open the shared surfaces (anchored/mounted
  // once); edit-agent/cnr/still-waiting/snooze act directly through the existing db paths.
  function runAction(id: LedgerActionId, t: Task, q?: Query) {
    switch (id) {
      case "mark-sent": setIsMarkSentOpen(true); break;
      case "record": setIsRecordOpen(true); break;
      case "nudge": setIsNudgeOpen(true); break;
      case "edit-agent": openEditAgent(t.relatedRecordId, { fromTask: true }); break;
      case "cnr":
        if (q) updateQueryStatus(q.id, QueryStatus.NO_RESPONSE, "Marked as no response from the To-do list").then(() => onCleared(t)).catch(() => {});
        break;
      case "still-waiting":
      case "snooze":
        onDeferred(t);
        break;
    }
  }

  // Keyboard (focus only): Enter = do · S = snooze · → = skip. Inert while a popover/editable is active.
  useEffect(() => {
    if (mode !== "focus" || !queue[0] || isMarkSentOpen || isRecordOpen) return;
    const cur = queue[0];
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "Enter") { e.preventDefault(); setIsMarkSentOpen(true); }
      else if (e.key.toLowerCase() === "s") { e.preventDefault(); onDeferred(cur); }
      else if (e.key === "ArrowRight") { e.preventDefault(); doSkip(cur); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, queue, isMarkSentOpen, isRecordOpen]);

  // ── Render ──
  const masthead =
    mode === "focus" ? (
      <HubHeaderBar
        title="Clear the Desk"
        subtitle="The pressing items, one at a time"
        style={{ padding: "24px 28px", margin: "12px 0 16px", boxShadow: "0 8px 20px rgba(29,23,18,.14)" }}
        titleStyle={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 40, color: "var(--hub-head, #1d1712)" }}
      />
    ) : (
      <HubHeaderBar
        title="To-do List"
        subtitle="Your writing desk"
        style={{ padding: "24px 28px", margin: "12px 0 16px", boxShadow: "0 8px 20px rgba(29,23,18,.14)" }}
        titleStyle={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 40, color: "var(--hub-head, #1d1712)" }}
        right={pendingFocus > 0 ? (
          <button type="button" className="todo-reenter" onClick={() => startRitual(pendingFocus)} style={{ fontFamily: FONT_MONO }}>✦ Clear the desk</button>
        ) : undefined}
      />
    );

  return (
    <div className="todo-root" style={{ height: "100%", display: "flex", flexDirection: "column", minWidth: 0, background: "var(--hub-desk)", padding: "6px 28px 26px" }}>
      {masthead}
      {mode === "focus" ? renderFocus() : renderLedger()}

      {/* Shared Mark-Sent popover — anchored to whichever "Do it"/command button is live (focus XOR
          ledger). Only onSave success advances/clears; closing it is never progress. */}
      <AnimatePresence>
        {isMarkSentOpen && actionTask && actionQuery && actionAgent && (() => {
          const a2 = getPrimaryAction(actionQuery.status as QueryStatus);
          if (a2.kind !== "mark-sent") return null;
          const item = actionTask;
          return (
            <MarkSentPopover
              key="todo-mark-sent"
              style={markSentMenuStyle}
              kind={a2.markKind}
              query={actionQuery as Query & { materialsRequestedType?: string; materialsRequestedQuantity?: string }}
              agent={actionAgent}
              triggerRef={doItRef}
              onClose={() => setIsMarkSentOpen(false)}
              onRecordResponseInstead={() => { setIsMarkSentOpen(false); setIsRecordOpen(true); }}
              onSave={async ({ sentDate, responseDeadline, nudgeDate }) => {
                await recordMaterialsSent({
                  queryId: actionQuery.id,
                  targetStatus: a2.target as QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT,
                  sentDate,
                  isResubmit: a2.markKind === "resubmit",
                  responseDeadline,
                  nudgeDate,
                });
                onCleared(item);
              }}
            />
          );
        })()}
      </AnimatePresence>

      {/* Shared Record-response focus form — the Offer action + the "agent actually responded" escape. */}
      {isRecordOpen && actionTask && actionQuery && actionAgent && (
        <RecordResponseFocusForm
          key={actionQuery.id}
          isOpen={isRecordOpen}
          onClose={() => setIsRecordOpen(false)}
          query={actionQuery}
          agent={actionAgent}
          manuscript={{ title: actionMs?.title || "" }}
          onSuccessToast={() => onCleared(actionTask)}
        />
      )}

      {/* Shared Nudge modal — the nudge_overdue action (reused from the dashboard flow). */}
      {isNudgeOpen && actionTask && actionQuery && actionAgent && (
        <NudgeModal
          agentName={agentPrimary(actionAgent)}
          agency={actionAgent.name?.trim() ? actionAgent.agency || "" : ""}
          dateSent={actionQuery.dateSent}
          responseDeadline={actionQuery.responseDeadline}
          onClose={() => setIsNudgeOpen(false)}
          onConfirm={async ({ checkBackDate, note }) => {
            await logNudge(actionQuery.id, { checkBackDate, note });
            onCleared(actionTask);
          }}
          onCloseInstead={() => { setIsNudgeOpen(false); setIsRecordOpen(true); }}
        />
      )}
    </div>
  );

  // ── Focus (Clear the Desk) ──
  function renderFocus() {
    const current = queue[0];
    const q = current ? queries.find((x) => x.id === current.relatedRecordId) : undefined;
    const ag = q ? agents.find((a) => a.id === q.agentId) : undefined;
    const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;

    if (!current || !q || !ag) {
      return (
        <div className="todo-focuswrap">
          <div className="todo-fdone">
            <Quill />
            <h2 style={{ fontFamily: FONT_SERIF }}>{cleared ? "Desk cleared." : "Nothing pressing."}</h2>
            <p style={{ fontFamily: FONT_MONO }}>{cleared ? `${cleared} urgent item${cleared === 1 ? "" : "s"} done today` : "no items need you right now"}</p>
            <button type="button" className="todo-primary" onClick={leaveToLedger} style={{ fontFamily: FONT_SERIF }}>Go to your list →</button>
          </div>
        </div>
      );
    }

    const action = getPrimaryAction(q.status as QueryStatus);
    const markKind = action.kind === "mark-sent" ? action.markKind : "partial";
    const ambient = queryAmbientStatus(q, "writer", markKind);
    const done = Math.max(0, focusTotal - queue.length);
    const pct = focusTotal > 0 ? Math.round((done / focusTotal) * 100) : 0;
    const daysAgo = ambient.writerDaysAgo;
    const chip = `${ambient.eventLabel}${daysAgo != null ? ` · ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago` : ""}`;

    return (
      <div className="todo-focuswrap">
        <button type="button" className="todo-skiplist" onClick={leaveToLedger} style={{ fontFamily: FONT_MONO }}>Skip to the list →</button>
        <div className="todo-fcount" style={{ fontFamily: FONT_MONO }}>{done + 1} of {focusTotal} &nbsp;·&nbsp; {cleared} cleared today</div>
        <div className="todo-fmeter"><i style={{ width: `${pct}%` }} /></div>
        <div className="todo-fcard">
          <div className="todo-ptag">
            <StatusDot status={q.status as QueryStatus} overrideSize={20} />
            <span style={{ fontFamily: FONT_MONO }}>Do next · your move</span>
          </div>
          <div className="todo-fbig" style={{ fontFamily: FONT_SERIF }}>
            {focusVerb(markKind)} to <span className="w">{agentPrimary(ag)}</span>
          </div>
          <div className="todo-fsub">
            {agentPrimary(ag)} requested {markKind === "resubmit" ? "a revise & resubmit" : `your ${markKind}`} of{" "}
            <b>“{ms?.title || "your manuscript"}”</b>. It’s your move — {action.label.toLowerCase()}.
          </div>
          <div className="todo-dline" style={{ fontFamily: FONT_MONO }}><Clock /> {chip}</div>
          <div className="todo-factions">
            <button type="button" className="todo-fbtn g" onClick={() => onDeferred(current)} style={{ fontFamily: FONT_MONO }}>Snooze</button>
            <button ref={doItRef} type="button" className="todo-fbtn p" onClick={() => setIsMarkSentOpen(true)} style={{ fontFamily: FONT_SERIF }}>{action.label} →</button>
            <button type="button" className="todo-fbtn g" onClick={() => doSkip(current)} style={{ fontFamily: FONT_MONO }}>Skip</button>
          </div>
          <div className="todo-fkey" style={{ fontFamily: FONT_MONO }}>Enter — do it &nbsp;·&nbsp; S — snooze &nbsp;·&nbsp; → — skip</div>
        </div>
      </div>
    );
  }

  // ── Ledger ──
  function renderLedger() {
    const seg = (key: Stream, label: string, n: number, disabled?: boolean) => {
      const on = stream === key;
      return (
        <button
          key={key}
          type="button"
          className="todo-seg"
          disabled={disabled}
          onClick={() => !disabled && setStream(key)}
          style={{ fontFamily: FONT_MONO, background: on ? "var(--hub-toggle-on)" : "transparent", color: on ? "var(--hub-toggle-on-tx)" : "var(--hub-item)", opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
        >
          {label} <span className="todo-seg-n">{n}</span>
        </button>
      );
    };

    return (
      <>
        <div className="todo-filter">
          <span className="todo-segl" style={{ fontFamily: FONT_MONO, color: "var(--hub-label)" }}>Show</span>
          <div className="todo-segs" style={{ background: "var(--hub-list)", border: "var(--bdw) solid var(--bd)" }}>
            {seg("all", "All", counts.all)}
            {seg("do", "Do next", counts.do)}
            {seg("hk", "Housekeeping", counts.hk)}
            {seg("note", "Notes", counts.note, true)}
          </div>
          <div className="todo-sort" style={{ fontFamily: FONT_MONO, background: "var(--hub-list)", border: "var(--bdw) solid var(--bd)", color: "var(--hub-item)" }}>Sort · Due date ▾</div>
        </div>

        <div className="todo-ledger">
          {/* LIST — furniture */}
          <div className="todo-list" style={{ background: "var(--hub-list)", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--hub-radius)" }}>
            <div className="todo-list-scroll">
              {flatVisible.length === 0 ? (
                <div className="todo-list-empty" style={{ fontFamily: FONT_MONO, color: "var(--hub-label)" }}>This stream is clear.</div>
              ) : (
                groups.map((g) =>
                  g.items.length === 0 ? null : (
                    <div key={g.key}>
                      {stream === "all" && (
                        <div className="todo-grp" style={{ fontFamily: FONT_MONO, color: "var(--hub-label)" }}>{g.label}<span className="todo-gl" /></div>
                      )}
                      {g.items.map((t) => renderRow(t))}
                    </div>
                  ),
                )
              )}
            </div>
          </div>

          {/* PANE — document, footer-closed */}
          {renderPane()}
        </div>
      </>
    );
  }

  function renderRow(t: Task) {
    const q = queries.find((x) => x.id === t.relatedRecordId);
    const ag = q ? agents.find((a) => a.id === q.agentId) : t.taskType === "data_quality_poor" ? agents.find((a) => a.id === t.relatedRecordId) : undefined;
    const name = ag ? agentPrimary(ag) : "an agent";
    const sel = t.id === selId;
    const isSkipped = skipped.has(t.id);
    return (
      <button key={t.id} type="button" className={`todo-lrow${sel ? " sel" : ""}`} onClick={() => setSelId(t.id)}>
        <span className="todo-lrow-glyph">{q ? <StatusDot status={q.status as QueryStatus} overrideSize={20} /> : <Wrench />}</span>
        <span className="todo-lrow-mid">
          <span className="todo-lh" style={{ fontFamily: FONT_SERIF }}>{rowHeadline(t, name)}{isSkipped && <span className="todo-skipbadge" style={{ fontFamily: FONT_MONO }}>skipped</span>}</span>
          <span className="todo-lc" style={{ fontFamily: FONT_MONO }}>{rowCaption(t, q, ag)}</span>
        </span>
      </button>
    );
  }

  function rowHeadline(t: Task, name: string): React.ReactNode {
    const who = <span className="w">{name}</span>;
    switch (t.taskType) {
      case "offer_received": return <>Offer from {who}</>;
      case "partial_requested": return <>Send your partial to {who}</>;
      case "full_requested": return <>Send your full to {who}</>;
      case "revise_resubmit": return <>Resubmit your revision to {who}</>;
      case "nudge_overdue": return <>Nudge {who}</>;
      case "data_quality_poor": return <>Complete {who}’s details</>;
      case "no_response_close": return <>{who} — still no reply</>;
      default: return t.title;
    }
  }

  function rowCaption(t: Task, q?: Query, ag?: Agent): string {
    if (t.taskType === "offer_received") return "OFFER ON THE TABLE";
    if (t.taskType === "data_quality_poor") return "AGENT DETAILS INCOMPLETE";
    if (!q) return "";
    if (t.taskType === "nudge_overdue" || t.taskType === "no_response_close") {
      const a = queryAmbientStatus(q, "agent", undefined);
      return a.sentMs == null ? "WAITING TO HEAR BACK" : `WAITING · ${a.nDays} DAY${a.nDays === 1 ? "" : "S"}`;
    }
    // writer's-turn
    const pa = getPrimaryAction(q.status as QueryStatus);
    const mk = pa.kind === "mark-sent" ? pa.markKind : "partial";
    const a = queryAmbientStatus(q, "writer", mk);
    return `${a.eventLabel}${a.writerDaysAgo != null ? ` · ${a.writerDaysAgo} DAY${a.writerDaysAgo === 1 ? "" : "S"} AGO` : ""}`.toUpperCase();
  }

  // The working pane reshapes per selected item; ALL action controls live in the command bar.
  function renderPane() {
    const t = actionTask && mode === "ledger" ? actionTask : undefined;
    const q = t ? actionQuery : undefined;
    const ag = t ? actionAgent : undefined;
    const ms = t ? actionMs : undefined;

    if (!t) {
      return (
        <div className="todo-pane" style={paneStyle}>
          <div className="todo-pane-inner">
            <div className="todo-pane-body"><Quill /><div className="todo-pane-empty" style={{ fontFamily: FONT_SERIF, color: "var(--hub-label)" }}>Your desk is clear.</div></div>
          </div>
        </div>
      );
    }

    const actions = ledgerCommandActions(t, q);
    const isHk = t.taskType === "data_quality_poor" || t.taskType === "no_response_close";
    const name = ag ? agentPrimary(ag) : "an agent";

    return (
      <div className="todo-pane" style={paneStyle}>
        <div className="todo-pane-inner">
          <div className="todo-pane-scroll">
            <div className={`todo-ptag${isHk ? " hk" : ""}`} style={{ fontFamily: FONT_MONO }}>{isHk ? "Housekeeping" : "Do next · your move"}</div>
            <div className="todo-ptitle" style={{ fontFamily: FONT_SERIF }}>{rowHeadline(t, name)}</div>
            <div className="todo-pctx">{paneBody(t, q, ag, ms)}</div>
          </div>
          <div className="todo-cmd">
            {actions.map((a) => (
              <button
                key={a.id}
                ref={a.id === "mark-sent" ? doItRef : undefined}
                type="button"
                className={`todo-cmdbtn ${a.variant === "primary" ? "p" : "g"}`}
                onClick={() => runAction(a.id, t, q)}
                style={{ fontFamily: FONT_MONO }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function paneBody(t: Task, q?: Query, ag?: Agent, ms?: { title?: string }): React.ReactNode {
    const name = ag ? agentPrimary(ag) : "the agent";
    const title = ms?.title ? `“${ms.title}”` : "your manuscript";
    switch (t.taskType) {
      case "offer_received":
        return <>{name} has made an offer on {title}. When you’re ready, record the response here — the bigger offer-decision flow (notifying other agents, deadlines) lives elsewhere.</>;
      case "partial_requested":
        return <>{name} asked for a partial of {title}. Status is <b>Partial Requested</b> — over to you; mark it sent once it’s away.</>;
      case "full_requested":
        return <>{name} requested the full of {title}. Status is <b>Full Requested</b> — send the manuscript, then mark it sent.</>;
      case "revise_resubmit":
        return <>{name} invited a revise & resubmit on {title}. When your revision’s ready, record the resubmission.</>;
      case "nudge_overdue":
        return <>You’ve heard nothing back from {name} on {title}. Send a polite nudge, or snooze this if you’d rather wait.</>;
      case "data_quality_poor": {
        const needs = ag ? agentDataQualityNeeds(ag) : [];
        const labels = needs.map((n) => (n === "mswl" ? "manuscript wish list" : n === "materials" ? "materials wanted" : "response time")).join(", ");
        return <>{name}’s profile is missing {labels || "some details"}. Clean data powers your query forms and completeness reads — editing opens the agent drawer with the gaps highlighted.</>;
      }
      case "no_response_close": {
        const a = q ? queryAmbientStatus(q, "agent", undefined) : null;
        const days = a?.sentMs != null ? `${a.nDays} days` : "a long time";
        return <>You sent this to {name} {days} ago with no reply. Marking it as no response keeps your Responses figure honest — distinct from an explicit rejection — or keep waiting.</>;
      }
      default:
        return t.description;
    }
  }
};

const paneStyle: React.CSSProperties = {
  background: "var(--hub-pane-process)",
  border: "var(--bdw) solid var(--hub-pane-bd)",
  borderRadius: "var(--hub-radius)",
  minHeight: TODO_PANE_FLOOR_PX,
};

export default ToDoPage;
