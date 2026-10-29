/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TO-DO TAB ON A PHONE (Phone app v2, Part 5; ref design-refs/phone-app-v2/src/todov.js `screenTodo2` at TDB B ·
 * TDG A · TDR B, `taskRowV`, `KIND`). SUPERSEDES the v2 page on a phone (TodoRoute chooses).
 *
 * ⚠️ IT DERIVES NOTHING. The board is the tray's own `assembleBoardColumns` → `[...cols.todo, ...cols.today]`, its rows
 * `trayItem`, its days `calendarItems` (send, nudge, consider-closing and own dated tasks only) and its tallies
 * `dayBuckets` — the same four calls, in the same order, as the desktop tray and the To-do badge (lib/todoDueTally),
 * so the band's "from earlier · today" IS the badge.
 *
 *  - The band: "To-do", the book chip, this week (Monday to Sunday: the day, its date, up to three dots), and the
 *    tallies. Tapping a day filters the list to it; tapping it again clears the filter.
 *  - The sheet: Tasks / Corkboard (the Corkboard is /todo/corkboard, so back works), then From earlier · Today ·
 *    Coming up · When you have a moment, empty groups not drawn.
 *  - A row: the query's status glyph in its disc (or the kind's icon), the title, one line, and a verb that OPENS the
 *    journey — nothing writes on a tap. Swipe left: Later, the existing snooze with its rules and Undo.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { formatDate } from "../../../lib/dates";
import { assembleBoardColumns } from "../../../lib/todoColumns";
import { localYMD } from "../../../lib/shellSidebar";
import { calendarItems, counted, dayBuckets, londonToday, type CalItem } from "../../../lib/trayCalendar";
import { trayItem, type TrayDb, type TrayItem } from "../../../lib/todoTray";
import { rowLines } from "../../../lib/trayRows";
import { drawerDoorForTask } from "../../../lib/queryActions/entry";
import { openQueryDrawer, showUndoBar } from "../../../lib/queryActions/drawerStore";
import { dataNeedTarget, openAgentCard } from "../../../lib/agentCardStore";
import { agentDataQualityNeeds } from "../../../lib/agentDataQuality";
import { SWEEP_NEED } from "../../../lib/todoTray";
import { setAsideRules, daysBetween } from "../../../lib/todoSetAside";
import { flagForCard } from "../../../lib/todoColumns";
import { flagKeyForTask, taskFlagId } from "../../../lib/taskFlags";
import { usePhoneBandSlot } from "../../phone/phoneBandStore";
import { PhoneDisc } from "../../phone/PhoneDisc";
import { PI } from "../../phone/phoneIcons";
import { MobileSheet } from "../../shell/MobileSheet";
import { SetAsidePop } from "../v5/SetAsidePop";
import { snoozeCardWrites } from "../snoozeWrites";
import { openPhoneCompose } from "../../../lib/phoneCompose";
import { useTaskCommit } from "../useTaskCommit";
import type { BoardCard } from "../../../lib/todoBoard";
import "./todoPhone.css";

export type WhenGroup = "earlier" | "today" | "soon" | "moment";
export const WHEN_LABEL: Record<WhenGroup, string> = { earlier: "From earlier", today: "Today", soon: "Coming up", moment: "When you have a moment" };
const WHEN_ORDER: WhenGroup[] = ["earlier", "today", "soon", "moment"];

/** the verb (ref KIND): Send · Nudge · Decide · Add · Done, by the tray's bucket */
export function verbFor(i: Pick<TrayItem, "bucket" | "card">): { word: string; primary: boolean } {
  switch (i.bucket) {
    case "send": return { word: "Send", primary: true };
    case "decide": return i.card.taskType === "revise_resubmit" ? { word: "Send", primary: true } : { word: "Decide", primary: false };
    case "chase": return { word: "Nudge", primary: false };
    case "close": return { word: "Decide", primary: false };
    case "fix": return { word: "Add", primary: false };
    default: return { word: "Done", primary: false };
  }
}

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const plusYmd = (ymd: string, n: number) => { const [y, m, d] = ymd.split("-").map(Number); const x = new Date(y, m - 1, d + n, 12); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const weekdayMon0 = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return (new Date(y, m - 1, d, 12).getDay() + 6) % 7; };
/** this week, Monday to Sunday, around `today` */
export const weekOf = (today: string): string[] => { const mon = plusYmd(today, -weekdayMon0(today)); return Array.from({ length: 7 }, (_, i) => plusYmd(mon, i)); };
const dayLabel = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return formatDate(new Date(y, m - 1, d, 12), { weekday: "short", day: "numeric", month: "short" }); };

