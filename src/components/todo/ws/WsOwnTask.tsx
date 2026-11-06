/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 §7 — YOUR OWN TASK on the desk: a big tick, the editable title, "Your task · added … · Due …", the
 * steps, a lined notepad and what it is about.
 *
 * ⚠️ EVERY EDIT IS ONE FIELD, WRITTEN WHEN IT SETTLES (blur, Enter, a pick) through `updateUserTask`: the title is
 *    `text`, the notepad `detail`, the steps `steps` (new, To-do v50), the link `queryId` / `agentId` (both existed).
 * ⚠️ A TASK KEEPS A DATE. A user task without one is a note (the board's two-natures law), and notes never reach this
 *    list, so the due menu offers dates and not "No date".
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Agent, Query, TaskStep, UserTask } from "../../../types";
import { addDays, fmt } from "../../../lib/queryActions/dates";
import { DatePick, TICK, dayFromYmd } from "./WsControls";
import { statusWords } from "../../queryActions/journeys/common";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const initials = (n: string) => { const w = n.trim().split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] ?? "").slice(0, 2)).toUpperCase(); };

export interface OwnTaskWrites {
  update: (fields: { text?: string; detail?: string | null; dueDate?: string; steps?: TaskStep[] | null; queryId?: string | null; agentId?: string | null }) => Promise<void>;
  done: () => void;
  said: (msg: string) => void;
}

export function dueWords(t: UserTask, today: Date): string {
  if (!t.dueDate) return "No date";
  const d = dayFromYmd(t.dueDate.slice(0, 10));
  const n = Math.round((d.getTime() - today.getTime()) / 86400000);
  return n === 0 ? "Due today" : n === 1 ? "Due tomorrow" : n < 0 ? `Was due ${fmt(d)}` : `Due ${fmt(d)}`;
}

