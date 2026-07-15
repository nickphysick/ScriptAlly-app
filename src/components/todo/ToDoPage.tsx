/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToDoPage — the To-do WORKSPACE, rebuilt as an F12 board (design ref:
 * design-refs/todo-workspace-v10.html). This supersedes the earlier "Clear the Desk → Ledger"
 * design entirely.
 *
 * Shape: a fixed-height top shelf (pink hero + Today's-list box), then four columns —
 *   Do next · Housekeeping (DERIVED from the task engine) · Your tasks (stored UserTask) · Cleared today.
 * The pure column/card view-model is `src/lib/todoBoard.ts`; this file is the F12 chrome + wiring.
 *
 * Theme: F12 only — the page renders inside `F12Page` (`.t-f12 f12-root`), so every colour comes from
 * the `.t-f12` token layer. NO `.t-capp/.t-bold/.t-edn` here.
 *
 * PHASE 2 scope: shell + board + cards + the two pills + Today's-list commit. The drawer (card body /
 * derived Mark-done) and the walkthroughs (Urgent / Work the list / Help me pick) are stubbed — they
 * land in Phases 3 and 4. `StatusDot` is consumed verbatim.
 */
import React, { useMemo, useState } from "react";
import { F12Page, F12Account } from "../shell/F12Shell";
import { StatusDot } from "../StatusDot";
import { useScriptAllyDb } from "../../lib/db";
import { assembleBoard, BoardCard, BoardColumns } from "../../lib/todoBoard";
import { flagKeyForTask } from "../../lib/taskFlags";
import { choosePicks, rolledOverCards, MAX_TODAY } from "../../lib/todoWalk";
import { QueryStatus } from "../../types";
import { TaskDetail } from "./TaskDetail";
import "./todo.css";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const localYMD = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const prettyDate = (ms: number): string => new Date(ms).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

const COLS: { key: keyof BoardColumns; label: string; cls: string }[] = [
  { key: "do", label: "Do next", cls: "do" },
  { key: "hk", label: "Housekeeping", cls: "hk" },
  { key: "nt", label: "Your tasks", cls: "nt" },
  { key: "done", label: "Cleared today", cls: "done" },
];

export interface ToDoPageProps {
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
}