export const TodoPhone: React.FC = () => {
  const db = useScriptAllyDb();
  const { tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, packages, currentUser, upsertTaskFlag, dismissTask, restoreTaskFlag } = db;
  const navigate = useNavigate();
  const location = useLocation();
  const routeActive = location.pathname === "/todo";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(id); }, []);

  /* the To-do composer's one-shot arrival (sa.todoCompose, set by the corkboard's doors): on a phone, the flow */
  useEffect(() => {
    if (!routeActive) return;
    let want: string | null = null;
    try { want = sessionStorage.getItem("sa.todoCompose"); } catch { /* private mode */ }
    if (want !== "task" && want !== "note") return;
    try { sessionStorage.removeItem("sa.todoCompose"); } catch { /* private mode */ }
    openPhoneCompose(want);
  }, [routeActive, location.key]);

  /* ── the tray's own board, rows, days and tallies (see the header) ── */
  const { cols, hkGroups } = useMemo(() => assembleBoardColumns({
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
    now, today: localYMD(now), mutedTaskRules: currentUser?.mutedTaskRules,
  }), [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, now, currentUser?.mutedTaskRules]);
  const live: BoardCard[] = useMemo(() => [...cols.todo, ...cols.today], [cols]);
  const trayDb: TrayDb = useMemo(() => ({ queries, agents, manuscripts, userTasks, activities, packages, taskFlags, hkGroups }),
    [queries, agents, manuscripts, userTasks, activities, packages, taskFlags, hkGroups]);
  const items = useMemo(() => live.map((c) => trayItem(c, trayDb, now)), [live, trayDb, now]);
  const today = londonToday(now);
  const calItems: CalItem[] = useMemo(() => {
    const byKey = new Map(items.map((i) => [i.key, i]));
    return calendarItems({ cards: live, db: trayDb, flags: taskFlags, nowMs: now,
      words: (c) => { const i = byKey.get(c.key); return { deed: i?.deed ?? c.title, who: i?.who ?? c.who }; } });
  }, [live, items, trayDb, taskFlags, now]);
  const buckets = useMemo(() => dayBuckets(calItems, live, today), [calItems, live, today]);
  /** a card's day: counted (surfaced, not snoozed) items only — dayBuckets' own rule */
  const dayOf = useMemo(() => new Map(calItems.filter(counted).map((i) => [i.key, i.ymd])), [calItems]);
  const whenOf = (i: TrayItem): WhenGroup => { const d = dayOf.get(i.key); return !d ? "moment" : d < today ? "earlier" : d === today ? "today" : "soon"; };

  /* ── the week strip: the dots are the counted items on each day ── */
  const week = useMemo(() => weekOf(today), [today]);
  const dots = useMemo(() => Object.fromEntries(week.map((d) => [d, calItems.filter((i) => counted(i) && i.ymd === d).length])), [week, calItems]);
  const [day, setDay] = useState<string | null>(null);
  const pickDay = (d: string) => setDay((x) => (x === d ? null : d));

  usePhoneBandSlot("/todo", (
    <div className="pa-tdband" data-pa="todo-band">
      <div className="pa-wk" role="group" aria-label="This week">
        {week.map((d, k) => (
          <button type="button" key={d} className={`pa-wkd${(day ?? today) === d ? " on" : ""}`} aria-pressed={day === d}
            data-pa="wk-day" data-ymd={d} data-dots={dots[d]} onClick={() => pickDay(d)}>
            <span className="wd">{DAY_SHORT[k]}</span>
            <span className="wn pa-num">{Number(d.slice(8))}</span>
            <span className="wdots">{Array.from({ length: Math.min(3, dots[d] ?? 0) }, (_, j) => <i key={j} />)}</span>
          </button>
        ))}
      </div>
      <div className="pa-bstats" data-pa="todo-tallies">
        <span><b className="pa-num" data-pa="tally-earlier">{buckets.overdue}</b> from earlier</span>
        <span><b className="pa-num" data-pa="tally-today">{buckets.today}</b> today</span>
        <span><b className="pa-num" data-pa="tally-soon">{buckets.later}</b> coming up</span>
      </div>
    </div>
  ), [week, dots, day, today, buckets.overdue, buckets.today, buckets.later]);

  /* ── the list ── */
  const shown = useMemo(() => (day ? items.filter((i) => dayOf.get(i.key) === day) : items), [items, day, dayOf]);
  const groups = WHEN_ORDER.map((g) => ({ g, rows: shown.filter((i) => whenOf(i) === g).sort((a, b) => (dayOf.get(a.key) ?? "9") < (dayOf.get(b.key) ?? "9") ? -1 : 1) })).filter((x) => x.rows.length);

  /* ── the doors: each verb OPENS its journey; nothing writes on a tap ── */
  const { quickDone } = useTaskCommit({
    flash: (message, action) => showUndoBar({ message, sub: "", ...(action ? { undo: async () => { await action.fn(); } } : {}) }),
    rememberUndo: () => {},
    confirmAsk: async (msg) => window.confirm(msg),
    openFlow: () => {},
  });
  const [doneAsk, setDoneAsk] = useState<TrayItem | null>(null);
  const act = (i: TrayItem) => {
    const c = i.card;
    if (i.sweep) {
      const group = hkGroups.find((g) => g.rule === (c as BoardCard & { sweepRule?: string }).sweepRule);
      const need = group ? SWEEP_NEED[group.rule] : undefined;
      const first = group?.members[0]?.agentId;
      if (first) openAgentCard(first, { ...(need ? dataNeedTarget([need]) ?? {} : {}), from: "task" });
      return;
    }
    if (c.userTaskId) { setDoneAsk(i); return; }
    if (c.taskType === "data_quality_poor" && i.agent) { openAgentCard(i.agent.id, { ...(dataNeedTarget(agentDataQualityNeeds(i.agent)) ?? {}), from: "task" }); return; }
    const door = drawerDoorForTask(c.taskType, c.relatedRecordId, (id) => queries.find((x) => x.id === id)?.offerRefQueryId);
    if (door) openQueryDrawer(door);
  };
  const openRow = (i: TrayItem) => {
    if (i.query) { navigate({ pathname: "/queries", search: `?q=${encodeURIComponent(i.query.id)}` }); return; }
    if (i.userTask) openPhoneCompose("task", { id: i.userTask.id, text: i.userTask.text ?? "", detail: i.userTask.detail ?? "", due: i.userTask.dueDate ?? null });
  };

  /* ── Later: the existing snooze, its rules and its writer, with Undo ── */
  const [later, setLater] = useState<TrayItem | null>(null);
  const rulesFor = (i: TrayItem) => (i.card.userTaskId ? null : setAsideRules(i.card, i.query, flagForCard(i.card, taskFlags)?.snoozeCount ?? 0, today));
  const snooze = (i: TrayItem, days: number, ymd: string) => {
    const r = rulesFor(i);
    const capped = Math.min(days, r?.ceiling ?? days);
    if (capped <= 0) return;
    const toDeadline = r?.deadline && !r.deadline.passed ? daysBetween(today, r.deadline.ymd) : undefined;
    /* ⚠️ UNDO WRITES THE FLAG BACK VERBATIM, as the desk does (TodoTray `captureFlags` / `putBack`). The writer's own
       inverse clears `snoozedUntil` and unbumps the count, which is not the same document when the flag already held an
       old snooze — measured on the harness account: PA2-5 T5 caught it. */
    const keys = i.card.taskType && i.card.relatedRecordId ? [flagKeyForTask(i.card.taskType, i.card.relatedRecordId)] : [];
    const cap = keys.map((k) => { const id = taskFlagId(k); return { id, was: taskFlags.find((f) => f.id === id) ?? null }; });
    const w = snoozeCardWrites({ upsertTaskFlag, dismissTask }, i.card, capped, `until ${dayLabel(capped === days ? ymd : plusYmd(today, capped))}`, toDeadline);
    setLater(null);
    if (w) showUndoBar({ message: w.message, sub: "", undo: async () => { await Promise.all(cap.map((c) => restoreTaskFlag(c.id, c.was))); } });
  };

  /* the panel's doors: the same journeys the desk opens from it (TodoTray `doDoor`), presets included */
  const door = (i: TrayItem, d: "sendby" | "offer" | "withdraw" | "plan") => {
    setLater(null);
    const via = d === "sendby" ? { mode: "edit" as const, preset: { sendBy: true } }
      : d === "withdraw" ? { mode: "close" as const, preset: { closeWhy: "withdraw" as const } }
      : d === "plan" ? { mode: "nudge" as const, preset: { nudgeTab: "plan" as const } } : undefined;
    if (!via || !i.query) { act(i); return; }
    openQueryDrawer({ ...via, queryId: i.query.id });
  };

  return (
    <div className="pa-td" data-pa="todo">
      <div className="pa-tdbody">
        <div className="pa-seg" role="tablist" aria-label="To-do">
          <button type="button" role="tab" aria-pressed="true" aria-selected="true" data-pa="seg-tasks">Tasks</button>
          <button type="button" role="tab" aria-pressed="false" aria-selected="false" data-pa="seg-cork" onClick={() => navigate("/todo/corkboard")}>Corkboard</button>
        </div>
        {day ? <p className="pa-tdfilter" data-pa="day-filter">{dayLabel(day)} · <button type="button" onClick={() => setDay(null)}>Show every day</button></p> : null}
        {groups.length ? groups.map(({ g, rows }) => (
          <section key={g} data-pa="when-group" data-when={g}>
            <div className="pa-rowhd">{WHEN_LABEL[g]} <span className="n">· {rows.length}</span></div>
            {rows.map((i) => <TaskRow key={i.key} i={i} day={dayOf.get(i.key) ?? null} onAct={() => act(i)} onOpen={() => openRow(i)} onLater={() => setLater(i)} />)}
          </section>
        )) : <p className="pa-tdnone" data-pa="todo-none">{day ? "Nothing falls due that day." : "Nothing to do. Every query is waiting on someone else."}</p>}
      </div>

      <MobileSheet open={!!later} onClose={() => setLater(null)} ariaLabel="Later" pa={{ height: "auto", white: true, className: "pa-later" }}>
        {later ? (
          <div data-pa="later-sheet">
            <SetAsidePop mode="aside" focus="snooze" todayYmd={today} rules={rulesFor(later)}
              first={(later.agent?.name || "").trim().split(/\s+/)[0] ?? ""} backLine="" rulePlain={null} deedPlain={later.deed}
              onSnooze={(days, ymd) => snooze(later, days, ymd)} onDismiss={() => setLater(null)} onRule={() => setLater(null)}
              onDelete={() => setLater(null)} onDoor={(d) => door(later, d)} onClose={() => setLater(null)} opener={null} />
          </div>
        ) : null}
      </MobileSheet>

      {doneAsk && routeActive ? createPortal(
        <div className="pa-layer pa-doneask" role="dialog" aria-modal="true" aria-label="Tick it off" data-pa="done-ask">
          <div className="pa-doneask-card">
            <b>Tick off “{doneAsk.deed}”?</b>
            <span>It leaves your list. You can undo it straight after.</span>
            <div>
              <button type="button" className="keep" onClick={() => setDoneAsk(null)}>Not yet</button>
              <button type="button" className="go" data-pa="done-go" onClick={() => { const c = doneAsk.card; setDoneAsk(null); void quickDone(c); }}>Tick it off</button>
            </div>
          </div>
        </div>, document.body) : null}
    </div>
  );
};