export const WsOwnTask: React.FC<{
  task: UserTask; today: Date; agents: readonly Agent[]; queries: readonly Query[];
  titleOf: (msId: string) => string | null; w: OwnTaskWrites;
  /** the link picker is open (the right column's empty state opens it too) */
  picking: boolean; setPicking: (open: boolean) => void;
}> = ({ task, today, agents, queries, titleOf, w, picking, setPicking }) => {
  const [title, setTitle] = useState(task.text);
  const [notes, setNotes] = useState(task.detail ?? "");
  const [dueOpen, setDueOpen] = useState<"menu" | "cal" | null>(null);
  const [find, setFind] = useState("");
  const [stepIn, setStepIn] = useState("");
  useEffect(() => { setTitle(task.text); setNotes(task.detail ?? ""); setDueOpen(null); }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const steps = task.steps ?? [];
  const added = task.createdAt ? fmt(new Date(task.createdAt)) : "today";
  const linkQ = task.queryId ? queries.find((q) => q.id === task.queryId) : undefined;
  const linkA = agents.find((a) => a.id === (task.agentId ?? linkQ?.agentId));
  const dueMenu: [string, string][] = [["Today", ymd(today)], ["Tomorrow", ymd(addDays(today, 1))], ["Next week", ymd(addDays(today, ((8 - today.getDay()) % 7) || 7))]];
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = titleRef.current; if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }, [title]);

  const options = useMemo(() => {
    const f = find.trim().toLowerCase();
    const ag = agents.map((a) => ({ kind: "agent" as const, id: a.id, name: (a.name || a.agency || "").trim(), sub: (a.agency ?? "").trim() || "Agent" }));
    const qs = queries.map((q) => {
      const a = agents.find((x) => x.id === q.agentId);
      return { kind: "query" as const, id: q.id, name: `${(a?.name || a?.agency || "An agent").trim()}’s query`, sub: [titleOf(q.manuscriptId), statusWords(q.status)].filter(Boolean).join(" · ") };
    });
    return [...ag, ...qs].filter((o) => !f || `${o.name} ${o.sub}`.toLowerCase().includes(f)).slice(0, 30);
  }, [agents, queries, find, titleOf]);

  const setSteps = (next: TaskStep[]) => void w.update({ steps: next.length ? next : null });

  return (
    <div className="tws-otask" data-tws="own">
      <div className="tws-ot1">
        <button type="button" className="tws-otick" aria-label="Mark done" title="Mark done" onClick={w.done}>{TICK}</button>
        <textarea ref={titleRef} className="tws-ott" rows={1} value={title} aria-label="What needs doing" spellCheck={false}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
          onBlur={() => { const v = title.trim(); if (!v) { setTitle(task.text); return; } if (v !== task.text) void w.update({ text: v }); }} />
      </div>
      <div className="tws-otm">
        <span>Your task · added {added}</span><span aria-hidden="true">·</span>
        <span className="tws-odd">
          <button type="button" className="tws-oddb" aria-expanded={!!dueOpen} onClick={() => setDueOpen(dueOpen ? null : "menu")}>{dueWords(task, today)} <i aria-hidden="true">▾</i></button>
          {dueOpen === "menu" ? (
            <span className="tws-oddm" role="menu">
              {dueMenu.map(([l, v]) => (
                <button key={l} type="button" role="menuitemradio" aria-checked={task.dueDate?.slice(0, 10) === v} onClick={() => { setDueOpen(null); void w.update({ dueDate: v }); }}>{l}</button>
              ))}
              <button type="button" role="menuitem" onClick={() => setDueOpen("cal")}>A date…</button>
            </span>
          ) : dueOpen === "cal" ? (
            <span className="tws-oddm" style={{ padding: 10 }}>
              <DatePick value={task.dueDate ? dayFromYmd(task.dueDate.slice(0, 10)) : addDays(today, 1)} today={addDays(today, -1)} dir="future"
                onPick={(d) => { setDueOpen(null); void w.update({ dueDate: ymd(d) }); }} />
            </span>
          ) : null}
        </span>
      </div>

      <div className="tws-osec">
        <h5>Steps</h5>
        {steps.map((s, i) => (
          <button key={i} type="button" className="tws-ostep" role="checkbox" aria-checked={s.done}
            onClick={() => setSteps(steps.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}>
            <span className="tws-obx">{s.done ? TICK : null}</span><span>{s.text}</span>
          </button>
        ))}
        <label className="tws-ostep" style={{ cursor: "text" }}>
          <span className="tws-obx" aria-hidden="true">+</span>
          <input value={stepIn} placeholder={steps.length ? "Add another step" : "Add a step"} aria-label="Add a step" onChange={(e) => setStepIn(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { const v = stepIn.trim(); if (!v) return; setStepIn(""); setSteps([...steps, { text: v, done: false }]); } }} />
        </label>
      </div>

      <div className="tws-osec">
        <h5>Notes</h5>
        <textarea className="tws-opad" value={notes} placeholder="Anything to remember" aria-label="Notes" onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { const v = notes.trim(); if (v !== (task.detail ?? "").trim()) void w.update({ detail: v || null }); }} />
      </div>

      <div className="tws-osec">
        <h5>About</h5>
        {linkQ || linkA ? (
          <span className="tws-olk">
            <span className="tws-av">{initials((linkA?.name || linkA?.agency || "").trim())}</span>
            <b>{(linkA?.name || linkA?.agency || "").trim()}</b>
            <em>{linkQ ? `${titleOf(linkQ.manuscriptId) ?? "Your query"} · ${statusWords(linkQ.status)}` : (linkA?.agency ?? "")}</em>
            <button type="button" aria-label="Unlink" title="Unlink" onClick={() => { void w.update({ queryId: null, agentId: null }); w.said("Unlinked."); }}>✕</button>
          </span>
        ) : (
          <button type="button" className="tws-olkadd" onClick={() => setPicking(!picking)}>+ Link an agent or query</button>
        )}
        {picking ? (
          <div className="tws-picker" data-tws="link-picker">
            <input autoFocus placeholder="Find an agent or a query" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Find an agent or a query" />
            <ul>
              {options.map((o) => (
                <li key={`${o.kind}:${o.id}`}>
                  <button type="button" onClick={() => {
                    setPicking(false); setFind("");
                    if (o.kind === "agent") void w.update({ agentId: o.id, queryId: null });
                    else { const q = queries.find((x) => x.id === o.id); void w.update({ queryId: o.id, agentId: q?.agentId ?? null }); }
                    w.said(`Linked to ${o.name}.`);
                  }}><b>{o.name}</b><span>{o.sub}</span></button>
                </li>
              ))}
              {!options.length ? <li style={{ padding: 8, color: "var(--tw-mut2)" }}>Nothing matches.</li> : null}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** the right column when nothing is linked */
export const OwnEmptySide: React.FC<{ onLink: () => void }> = ({ onLink }) => (
  <div className="tws-olempty" data-tws="own-empty">
    <b>Not linked to anyone</b>
    <p>If this task is about an agent, link it and their card shows here.</p>
    <button type="button" className="tws-olkadd" onClick={onLink}>+ Link an agent or query</button>
  </div>
);
