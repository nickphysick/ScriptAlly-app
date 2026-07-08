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
 *   Prompt 1 — themed shell (masthead + empty Ledger skeleton + mode switch).
 *   Prompt 2 (this commit) — the Clear-the-Desk focus flow: a one-at-a-time queue of the
 *     writer's-turn mark-sent items (Offer excluded), hosting the REAL MarkSentPopover /
 *     RecordResponseFocusForm inline on the card, success-only advance, snooze (fixed 7d) + skip,
 *     progress, entry cadence + write-on-exit stamp, and a masthead re-entry control.
 *   Prompt 3/4 — the Ledger's derived streams + the Notes store.
 *
 * THEMES come from the Queries-Hub layer (the AppShell root carries .t-capp/.t-bold/.t-edn); every
 * surface reads a --hub-* token — no new theme module, no hardcoded values. Locked components are
 * imported, never recreated (StatusDot, HubHeaderBar, MarkSentPopover, RecordResponseFocusForm).
 *
 * Layout follows THE DESK RULE (list = furniture, working pane = document, footer-closed).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { HubHeaderBar } from "../shell/HubHeaderBar";
import { StatusDot } from "../StatusDot";
import { MarkSentPopover } from "../MarkSentPopover";
import { RecordResponseFocusForm } from "../RecordResponseFocusForm";
import { useFixedMenu } from "../forms/useFixedMenu";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { focusQueue, shouldOpenFocus } from "../../lib/todoFocus";
import { queryAmbientStatus } from "../../lib/queryAmbient";
import { agentPrimary } from "../../lib/agentDisplay";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";
import { QueryStatus, Task, Query } from "../../types";
import "./todo.css";

type Mode = "focus" | "ledger";
type Stream = "all" | "do" | "hk" | "note";

/** Tunable document floor for the working pane (mirrors the mockup's .pane min-height). */
const TODO_PANE_FLOOR_PX = 430;
/** Ritual snooze is fixed at 7 days — speed is the point; the Ledger pane offers finer control later. */
const FOCUS_SNOOZE_DAYS = 7;

const STREAM_SEGS: { key: Stream; label: string }[] = [
  { key: "all", label: "All" },
  { key: "do", label: "Do next" },
  { key: "hk", label: "Housekeeping" },
  { key: "note", label: "Notes" },
];

/** A small quill, matching the mockup's empty-desk motif. */
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

/** Verb phrase for the focus card title, by writer's-turn kind. */
function focusVerb(markKind: "partial" | "full" | "resubmit"): string {
  return markKind === "partial" ? "Send your partial" : markKind === "full" ? "Send your full" : "Resubmit your revision";
}

export interface ToDoPageProps {
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
}

