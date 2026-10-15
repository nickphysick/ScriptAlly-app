/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The v2 composer — Task or Note, the week pills, attach an agent, Cmd/Ctrl+Enter — lifted out of
 * `V2Desk` whole (To-do list v5, Part F) so two hosts share ONE composer: the phone's desk rail, and
 * the desktop's "Add a task" drawer. Behaviour is unchanged; the move is the change.
 *
 * ⚠️ ONE STORE, NEVER TWO. A task is `addUserTask` with a due day (the list's document); a note is
 *    `addUserTask` with none (the Corkboard's). The host supplies both writers.
 * ⚠️ `onNote` (v5): a host that does not write notes hands the Note toggle off instead. The phone's
 *    desk leaves it unset and keeps the toggle as it was.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Agent } from "../../../types";
import { agentPrimary } from "../../../lib/agentDisplay";
import { formatDate } from "../../../lib/dates";
import { WHEN_LABEL, WHEN_PILLS, dueForPill, type WhenPill } from "../../../lib/todoV2";

/* through the ONE formatter (lib/dates) — "Sun 4 Oct", never "Sept" */
const shortDay = (ymd: string) =>
  formatDate(`${ymd}T12:00:00`, { weekday: "short", day: "numeric", month: "short" });

export const V2Composer: React.FC<{
  today: string;
  agents: Agent[];
  onAddTask: (f: { text: string; dueDate: string; agentId?: string }) => Promise<boolean>;
  onAddNote: (f: { text: string }) => Promise<boolean>;
  /** v5: the Note toggle hands off rather than writing here */
  onNote?: () => void;
  autoFocus?: boolean;
}> = ({ today, agents, onAddTask, onAddNote, onNote, autoFocus }) => {
  const [mode, setMode] = useState<"task" | "note">("task");
  const [text, setText] = useState("");
  const [when, setWhen] = useState<WhenPill>("this");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [find, setFind] = useState("");
  const [said, setSaid] = useState("");
  const [busy, setBusy] = useState(false);
  const saidTimer = useRef<number | null>(null);
  const pickRef = useRef<HTMLDivElement>(null);

  const flash = (m: string) => {
    setSaid(m);
    if (saidTimer.current) window.clearTimeout(saidTimer.current);
    saidTimer.current = window.setTimeout(() => setSaid(""), 3200);
  };
  useEffect(() => () => { if (saidTimer.current) window.clearTimeout(saidTimer.current); }, []);

  /* the picker dismisses like every other panel on the page — a press outside, or Escape */
  useEffect(() => {
    if (!picking) return undefined;
    const onDown = (e: PointerEvent) => { if (!pickRef.current?.contains(e.target as Node)) setPicking(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPicking(false); };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown, true); document.removeEventListener("keydown", onKey); };
  }, [picking]);

  const agent = agentId ? agents.find((a) => a.id === agentId) : undefined;
  const matches = useMemo(() => {
    const q = find.trim().toLowerCase();
    return agents
      .filter((a) => !q || agentPrimary(a).toLowerCase().includes(q) || (a.agency || "").toLowerCase().includes(q))
      .sort((a, b) => agentPrimary(a).localeCompare(agentPrimary(b)))
      .slice(0, 8);
  }, [agents, find]);

  const commit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      if (mode === "note") {
        const ok = await onAddNote({ text: t });
        if (ok) { setText(""); flash("Saved — it’s on your Corkboard too"); } else flash("Couldn’t save that — try again");
        return;
      }
      const due = dueForPill(when, today);
      const ok = await onAddTask({ text: t, dueDate: due, ...(agentId ? { agentId } : {}) });
      if (ok) {
        setText(""); setAgentId(null);
        flash(`Added to the list under ${WHEN_LABEL[when]} — due by ${shortDay(due)}`);
      } else flash("Couldn’t add that — try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tdv2-composer" data-todo-v2="composer">
      <div className="tdv2-ctoggle" role="group" aria-label="Add a task or a note">
        {(["task", "note"] as const).map((m) => (
          <button key={m} type="button" className={`tdv2-cseg${mode === m ? " on" : ""}`} aria-pressed={mode === m}
            data-mode={m} onClick={() => { if (m === "note" && onNote) { onNote(); return; } setMode(m); }}>{m === "task" ? "Task" : "Note"}</button>
        ))}
      </div>
      <textarea
        className={`tdv2-capture${mode === "note" ? " note" : ""}`}
        data-todo-v2="capture"
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void commit(); } }}
        placeholder={mode === "task" ? "What needs doing?" : "Jot something down…"}
        aria-label={mode === "task" ? "What needs doing?" : "Jot something down"}
      />
      {mode === "task" && (
        <div className="tdv2-cmeta" role="group" aria-label="When">
          {WHEN_PILLS.map((p) => (
            <button key={p} type="button" className={`tdv2-pill${when === p ? " on" : ""}`} aria-pressed={when === p}
              data-when={p} onClick={() => setWhen(p)}>{WHEN_LABEL[p]}</button>
          ))}
        </div>
      )}
      <div className="tdv2-cfoot">
        {mode === "task" && (
          <div className="tdv2-attach" ref={pickRef}>
            {agent ? (
              <span className="tdv2-attached" data-todo-v2="attached">
                {agentPrimary(agent)}
                <button type="button" className="tdv2-unattach" aria-label={`Detach ${agentPrimary(agent)}`} onClick={() => setAgentId(null)}>×</button>
              </span>
            ) : (
              <button type="button" className="tdv2-linkish" data-todo-v2="attach" aria-expanded={picking}
                onClick={() => { setPicking((o) => !o); setFind(""); }}>+ Attach an agent</button>
            )}
            {picking && (
              <div className="tdv2-picker" role="dialog" aria-label="Attach an agent">
                <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find an agent" aria-label="Find an agent" />
                <div className="tdv2-picklist">
                  {matches.length ? matches.map((a) => (
                    <button key={a.id} type="button" className="tdv2-pickrow"
                      onClick={() => { setAgentId(a.id); setPicking(false); }}>
                      <b>{agentPrimary(a)}</b>{a.agency ? <span>{a.agency}</span> : null}
                    </button>
                  )) : <div className="tdv2-empty tdv2-empty--sm">No agent by that name.</div>}
                </div>
              </div>
            )}
          </div>
        )}
        <button type="button" className="tdv2-btn tdv2-addbtn" data-todo-v2="add" disabled={!text.trim() || busy} onClick={() => void commit()}>Add</button>
      </div>
      <div className={`tdv2-said${said ? " show" : ""}`} aria-live="polite" data-todo-v2="said">{said}</div>
    </div>
  );
};