/* ── a row (ref taskRowV at TDR B): the swipe reveals Later; the verb opens the journey ── */
const ACT_W = 96;
const TaskRow: React.FC<{ i: TrayItem; day: string | null; onAct: () => void; onOpen: () => void; onLater: () => void }> = ({ i, day, onAct, onOpen, onLater }) => {
  const l = rowLines(i);
  const v = verbFor(i);
  const [x, setX] = useState(0);
  const g = useRef<{ x0: number; y0: number; base: number; axis: "x" | "y" | null; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const onDown = (e: React.PointerEvent) => { if (e.pointerType === "mouse" && e.button !== 0) return; g.current = { x0: e.clientX, y0: e.clientY, base: x, axis: null, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const s = g.current; if (!s) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (!s.axis) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"; if (s.axis === "x") (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    if (s.axis !== "x") return;
    s.moved = true;
    setX(Math.max(-ACT_W, Math.min(0, s.base + dx)));
  };
  const onUp = () => { const s = g.current; g.current = null; if (s?.moved) { dragged.current = true; setX((v0) => (v0 < -ACT_W / 2 ? -ACT_W : 0)); } };
  const lead = i.query ? <PhoneDisc status={i.query.status} size={40} /> : <span className="pa-ico2" aria-hidden="true">{i.userTask ? PI.todo : i.bucket === "fix" ? PI.edit : PI.todo}</span>;
  return (
    <div className="pa-sw" data-pa="task-row" data-key={i.key} data-bucket={i.bucket} data-type={i.card.taskType ?? ""} data-day={day ?? ""} data-swipe={x < 0 ? "left" : undefined}>
      <div className="pa-acts"><span /><button type="button" className="r" data-pa="later" tabIndex={x < 0 ? 0 : -1} onClick={() => { setX(0); onLater(); }}>{PI.later}Later</button></div>
      <div className="pa-task" role="button" tabIndex={0} style={{ transform: x ? `translateX(${x}px)` : undefined }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onClick={(e) => { if ((e.target as HTMLElement).closest("[data-pa='verb']")) return; if (dragged.current) { dragged.current = false; return; } if (x !== 0) { setX(0); return; } onOpen(); }}
        onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}>
        {lead}
        <span className="lt"><b data-pa="task-title">{l.bold}</b><small>{l.italic}</small></span>
        <button type="button" className={`pa-tverb${v.primary ? " pri" : ""}`} data-pa="verb" data-verb={v.word} onClick={(e) => { e.stopPropagation(); onAct(); }}>{v.word}</button>
      </div>
    </div>
  );
};
