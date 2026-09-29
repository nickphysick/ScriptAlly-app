/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Your desk" — the To-do list's rail (v2; ref `.rail`). A CAPTURE DESK, not a second list: a
 * composer that writes a task or a note, then two short views of what is already stored.
 *
 * ⚠️ ONE STORE, NEVER TWO. A task added here is `addUserTask` with a due day — the same document the
 * list renders, so it appears in the list under the chosen heading and in "Yours on the list" below
 * from ONE write. A note is `addUserTask` with no due day, which IS the Noteboard's store (a note is
 * a user task with no date; `isNoteTask`), so a note written here is on the Noteboard too.
 *
 * ⚠️ THERE IS NO "NO DATE" PILL FOR A TASK. In this app a user item with no date is a NOTE — the
 * two natures are derived from `dueDate` and nothing else — so a dateless "task" could only be
 * written as a note wearing a task's label. The Note toggle is that choice, stated honestly.
 * (The brief's pill row drew four; this is the one place it could not be built as drawn.)
 *
 * ⚠️ A PILL IS A WEEK AND THE TASK RECORDS A DAY — the end of that week — and the confirmation
 * line names the day, so nothing is chosen for the writer silently.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Agent, UserTask } from "../../../types";
import { agentPrimary } from "../../../lib/agentDisplay";
import { dayMonth, formatDate } from "../../../lib/dates";
import { WHEN_LABEL, WHEN_PILLS, dueForPill, type V2Row, type WhenPill } from "../../../lib/todoV2";

/* through the ONE formatter (lib/dates) — "Sun 4 Oct", never "Sept" */
const shortDay = (ymd: string) =>
  formatDate(`${ymd}T12:00:00`, { weekday: "short", day: "numeric", month: "short" });

const noteWhen = (t: UserTask, nowMs: number): string => {
  const ms = Date.parse(t.createdAt || "");
  if (!Number.isFinite(ms)) return "";
  const days = Math.floor((nowMs - ms) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return dayMonth(ms);
};

export const V2Desk: React.FC<{
  today: string;
  agents: Agent[];
  yours: V2Row[];
  notes: UserTask[];
  onAddTask: (f: { text: string; dueDate: string; agentId?: string }) => Promise<boolean>;
  onAddNote: (f: { text: string }) => Promise<boolean>;
  onOpenRow: (r: V2Row) => void;
  onOpenNoteboard: () => void;
}> = ({ today, agents, yours, notes, onAddTask, onAddNote, onOpenRow, onOpenNoteboard }) => {
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
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * ⚠️ THE RAIL NEVER RUNS OFF THE BOTTOM — ON LOAD AS WELL AS STUCK. `PageRail` sizes the card to the
   * height it will have once stuck, so at rest (below the header) it runs past the fold; this page's
   * brief forbids that. The height is derived from the rail's OWN measured top — the later of where
   * it sits and where it sticks — to the scroller's bottom, re-read on scroll and resize, and never
   * from `100vh` or a constant. A zero or negative reading is the page before layout (or hidden under
   * a sibling route) and is refused rather than published.
   */
  useLayoutEffect(() => {
    const desk = rootRef.current;
    const rail = desk?.closest(".sa-prail") as HTMLElement | null;
    const sc = desk?.closest(".wpg-scroll") as HTMLElement | null;
    const group = desk?.closest(".tdv2-group") as HTMLElement | null;
    if (!rail || !sc || !group) return undefined;
    let raf = 0;
    const put = () => {
      raf = 0;
      if (getComputedStyle(group).gridTemplateColumns.trim().split(/\s+/).length < 2) { rail.style.setProperty("--tdv2-rail-h", "none"); return; }
      const s = sc.getBoundingClientRect();
      const r = rail.getBoundingClientRect();
      if (!(s.height > 0) || !(r.width > 0)) return;
      const top = Math.max(r.top, s.top + 16);
      const h = Math.floor(s.bottom - 16 - top);
      if (h > 0) rail.style.setProperty("--tdv2-rail-h", `${Math.max(240, h)}px`);
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(put); };
    put();
    sc.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    const ro = new ResizeObserver(ask);
    ro.observe(sc);
    ro.observe(group);
    return () => {
      sc.removeEventListener("scroll", ask);
      window.removeEventListener("resize", ask);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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
        if (ok) { setText(""); flash("Saved — it’s on your Noteboard too"); } else flash("Couldn’t save that — try again");
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
    <div className="tdv2-desk" data-todo-v2="desk" ref={rootRef}>
      <div className="tdv2-composer" data-todo-v2="composer">
        <div className="tdv2-ctoggle" role="group" aria-label="Add a task or a note">
          {(["task", "note"] as const).map((m) => (
            <button key={m} type="button" className={`tdv2-cseg${mode === m ? " on" : ""}`} aria-pressed={mode === m}
              data-mode={m} onClick={() => setMode(m)}>{m === "task" ? "Task" : "Note"}</button>
          ))}
        </div>
        <textarea
          className={`tdv2-capture${mode === "note" ? " note" : ""}`}
          data-todo-v2="capture"
          value={text}
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

      <div className="tdv2-railbody">
        <div className="tdv2-rgh">Yours on the list<span className="tdv2-rgn">{yours.length}</span></div>
        {yours.length ? yours.map((r) => (
          <button key={r.key} type="button" className="tdv2-rrow" data-todo-v2="rail-row" data-row-key={r.key} onClick={() => onOpenRow(r)}>
            <span className="tdv2-l1"><span className="tdv2-nm">{r.deed}</span><span className="tdv2-dt">{WHEN_LABEL[r.when]}</span></span>
            <span className="tdv2-rsub">{r.who === "—" ? "No agent attached" : r.who}</span>
          </button>
        )) : <div className="tdv2-empty tdv2-empty--sm">Nothing of your own yet — add one above.</div>}
        <div className="tdv2-rgh">Notes<span className="tdv2-rgn">{notes.length}</span></div>
        {notes.length ? notes.slice(0, 3).map((n) => (
          <div key={n.id} className="tdv2-notecard" data-todo-v2="note">
            <p>{n.text}</p>
            <div className="tdv2-nmeta">{noteWhen(n, Date.now())}</div>
          </div>
        )) : <div className="tdv2-empty tdv2-empty--sm">No notes yet.</div>}
      </div>

      <div className="tdv2-railfoot">
        <button type="button" onClick={onOpenNoteboard} data-todo-v2="noteboard-link">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
          Open the Noteboard
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: "auto" }} aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
};
