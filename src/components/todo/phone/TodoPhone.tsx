/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TO-DO TAB ON A PHONE (Phone app v2, Part 5; ref design-refs/phone-app-v2/src/todov.js `screenTodo2` at TDB B ·
 * TDG A · TDR B, `taskRowV`, `KIND`). SUPERSEDES the v2 page on a phone (TodoRoute chooses).
 *
 * ⚠️ IT DERIVES NOTHING (the model is useTodoPhone's, shared with Home since round two). The board is the tray's own `assembleBoardColumns` → `[...cols.todo, ...cols.today]`, its rows
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
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { formatDate } from "../../../lib/dates";
import { counted } from "../../../lib/trayCalendar";
import type { TrayItem } from "../../../lib/todoTray";
import { openQueryDrawer, showUndoBar } from "../../../lib/queryActions/drawerStore";
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
import { CheckRow, checkLine, upNextVerb, useTodoDoors, useTodoPhoneModel, whyLine, type WhenGroup } from "./useTodoPhone";
import { clearedToday } from "../../../lib/todoCleared";
import "./todoPhone.css";
import "./todoPhoneR2.css";

export type { WhenGroup };
/* Phone round two v1 (4A, ref boot2 `t1`): Overdue · Today · This week · Later · When you have a moment */
export const WHEN_LABEL: Record<WhenGroup, string> = { earlier: "Overdue", today: "Today", soon: "This week", later: "Later", moment: "When you have a moment" };
const WHEN_ORDER: WhenGroup[] = ["earlier", "today", "soon", "later", "moment"];

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

  /* ── the tray's own board, rows, days and tallies (see the header; shared with Home since round two) ── */
  const model = useTodoPhoneModel(now);
  const { items, live, calItems, buckets, today, dayOf, whenOf, hkGroups } = model;

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
  const byDay = (a: TrayItem, b: TrayItem) => ((dayOf.get(a.key) ?? "9") < (dayOf.get(b.key) ?? "9") ? -1 : 1);
  /* Up next (ref `t1`): the first of the overdue, then today's, by the list's own order — the writer's own tasks aside,
     as the ref's `urgent` sets them aside. It leaves the checklist below while it is up next. */
  const upNext = useMemo(() => {
    if (day) return null;
    const urgent = items.filter((i) => !i.userTask && (whenOf(i) === "earlier" || whenOf(i) === "today"));
    return { first: [...urgent].sort((a, b) => (whenOf(a) === whenOf(b) ? byDay(a, b) : whenOf(a) === "earlier" ? -1 : 1))[0] ?? null, n: urgent.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, day, dayOf, today]);
  const groups = WHEN_ORDER.map((g) => ({ g, rows: shown.filter((i) => whenOf(i) === g && i !== upNext?.first).sort(byDay) })).filter((x) => x.rows.length);
  /* Done today: the tray's own cleared acts (lib/todoCleared) — what came off the list today, never guessed */
  const doneToday = useMemo(() => clearedToday({ activities, taskFlags, userTasks, queries, agents }, now), [activities, taskFlags, userTasks, queries, agents, now]);

  /* ── the doors: each verb OPENS its journey; nothing writes on a tap (useTodoDoors, shared with Home) ── */
  const { act, openRow, askNode } = useTodoDoors(model, routeActive);

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
        {upNext?.first ? (
          <UpNextTask i={upNext.first} n={upNext.n} why={whyLine(upNext.first, dayOf.get(upNext.first.key) ?? null, today, now)}
            onGo={() => act(upNext.first!)} onLater={() => setLater(upNext.first)} onOpen={() => openRow(upNext.first!)} />
        ) : null}
        {groups.length ? groups.map(({ g, rows }) => (
          <section key={g} className="pa-cklist" data-pa="when-group" data-when={g}>
            <div className="pa-rowhd">{WHEN_LABEL[g]} <span className="n">· {rows.length}</span></div>
            {rows.map((i) => <TaskRow key={i.key} i={i} day={dayOf.get(i.key) ?? null} today={today} onAct={() => act(i)} onOpen={() => openRow(i)} onLater={() => setLater(i)} />)}
          </section>
        )) : !upNext?.first ? <p className="pa-tdnone" data-pa="todo-none">{day ? "Nothing falls due that day." : "Nothing to do. Every query is waiting on someone else."}</p> : null}
        {!day && doneToday.length ? (
          <section className="pa-cklist" data-pa="done-today" data-count={doneToday.length}>
            <div className="pa-rowhd">Done today <span className="n">· {doneToday.length}</span></div>
            {doneToday.map((a) => (
              <div key={a.id} className="pa-ck isdone" data-pa="done-row">
                <span className="pa-ckbx" aria-hidden="true">{PI.check}</span>
                <span className="pa-ckt"><span className="t"><b>{a.label}</b>{a.consequence ? <small>{a.consequence}</small> : null}</span></span>
              </div>
            ))}
          </section>
        ) : null}
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

      {askNode}
    </div>
  );
};

