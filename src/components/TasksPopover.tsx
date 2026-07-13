/**
 * TasksPopover — the record-scoped "View tasks" popover (interaction layer 5c / Stage 6). One
 * component, two scopes: a query (Queries Hub) or an agent (Contact List). It shows BOTH tiers,
 * visibly distinct:
 *   • derived system SUGGESTIONS for the record (the same Task[] the badge counts — never stored;
 *     tick = dismissTask), and
 *   • the user's STORED tasks scoped to this record (Note.queryId/agentId; tick = complete).
 * Inline-add creates a stored task scoped to the record you're looking at, so it appears
 * immediately in the list you added it to (the whole point of the popover — the user keeps place).
 *
 * The badge count stays derived elsewhere; this component stores only what the user inputs (the
 * task text + its scope). Portalled to document.body inside a .t-f12 wrapper, positioned by the
 * caller's useFixedMenu `style`.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScriptAllyDb } from "../lib/db";
import { useToast } from "./toast/ToastProvider";
import "./shell/f12.css";

export type TasksScope = { queryId: string } | { agentId: string };

export const TasksPopover: React.FC<{
  scope: TasksScope;
  style?: React.CSSProperties;
  onClose: () => void;
}> = ({ scope, style, onClose }) => {
  const { tasks, userTasks, dismissTask, updateUserTask, addUserTask } = useScriptAllyDb();
  const { showToast } = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");

  const queryId = "queryId" in scope ? scope.queryId : undefined;
  const agentId = "agentId" in scope ? scope.agentId : undefined;

  // Derived suggestions exist only for queries (Task.relatedRecordId is a query id).
  const suggestions = queryId ? tasks.filter((t) => t.relatedRecordId === queryId) : [];
  // Stored tasks — the canonical UserTask store, scoped to this record.
  const stored = userTasks.filter((t) => !t.done && (queryId ? t.queryId === queryId : t.agentId === agentId));

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || (t instanceof Element && t.closest(".f12-popwrap"))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const add = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await addUserTask({ text, ...(queryId ? { queryId } : { agentId: agentId! }) });
    inputRef.current?.focus();
  };

  const completeStored = (id: string) => {
    void updateUserTask(id, { done: true, completedAt: new Date().toISOString() });
    showToast({ message: "Task done", undo: () => updateUserTask(id, { done: false }) });
  };

  return createPortal(
    <div className="t-f12">
      <div ref={ref} className="f12-tasks" style={{ zIndex: 60, ...style }} role="dialog" aria-label="Tasks">
        <div className="f12-tasks-h">Tasks</div>
        <div className="f12-tasks-body">
          {suggestions.length === 0 && stored.length === 0 && (
            <div className="f12-tasks-empty">Nothing on your list for this one yet.</div>
          )}
          {suggestions.map((t) => (
            <div key={t.id} className="f12-task f12-task-sug">
              <button type="button" className="f12-task-tick" aria-label="Dismiss suggestion" title="Dismiss" onClick={() => dismissTask(t.taskType, t.relatedRecordId, "permanent")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /></svg>
              </button>
              <span className="f12-task-txt">{t.title}<span className="f12-task-tag">SUGGESTED</span></span>
            </div>
          ))}
          {stored.map((t) => (
            <div key={t.id} className="f12-task">
              <button type="button" className="f12-task-tick" aria-label="Mark done" title="Mark done" onClick={() => completeStored(t.id)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /></svg>
              </button>
              <span className="f12-task-txt">{t.text}</span>
            </div>
          ))}
        </div>
        <div className="f12-tasks-add">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
            placeholder="Add a task…"
            aria-label="Add a task"
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