export const ToDoPage: React.FC<ToDoPageProps> = () => {
  const { tasks, queries, agents, manuscripts, currentUser, dismissTask, updateUserProfile, recordMaterialsSent } = useScriptAllyDb();

  const location = useLocation();
  const onTodo = (location.pathname.replace(/\/+$/, "") || "/") === "/todo";

  const [mode, setMode] = useState<Mode>("ledger");
  const [stream, setStream] = useState<Stream>("all");
  // Session-only ritual state (never stored): skipped stays outstanding, resolved (done/snoozed)
  // leaves the queue, cleared counts completions, focusTotal fixes the progress denominator.
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [resolved, setResolved] = useState<Set<string>>(() => new Set());
  const [cleared, setCleared] = useState(0);
  const [focusTotal, setFocusTotal] = useState(0);

  const [isMarkSentOpen, setIsMarkSentOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const { triggerRef: doItRef, menuStyle: markSentMenuStyle } = useFixedMenu<HTMLButtonElement>(isMarkSentOpen, { placement: "up" });

  // The live focus queue: the pure derivation minus items resolved this session.
  const queue = useMemo(
    () => focusQueue(tasks, queries, skipped).filter((t) => !resolved.has(t.id)),
    [tasks, queries, skipped, resolved],
  );
  // Whether a ritual is worth re-entering (over ALL urgent items, ignoring session skips/resolves).
  const pendingFocus = useMemo(() => focusQueue(tasks, queries, new Set()).length, [tasks, queries]);

  // ── Entry cadence: on ENTERING the page (pathname → /todo), decide focus vs ledger afresh. ──
  const prevOnTodo = useRef(false);
  const stampedRef = useRef(false); // one write-on-exit per ritual
  useEffect(() => {
    const entering = onTodo && !prevOnTodo.current;
    prevOnTodo.current = onTodo;
    if (!entering || !currentUser) return;
    const initial = focusQueue(tasks, queries, new Set());
    const open = shouldOpenFocus({ queue: initial, queries, todoLastFocusedAt: currentUser.todoLastFocusedAt });
    if (open) startRitual(initial.length);
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

  // Write-on-exit cadence stamp (the ONLY writer/reader of todoLastFocusedAt). Denied gracefully
  // until the firestore.rules allowlist edit deploys — nothing else depends on it.
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
  // Ritual completes when the queue empties in focus → stamp the cadence.
  useEffect(() => {
    if (mode === "focus" && queue.length === 0) stampFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, queue.length]);

  // ── Current focus item + its records ──
  const current = queue[0];
  const currentQuery = current ? queries.find((q) => q.id === current.relatedRecordId) : undefined;
  const currentAgent = currentQuery ? agents.find((a) => a.id === currentQuery.agentId) : undefined;
  const currentMs = currentQuery ? manuscripts.find((m) => m.id === currentQuery.manuscriptId) : undefined;

  function advance(t: Task, opts: { cleared?: boolean }) {
    setResolved((prev) => new Set(prev).add(t.id));
    if (opts.cleared) setCleared((c) => c + 1);
    setIsMarkSentOpen(false);
    setIsRecordOpen(false);
  }
  function doSnooze(t: Task) {
    // Reuse the Next Up snooze suppression — item leaves the queue but does NOT count as cleared.
    dismissTask(t.taskType, t.relatedRecordId, "fixed snooze", FOCUS_SNOOZE_DAYS).catch(() => {});
    advance(t, {});
  }
  function doSkip(t: Task) {
    // Session-only: the item stays outstanding (it will surface in the Ledger tagged "skipped").
    setSkipped((prev) => new Set(prev).add(t.id));
    setIsMarkSentOpen(false);
  }

  // Keyboard: Enter = do it (opens the popover) · S = snooze · → = skip. Inert while a popover is
  // open or an editable is focused (app convention).
  useEffect(() => {
    if (mode !== "focus" || !current || isMarkSentOpen || isRecordOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "Enter") { e.preventDefault(); setIsMarkSentOpen(true); }
      else if (e.key.toLowerCase() === "s") { e.preventDefault(); doSnooze(current); }
      else if (e.key === "ArrowRight") { e.preventDefault(); doSkip(current); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, current, isMarkSentOpen, isRecordOpen]);

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
        right={
          pendingFocus > 0 ? (
            <button type="button" className="todo-reenter" onClick={() => startRitual(pendingFocus)} style={{ fontFamily: FONT_MONO }}>
              ✦ Clear the desk
            </button>
          ) : undefined
        }
      />
    );

  return (
    <div className="todo-root" style={{ height: "100%", display: "flex", flexDirection: "column", minWidth: 0, background: "var(--hub-desk)", padding: "6px 28px 26px" }}>
      {masthead}

      {mode === "focus" ? renderFocus() : renderLedger()}

      {/* MarkSentPopover — anchored to the focus card's "Do it" button (upward). Only its onSave
          success advances the queue; closing it never counts as progress. */}
      <AnimatePresence>
        {isMarkSentOpen && current && currentQuery && currentAgent && (() => {
          const a2 = getPrimaryAction(currentQuery.status as QueryStatus);
          if (a2.kind !== "mark-sent") return null;
          const item = current;
          return (
            <MarkSentPopover
              key="todo-mark-sent"
              style={markSentMenuStyle}
              kind={a2.markKind}
              query={currentQuery as Query & { materialsRequestedType?: string; materialsRequestedQuantity?: string }}
              agent={currentAgent}
              triggerRef={doItRef}
              onClose={() => setIsMarkSentOpen(false)}
              onRecordResponseInstead={() => { setIsMarkSentOpen(false); setIsRecordOpen(true); }}
              onSave={async ({ sentDate, responseDeadline, nudgeDate }) => {
                await recordMaterialsSent({
                  queryId: currentQuery.id,
                  targetStatus: a2.target as QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT,
                  sentDate,
                  isResubmit: a2.markKind === "resubmit",
                  responseDeadline,
                  nudgeDate,
                });
                advance(item, { cleared: true });
              }}
            />
          );
        })()}
      </AnimatePresence>

      {/* RecordResponseFocusForm — the "agent actually responded" escape hatch from Mark-Sent. */}
      {isRecordOpen && current && currentQuery && currentAgent && (
        <RecordResponseFocusForm
          key={currentQuery.id}
          isOpen={isRecordOpen}
          onClose={() => setIsRecordOpen(false)}
          query={currentQuery}
          agent={currentAgent}
          manuscript={{ title: currentMs?.title || "" }}
          onSuccessToast={() => advance(current, { cleared: true })}
        />
      )}
    </div>
  );

  // ── Focus (Clear the Desk) ──
  function renderFocus() {
    if (!current || !currentQuery || !currentAgent) {
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

    const action = getPrimaryAction(currentQuery.status as QueryStatus);
    const markKind = action.kind === "mark-sent" ? action.markKind : "partial";
    const ambient = queryAmbientStatus(currentQuery, "writer", markKind);
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
            <StatusDot status={currentQuery.status as QueryStatus} overrideSize={20} />
            <span style={{ fontFamily: FONT_MONO }}>Do next · your move</span>
          </div>
          <div className="todo-fbig" style={{ fontFamily: FONT_SERIF }}>
            {focusVerb(markKind)} to <span className="w">{agentPrimary(currentAgent)}</span>
          </div>
          <div className="todo-fsub">
            {agentPrimary(currentAgent)} requested {markKind === "resubmit" ? "a revise & resubmit" : `your ${markKind}`} of{" "}
            <b>“{currentMs?.title || "your manuscript"}”</b>. It’s your move — {action.label.toLowerCase()}.
          </div>
          <div className="todo-dline" style={{ fontFamily: FONT_MONO }}><Clock /> {chip}</div>
          <div className="todo-factions">
            <button type="button" className="todo-fbtn g" onClick={() => doSnooze(current)} style={{ fontFamily: FONT_MONO }}>Snooze</button>
            <button ref={doItRef} type="button" className="todo-fbtn p" onClick={() => setIsMarkSentOpen(true)} style={{ fontFamily: FONT_SERIF }}>{action.label} →</button>
            <button type="button" className="todo-fbtn g" onClick={() => doSkip(current)} style={{ fontFamily: FONT_MONO }}>Skip</button>
          </div>
          <div className="todo-fkey" style={{ fontFamily: FONT_MONO }}>Enter — do it &nbsp;·&nbsp; S — snooze &nbsp;·&nbsp; → — skip</div>
        </div>
      </div>
    );
  }

  // ── Ledger (skeleton; streams land in Prompt 3, Notes in Prompt 4) ──
  function renderLedger() {
    return (
      <>
        <div className="todo-filter">
          <span className="todo-segl" style={{ fontFamily: FONT_MONO, color: "var(--hub-label)" }}>Show</span>
          <div className="todo-segs" style={{ background: "var(--hub-list)", border: "var(--bdw) solid var(--bd)" }}>
            {STREAM_SEGS.map((s) => {
              const on = stream === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  className="todo-seg"
                  onClick={() => setStream(s.key)}
                  style={{ fontFamily: FONT_MONO, background: on ? "var(--hub-toggle-on)" : "transparent", color: on ? "var(--hub-toggle-on-tx)" : "var(--hub-item)" }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="todo-sort" style={{ fontFamily: FONT_MONO, background: "var(--hub-list)", border: "var(--bdw) solid var(--bd)", color: "var(--hub-item)" }}>Sort · Due date ▾</div>
        </div>

        <div className="todo-ledger">
          <div className="todo-list" style={{ background: "var(--hub-list)", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--hub-radius)" }}>
            <div className="todo-list-scroll">
              <div className="todo-list-empty" style={{ fontFamily: FONT_MONO, color: "var(--hub-label)" }}>Your list will appear here</div>
            </div>
          </div>

          <div className="todo-pane" style={{ background: "var(--hub-pane-process)", border: "var(--bdw) solid var(--hub-pane-bd)", borderRadius: "var(--hub-radius)", minHeight: TODO_PANE_FLOOR_PX }}>
            <div className="todo-pane-inner">
              <div className="todo-pane-body">
                <Quill />
                <div className="todo-pane-empty" style={{ fontFamily: FONT_SERIF, color: "var(--hub-label)" }}>Select an item to work on</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
};

export default ToDoPage;