/* ── Up next (Phone round two v1, ref boot2 `t1` `.focus`): the most urgent task as a card — a blush head ("Up next",
   "1 of n"), the agent, the task, why (the facts only), one primary that opens the task's own door, and "Not now", which
   is the existing snooze ── */
const UpNextTask: React.FC<{ i: TrayItem; n: number; why: string; onGo: () => void; onLater: () => void; onOpen: () => void }> = ({ i, n, why, onGo, onLater, onOpen }) => {
  const name = (i.agent?.name || i.agent?.agency || "").trim();
  return (
    <section className="pa-focus" data-pa="todo-upnext" data-key={i.key} data-bucket={i.bucket}>
      <div className="pa-focush"><span>Up next</span><span data-pa="upnext-count">1 of {n}</span></div>
      <div className="pa-focusb">
        <button type="button" className="pa-focuswho" onClick={onOpen}>
          {i.query ? <PhoneDisc status={i.query.status} size={40} /> : <span className="pa-ico2" aria-hidden="true">{PI.todo}</span>}
          <span className="pa-mid"><b>{name || i.who}</b>{i.agent?.name && i.agent.agency ? <span className="pa-sub">{i.agent.agency}</span> : null}</span>
        </button>
        <div className="pa-focust" data-pa="upnext-task">{i.deed}</div>
        {why ? <div className="pa-focuswhy" data-pa="upnext-why">{why}</div> : null}
        <div className="pa-focusacts">
          <button type="button" className="pa-btn pri sm" data-pa="upnext-go" onClick={onGo}>{upNextVerb(i)}</button>
          <button type="button" className="pa-link" data-pa="upnext-later" onClick={onLater}>Not now</button>
        </div>
      </div>
    </section>
  );
};

/* ── a checklist row (ref boot2 `t1` `.ck`): the round tick runs the task's own door (a flow opens; only the writer's
   own task is ticked, after asking); the row opens the task; the swipe reveals Later, the existing snooze ── */
const ACT_W = 96;
const TaskRow: React.FC<{ i: TrayItem; day: string | null; today: string; onAct: () => void; onOpen: () => void; onLater: () => void }> = ({ i, day, today, onAct, onOpen, onLater }) => {
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
  const guard = (f: () => void) => () => { if (dragged.current) { dragged.current = false; return; } if (x !== 0) { setX(0); return; } f(); };
  return (
    <div className="pa-sw" data-pa="task-row" data-key={i.key} data-bucket={i.bucket} data-type={i.card.taskType ?? ""} data-day={day ?? ""} data-swipe={x < 0 ? "left" : undefined}>
      <div className="pa-acts"><span /><button type="button" className="r" data-pa="later" tabIndex={x < 0 ? 0 : -1} onClick={() => { setX(0); onLater(); }}>{PI.later}Later</button></div>
      <div className="pa-cksw" style={{ transform: x ? `translateX(${x}px)` : undefined }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <CheckRow i={i} line={checkLine(i, day, today)} chev={<span className="pa-chev">{PI.chev}</span>}
          onTick={guard(onAct)} onOpen={guard(onOpen)} />
      </div>
    </div>
  );
};