export const ToDoPage: React.FC<ToDoPageProps> = ({ onNavigate }) => {
  const { tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser, addUserTask, updateUserTask, upsertTaskFlag } = useScriptAllyDb();
  const [toast, setToast] = useState<string | null>(null);
  // Phase-3 seam: the card whose drawer is open. Phase 2 renders a marked placeholder; Phase 3
  // swaps in the real TaskDetail.
  const [drawerCard, setDrawerCard] = useState<BoardCard | null>(null);
  const [rollDismissed, setRollDismissed] = useState(false);
  const [pulsing, setPulsing] = useState<string | null>(null);

  const now = Date.now();
  const today = localYMD(now);

  const columns = useMemo(
    () => assembleBoard({ tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now }),
    // now/today are session-stable enough; recomputing on the data arrays is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, today],
  );

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600); };

  // "On today" = it has a committedDate at all (today OR a rolled-over prior day).
  const onList = (c: BoardCard) => c.committedDate != null;
  const todayCards = [...columns.do, ...columns.hk, ...columns.nt].filter(onList);
  const rolled = rollDismissed ? [] : rolledOverCards(todayCards, today);

  function setCommitted(card: BoardCard, on: boolean) {
    const val = on ? today : null;
    if (card.userTaskId) updateUserTask(card.userTaskId, { committedDate: val });
    else if (card.taskType && card.relatedRecordId) upsertTaskFlag(flagKeyForTask(card.taskType, card.relatedRecordId), { committedDate: val });
  }
  function toggleToday(card: BoardCard) {
    if (!onList(card) && todayCards.length >= MAX_TODAY) { flash(`Today’s list is full (${MAX_TODAY} max)`); return; }
    setCommitted(card, !onList(card));
  }
  // Help me pick — a selection gesture: pulse-and-fade, card by card, then commit each.
  async function helpMePick() {
    const picks = choosePicks({ doCards: columns.do, hkCards: columns.hk, committedCount: todayCards.length });
    if (!picks.length) { flash(`Today’s list is full (${MAX_TODAY} max)`); return; }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const pool = [...columns.do, ...columns.hk];
    for (const key of picks) {
      const card = pool.find((c) => c.key === key);
      if (!card) continue;
      if (!reduce) { setPulsing(key); await wait(440); }
      setCommitted(card, true);
      if (!reduce) await wait(120);
    }
    setPulsing(null);
    flash(`Picked ${picks.length} for today`);
  }
  function keepRolled() { rolled.forEach((c) => setCommitted(c, true)); setRollDismissed(true); flash("Kept on today’s list"); }
  function dropRolled() { rolled.forEach((c) => setCommitted(c, false)); setRollDismissed(true); flash("Cleared — still on the board"); }

  function markDone(card: BoardCard) {
    if (card.userTaskId) {
      // A user's own task ticks immediately — nothing to record.
      updateUserTask(card.userTaskId, { done: true, completedAt: new Date().toISOString() });
    } else {
      // A derived task can't be silently ticked — the app needs the date/materials. Open the drawer
      // at the capture step (Phase 3). For now the stub drawer opens.
      setDrawerCard(card);
    }
  }
  async function addTask() {
    const text = window.prompt("New task"); // Phase 3 replaces with the drawer's inline compose
    if (text && text.trim()) await addUserTask({ text: text.trim() });
  }

  const doN = columns.do.length;
  const hkN = columns.hk.length;
  const clearedN = columns.done.length;
  const total = doN + hkN + columns.nt.length;
  const pressing = [...columns.do, ...columns.hk].filter((c) => c.warn).length;

  return (
    <F12Page tools={<F12Account onClick={() => onNavigate("account")} />}>
      <div className="tdb-wrap">
        {/* ── top shelf: hero + Today's list ── */}
        <div className="tdb-toprow">
          <div className="tdb-hero">
            <div className="tdb-kick">Your desk · {prettyDate(now)}</div>
            <h1 className="tdb-h1">
              {total} thing{total === 1 ? "" : "s"} need you
              {pressing ? <>, and <em>{pressing} {pressing === 1 ? "is" : "are"} pressing</em></> : ""}.
            </h1>
            <div className="tdb-sub">Work the urgent ones straight through, or build a list you’ll actually finish today.</div>
            <div className="tdb-hstrip">
              <span><b>{doN}</b> your move</span>
              <span><b>{hkN}</b> housekeeping</span>
              <span><b>{clearedN}</b> cleared today</span>
            </div>
            <div className="tdb-hact">
              <button type="button" className="tdb-btn-pri" disabled={!doN} onClick={() => flash("Walkthrough — Phase 4")}>Urgent</button>
              <button type="button" className="tdb-btn-sec" onClick={() => onNavigate("queries")}>See all queries</button>
            </div>
          </div>

          {renderTodayBox()}
        </div>

        {/* ── tools row ── */}
        <div className="tdb-tools">
          <button type="button" className="tdb-tool" onClick={() => flash("Filter — later")}>Filter</button>
          <button type="button" className="tdb-tool" onClick={() => flash("Sort — later")}>Sort</button>
          <span className="tdb-sp" />
          <button type="button" className="tdb-add-pri" onClick={addTask}>＋ Add a task</button>
        </div>

        {/* ── board ── */}
        <div className="tdb-board">
          {COLS.map(({ key, label, cls }) => {
            const cards = columns[key];
            return (
              <div key={key} className={`tdb-col ${cls}`}>
                <div className="tdb-colh"><span className="tdb-ct">{label}</span><span className="tdb-cn">{cards.length}</span>
                  {key === "nt" && <button type="button" className="tdb-cadd" onClick={addTask} aria-label="Add a task">＋</button>}
                </div>
                <div className="tdb-colb">
                  {cards.length === 0 ? (
                    key === "nt"
                      ? <button type="button" className="tdb-ghostadd" onClick={addTask}>＋ Add a task</button>
                      : <div className="tdb-colempty">{key === "done" ? "Nothing cleared yet." : key === "hk" ? "Nothing to tidy." : "Nothing here."}</div>
                  ) : (
                    cards.map((c) => (key === "done" ? renderDoneCard(c) : renderCard(c)))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toast && <div className="tdb-toast">{toast}</div>}
      {drawerCard && (() => {
        const streamCards = columns[drawerCard.stream];
        const idx = streamCards.findIndex((c) => c.key === drawerCard.key);
        return (
          <TaskDetail
            card={drawerCard}
            onClose={() => setDrawerCard(null)}
            onPrev={idx > 0 ? () => setDrawerCard(streamCards[idx - 1]) : undefined}
            onNext={idx >= 0 && idx < streamCards.length - 1 ? () => setDrawerCard(streamCards[idx + 1]) : undefined}
            onNavigate={onNavigate}
          />
        );
      })()}
    </F12Page>
  );

  // ── Today's list box (fixed shelf; body scrolls behind a fade at ~4 rows; footer always shown) ──
  function renderTodayBox() {
    const items = todayCards;
    const total = items.length + clearedN; // committed + already-cleared today
    const pct = total ? Math.round((clearedN / total) * 100) : 0;
    return (
      <div className="tdb-today">
        <div className="tdb-th"><span className="tdb-t">Today’s list</span><span className="tdb-c">{items.length} / {MAX_TODAY}</span></div>
        {rolled.length > 0 && (
          <div className="tdb-rollbar">
            <span className="tdb-rolltx"><b>{rolled.length}</b> {rolled.length === 1 ? "item" : "items"} rolled over from a previous day.</span>
            <button type="button" onClick={keepRolled}>Keep</button>
            <button type="button" className="drop" onClick={dropRolled}>Clear</button>
          </div>
        )}
        <div className="tdb-tb">
          {items.length === 0 ? (
            <div className="tdb-tempty">
              <div className="tdb-e1">Nothing committed yet.</div>
              <div className="tdb-e2">Press ＋ Today’s list on any card</div>
            </div>
          ) : items.map((c) => (
            <div key={c.key} className="tdb-trow" onClick={() => (c.userTaskId ? undefined : setDrawerCard(c))}>
              {c.hk || c.userTaskId ? <span className="tdb-tdot" /> : c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={14} /> : <span className="tdb-tdot" />}
              <div className="tdb-tmid"><div className="tdb-tx">{c.title}</div><div className="tdb-tm">{c.record}</div></div>
              <button type="button" className="tdb-x" title="Take off today" onClick={(e) => { e.stopPropagation(); toggleToday(c); }}>✕</button>
            </div>
          ))}
        </div>
        <div className="tdb-tf">
          <div className="tdb-tbar" style={{ visibility: total ? "visible" : "hidden" }}><i style={{ width: `${pct}%` }} /></div>
          <div className="tdb-tfr">
            <span className="tdb-pc">{total ? `${clearedN} OF ${total} DONE` : "NOTHING COMMITTED"}</span>
            <button type="button" className="tdb-pick" onClick={helpMePick}>{items.length ? "Add more" : "Help me pick"}</button>
            <button type="button" className="tdb-walk" disabled={!items.length} onClick={() => flash("Work the list — Phase 4")}>Work the list</button>
          </div>
        </div>
      </div>
    );
  }

  function renderCard(c: BoardCard) {
    // Title with the agent name emphasised (serif-italic burgundy) — split on `who`.
    const titleNode = c.who && c.title.includes(c.who)
      ? <>{c.title.split(c.who)[0]}<em>{c.who}</em>{c.title.split(c.who).slice(1).join(c.who)}</>
      : c.title;
    const committed = onList(c);
    return (
      <div key={c.key} className={`tdb-tile${committed ? " today" : ""}${pulsing === c.key ? " pulse" : ""}`} onClick={() => setDrawerCard(c)}>
        <div className="tdb-tags">
          <span className={`tdb-tag due${c.warn ? " warn" : ""}`}>{c.due}</span>
          {c.snoozes > 0 && <span className="tdb-tag snz">Snoozed ×{c.snoozes}</span>}
        </div>
        <div className="tdb-tt">{titleNode}</div>
        {c.subtitle && <div className="tdb-tsub">{c.subtitle}</div>}
        <div className="tdb-tmeta">
          {c.hk ? <span className="tdb-hkdot" aria-hidden>!</span> : c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={14} /> : <span className="tdb-tdot" />}
          <span className={`tdb-miniav ${c.stream}`}>{c.initials}</span>
          <span className="tdb-who">{c.record}</span>
        </div>
        <div className="tdb-tacts">
          <button type="button" className={`tdb-pill today-p${committed ? " on" : ""}`} onClick={(e) => { e.stopPropagation(); toggleToday(c); }}>
            {committed ? "✓ On today" : "＋ Today’s list"}
          </button>
          <button type="button" className="tdb-pill done-p" onClick={(e) => { e.stopPropagation(); markDone(c); }}>
            <span className="tdb-tk" />Mark done
          </button>
        </div>
      </div>
    );
  }

  function renderDoneCard(c: BoardCard) {
    return (
      <div key={c.key} className="tdb-tile done">
        <div className="tdb-tt done">{c.title}</div>
        <div className="tdb-tmeta"><span className="tdb-donebox">✓</span><span className="tdb-who">{c.record}</span></div>
      </div>
    );
  }

};

export default ToDoPage;
