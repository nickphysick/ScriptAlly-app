/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToDoPage — the To-do WORKSPACE as an F12 board. Re-layout (design ref:
 * design-refs/todo-lanes-full-cards.html): THREE horizontal LANES (Do next · Housekeeping · Your
 * tasks) stacked vertically — the page scrolls a little when they exceed the viewport, Do-next
 * pinned on top. The old four-column grid + "Cleared today" column are RETIRED; completions now
 * live in the Today's-list DONE-BAND (§ renderTodayBox). Superseded design: todo-workspace-v10.html
 * (still the ref for the drawer / walkthrough / housekeeping-fix internals, which this pass leaves alone).
 *
 * Presentation + view-model only — the task engine, taskFlags and every write path are untouched.
 * The pure view-model is `src/lib/todoBoard.ts` (assembleBoard → three lanes + the cleared union;
 * todaySplit → committed/done bands). Theme: F12 only (`.t-f12` tokens). StatusDot consumed verbatim.
 */
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { F12Page, F12Account } from "../shell/F12Shell";
import { StatusDot } from "../StatusDot";
import { useScriptAllyDb } from "../../lib/db";
import { assembleBoard, todaySplit, BoardCard } from "../../lib/todoBoard";
import { flagKeyForTask } from "../../lib/taskFlags";
import { choosePicks, rolledOverCards, todayProgress, MAX_TODAY } from "../../lib/todoWalk";
import { groupHousekeeping, HkGroup } from "../../lib/todoHousekeeping";
import { clearedTodayItems } from "../../lib/clearedToday";
import { QueryStatus } from "../../types";
import { TaskDetail } from "./TaskDetail";
import { Walkthrough } from "./Walkthrough";
import { HousekeepingBatch } from "./HousekeepingBatch";
import "./todo.css";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const localYMD = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const prettyDate = (ms: number): string => new Date(ms).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
const fmtTime = (ms?: number): string => {
  if (ms == null) return "";
  if (Date.now() - ms < 120000) return "just now";
  const d = new Date(ms);
  let h = d.getHours();
  const ap = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}${ap}`;
};

// Per-rule blurb for the grouped housekeeping card (presentation copy — the rule catalogue itself
// lives in todoHousekeeping.ts and is left untouched by this presentation pass).
const GROUP_BLURB: Record<string, string> = {
  dq_responseTime: "Without a reply window we can’t tell you when a nudge is fair — so they never surface in your chase list.",
  dq_materials: "We don’t know what to tell you to send — so your package check can’t run for them.",
  dq_mswl: "Their wish list is how we tell you who’s worth querying — worth most before you query.",
  no_response_close: "Silent past their stated window. Closing keeps your response rate honest.",
};

/** One lane: coloured header band + a horizontal card scroller with an overflow fade + scroll-right
 *  chevron (module-level so it keeps its own scroll ref across ToDoPage re-renders). */
const Lane: React.FC<{
  cls: string;
  label: string;
  count: number;
  isEmpty: boolean;
  onAdd?: () => void;
  emptyNode?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ cls, label, count, isEmpty, onAdd, emptyNode, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [children]);
  const scrollRight = () => ref.current?.scrollBy({ left: 340, behavior: "smooth" });
  return (
    <div className={`tdb-lane ${cls}`}>
      <div className="tdb-laneh">
        <span className="tdb-lt">{label}</span>
        <span className="tdb-ln">{count}</span>
        <span className="tdb-sp" />
        {onAdd && <button type="button" className="tdb-cadd" onClick={onAdd} aria-label="Add a task">＋</button>}
        {!isEmpty && more && <button type="button" className="tdb-chev" onClick={scrollRight} aria-label="Scroll right">›</button>}
      </div>
      {isEmpty ? (
        <div className="tdb-laneempty">{emptyNode}</div>
      ) : (
        <div className={`tdb-track${more ? " more" : ""}`}>
          <div className="tdb-scroller" ref={ref}>{children}</div>
        </div>
      )}
    </div>
  );
};

export interface ToDoPageProps {
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
}

export const ToDoPage: React.FC<ToDoPageProps> = ({ onNavigate }) => {
  const { tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser, addUserTask, updateUserTask, upsertTaskFlag } = useScriptAllyDb();
  const [toast, setToast] = useState<string | null>(null);
  const [drawerCard, setDrawerCard] = useState<BoardCard | null>(null);
  const [rollDismissed, setRollDismissed] = useState(false);
  const [pulsing, setPulsing] = useState<string | null>(null);
  const [walk, setWalk] = useState<{ title: string; cards: BoardCard[] } | null>(null);
  const [batchGroup, setBatchGroup] = useState<HkGroup | null>(null);

  const now = Date.now();
  const today = localYMD(now);

  const board = useMemo(
    () => assembleBoard({ tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now }),
    // now/today are session-stable enough; recomputing on the data arrays is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, today],
  );
  // Housekeeping lane renders GROUPED by rule (one card per rule, not per record); the flat board.hk
  // still feeds Today's-list + Help-me-pick unchanged. Rule-muted groups drop out here too.
  const hkGroups = useMemo(
    () => groupHousekeeping(board.hk, agents, currentUser?.mutedTaskRules),
    [board.hk, agents, currentUser],
  );

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600); };

  // Today's list: committed band (committedDate === today, the 5-cap set) + done band (the cleared
  // union, uncapped). Rolled-over commitments (a prior day) surface once in the gold Keep/Clear bar.
  const { committed: committedCards, done: doneCards } = todaySplit(board, today);
  const onList = (c: BoardCard) => c.committedDate === today; // "on today" = committed to TODAY
  const allCommitted = [...board.do, ...board.hk, ...board.nt].filter((c) => c.committedDate != null);
  const rolled = rollDismissed ? [] : rolledOverCards(allCommitted, today);
  // Progress = completions FROM today's committed list (never a globally-cleared item that was never committed).
  const clearedItems = clearedTodayItems({ activities, userTasks, taskFlags, now });
  const doneFromList = clearedItems.userTasks.filter((t) => t.committedDate === today).length + clearedItems.flags.filter((f) => f.committedDate === today).length;

  function setCommitted(card: BoardCard, on: boolean) {
    const val = on ? today : null;
    if (card.userTaskId) updateUserTask(card.userTaskId, { committedDate: val });
    else if (card.taskType && card.relatedRecordId) upsertTaskFlag(flagKeyForTask(card.taskType, card.relatedRecordId), { committedDate: val });
  }
  function toggleToday(card: BoardCard) {
    if (!onList(card) && committedCards.length >= MAX_TODAY) { flash(`Today’s list is full (${MAX_TODAY} max)`); return; }
    setCommitted(card, !onList(card));
  }
  // Help me pick — a selection gesture: pulse-and-fade, card by card, then commit each.
  async function helpMePick() {
    const picks = choosePicks({ doCards: board.do, hkCards: board.hk, committedCount: committedCards.length });
    if (!picks.length) { flash(`Today’s list is full (${MAX_TODAY} max)`); return; }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const pool = [...board.do, ...board.hk];
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
      updateUserTask(card.userTaskId, { done: true, completedAt: new Date().toISOString() });
    } else {
      // A derived task can't be silently ticked — the app needs the date/materials. Open the drawer.
      setDrawerCard(card);
    }
  }
  async function addTask() {
    const text = window.prompt("New task");
    if (text && text.trim()) await addUserTask({ text: text.trim() });
  }

  const doN = board.do.length;
  const hkN = board.hk.length;
  const doneN = doneCards.length;
  const total = doN + hkN + board.nt.length;
  const pressing = [...board.do, ...board.hk].filter((c) => c.warn).length;

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
              <span><b>{doneN}</b> done today</span>
            </div>
            <div className="tdb-hact">
              <button type="button" className="tdb-btn-pri" disabled={!doN} onClick={() => setWalk({ title: "Urgent", cards: board.do })}>Urgent</button>
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

        {/* ── lanes (page scrolls vertically if three lanes exceed the viewport; Do-next on top) ── */}
        <div className="tdb-lanes">
          <Lane cls="do" label="Do next" count={doN} isEmpty={doN === 0} emptyNode={<span className="e">Nothing needs you right now.</span>}>
            {board.do.map(renderCard)}
          </Lane>
          <Lane cls="hk" label="Housekeeping" count={hkGroups.length} isEmpty={hkGroups.length === 0} emptyNode={<span className="e">Nothing to tidy.</span>}>
            {hkGroups.map(renderGroupCard)}
          </Lane>
          <Lane cls="nt" label="Your tasks" count={board.nt.length} onAdd={addTask} isEmpty={board.nt.length === 0}
            emptyNode={<><span className="e">Nothing jotted yet.</span><button type="button" className="tdb-ghost" onClick={addTask}>＋ Add a task</button></>}>
            {board.nt.map(renderCard)}
          </Lane>
        </div>
      </div>

      {toast && <div className="tdb-toast">{toast}</div>}
      {walk && <Walkthrough title={walk.title} cards={walk.cards} onClose={() => setWalk(null)} onNavigate={onNavigate} onToast={flash} />}
      {batchGroup && <HousekeepingBatch group={batchGroup} onClose={() => setBatchGroup(null)} onToast={flash} onNavigate={onNavigate} />}
      {drawerCard && (() => {
        const streamCards = drawerCard.stream === "done" ? [] : board[drawerCard.stream];
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

  // ── Today's list box: committed band + done band (the day's record) ──
  function renderTodayBox() {
    const prog = todayProgress(committedCards.length, doneFromList);
    const room = MAX_TODAY - committedCards.length;
    return (
      <div className="tdb-today">
        <div className="tdb-th">
          <span className="tdb-t">Today’s list</span>
          <span className="tdb-cc">{committedCards.length} committed</span>
          <span className="tdb-cd">{doneN} done</span>
        </div>
        {rolled.length > 0 && (
          <div className="tdb-rollbar">
            <span className="tdb-rolltx"><b>{rolled.length}</b> {rolled.length === 1 ? "item" : "items"} rolled over from a previous day.</span>
            <button type="button" onClick={keepRolled}>Keep</button>
            <button type="button" className="drop" onClick={dropRolled}>Clear</button>
          </div>
        )}

        {/* committed band */}
        <div className="tdb-tcommit">
          {committedCards.map((c) => (
            <div key={c.key} className="tdb-trow" onClick={() => (c.userTaskId ? undefined : setDrawerCard(c))}>
              {c.hk || c.userTaskId ? <span className="tdb-tdot" /> : c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={14} /> : <span className="tdb-tdot" />}
              <div className="tdb-tmid"><div className="tdb-tx">{c.title}</div><div className="tdb-tm">{c.record}</div></div>
              <button type="button" className="tdb-x" title="Take off today" onClick={(e) => { e.stopPropagation(); toggleToday(c); }}>✕</button>
            </div>
          ))}
          {room > 0 && <div className="tdb-tempty">Press ＋ on a card to commit — up to {MAX_TODAY}</div>}
        </div>

        {/* done band */}
        <div className="tdb-tdiv"><span>Done today</span><span className="l" /></div>
        <div className="tdb-tdone">
          {doneCards.length === 0 ? (
            <div className="tdb-donenil">Nothing cleared yet today.</div>
          ) : doneCards.map((c) => (
            <div key={c.key} className="tdb-drow">
              <span className="tdb-tick">✓</span>
              <div className="tdb-tmid"><div className="tdb-dx">{c.title}</div><div className="tdb-dm2">{[c.record, fmtTime(c.whenMs)].filter(Boolean).join(" · ")}</div></div>
            </div>
          ))}
        </div>

        <div className="tdb-tf">
          <span className="tdb-pc">{prog.empty ? "NOTHING COMMITTED" : `${prog.done} of ${prog.total} done today`}</span>
          <button type="button" className="tdb-pick" onClick={helpMePick}>{committedCards.length ? "Add more" : "Help me pick"}</button>
          <button type="button" className="tdb-worklist" disabled={!committedCards.length} onClick={() => setWalk({ title: "Work the list", cards: committedCards })}>Work the list</button>
        </div>
      </div>
    );
  }

  // ── full-detail lane card (fixed height, clip-safe: the subtitle absorbs overflow, pills never spill) ──
  function renderCard(c: BoardCard) {
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
        <div className="tdb-tsub">{c.subtitle}</div>
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

  // ── grouped housekeeping card (fixed height, clip-safe; big count + blurb + monogram stack) ──
  function renderGroupCard(g: HkGroup) {
    const faces = g.members.slice(0, 5);
    const suffix = g.meta.title(g.members.length).replace(/^\d+\s+/, "");
    const isClose = g.rule === "no_response_close";
    return (
      <div key={g.rule} className={`tdb-gcard${isClose ? " close" : ""}`} onClick={() => setBatchGroup(g)}>
        <div className="tdb-gn">{g.members.length}</div>
        <div className="tdb-gt">{suffix}</div>
        <div className="tdb-gs">{GROUP_BLURB[g.rule] ?? ""}</div>
        <div className="tdb-gstack">
          {faces.map((m) => <span key={m.card.key} className="tdb-gsav" title={m.agentName}>{m.card.initials}</span>)}
          {g.members.length > faces.length && <span className="tdb-gmore">+{g.members.length - faces.length}</span>}
          <span className="tdb-gfix">{isClose ? "Review →" : "Fix together →"}</span>
        </div>
      </div>
    );
  }
};

export default ToDoPage;
