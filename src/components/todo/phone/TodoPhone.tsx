/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TO-DO LIST ON A PHONE (To-do on the phone v1, screen 1; ref design-refs/todo-phone-v1/todo-phone-v1.html).
 * SUPERSEDES Phone app v2's week strip, its when-groups and its Up next card.
 *
 * ⚠️ ONE BRAIN (D1). The tasks, their groups, Start here and the Done count are the desktop workspace's own
 *    (`useWsCore`: `wsTasks`, `WS_GROUPS` through `wsSections`, `priorityTask`, `doneTabRows`), so the phone and the
 *    desktop cannot disagree about what there is to do.
 *
 *  - The band: "Your to-do list", and its three numbers, which ARE the switch: to do · late, snoozed, done this week.
 *  - Start here (To do only): the desktop's priority task. Tapping it opens it.
 *  - The groups, in the desktop's order and colours, each collapsible (remembered on this device), empty ones not drawn.
 *  - A row opens the task screen (PhoneTaskScreen). Swipe left: Later, the existing snooze sheet, with Undo.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QueryStatus } from "../../../types";
import { doingPhrase, dueChip, priorityTask, startReason, type WsTask } from "../../../lib/todoWs";
import { lateCount, phoneOrder, phoneSections, readShut, writeShut } from "../../../lib/todoPhone";
import { flagForCard } from "../../../lib/todoColumns";
import { setAsideRules } from "../../../lib/todoSetAside";
import { showUndoBar } from "../../../lib/queryActions/drawerStore";
import { dayMonth } from "../../../lib/dates";
import { TODO_OPEN_TASK_KEY } from "../../../lib/corkboard";
import { usePhoneBandExtra, usePhoneBandSlot } from "../../phone/phoneBandStore";
import { PhoneDisc } from "../../phone/PhoneDisc";
import { PI } from "../../phone/phoneIcons";
import { MobileSheet } from "../../shell/MobileSheet";
import { SetAsidePop } from "../SetAsidePop";
import { openPhoneCompose } from "../../../lib/phoneCompose";
import { useWsCore } from "../ws/useWsCore";
import { PhoneTaskScreen } from "./PhoneTaskScreen";
import "./todoPhone.css";
import "./todoPhoneR2.css";
import "./todoPhoneV1.css";

type Tab = "todo" | "snoozed" | "done";

export const TodoPhone: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeActive = location.pathname === "/todo";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(id); }, []);
  const core = useWsCore(now);
  const { all, snoozed, doneRows, db } = core;

  const sections = useMemo(() => phoneSections(all), [all]);
  const seq = useMemo(() => phoneOrder(all), [all]);
  const late = lateCount(seq);
  const prio = useMemo(() => priorityTask(all), [all]);
  const [tab, setTab] = useState<Tab>("todo");
  const [shut, setShutState] = useState<Set<string>>(readShut);
  const toggle = (id: string) => setShutState((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); writeShut(n); return n; });
  const [open, setOpen] = useState<string | null>(null);
  const [later, setLater] = useState<WsTask | null>(null);

  /* the one-shot arrivals: the corkboard's "add a task" (sa.todoCompose) and "open this task" (the desktop's own key) */
  useEffect(() => {
    if (!routeActive) return;
    let want: string | null = null;
    try { want = sessionStorage.getItem("sa.todoCompose"); } catch { /* private mode */ }
    if (want === "task" || want === "note") {
      try { sessionStorage.removeItem("sa.todoCompose"); } catch { /* private mode */ }
      openPhoneCompose(want);
    }
  }, [routeActive, location.key]);
  useEffect(() => {
    if (!routeActive || !db.collectionsReady) return;
    let id: string | null = null;
    try { id = sessionStorage.getItem(TODO_OPEN_TASK_KEY); sessionStorage.removeItem(TODO_OPEN_TASK_KEY); } catch { /* private mode */ }
    if (!id) return;
    const t = all.find((x) => x.userTask?.id === id || x.key === id);
    if (t) setOpen(t.key);
  }, [routeActive, location.key, db.collectionsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── the band: its three numbers are the switch ── */
  const nums: { k: Tab; n: number; words: string }[] = [
    { k: "todo", n: seq.length, words: `to do · ${late} late` },
    { k: "snoozed", n: snoozed.length, words: "snoozed" },
    { k: "done", n: doneRows.length, words: "done this week" },
  ];
  usePhoneBandSlot("/todo", (
    <div className="tdp-bnums" role="tablist" aria-label="Show" data-tdp="band-nums">
      {nums.map((x) => (
        <button key={x.k} type="button" role="tab" className="tdp-bnum" aria-selected={tab === x.k} aria-pressed={tab === x.k}
          data-tdp="band-num" data-k={x.k} data-count={x.n} onClick={() => setTab(x.k)}>
          <b className="pa-num">{x.n}</b>{x.words}
        </button>
      ))}
    </div>
  ), [tab, seq.length, late, snoozed.length, doneRows.length]);
  usePhoneBandExtra("/todo", (
    <button type="button" className="pa-ring" aria-label="Add a task" data-tdp="add" onClick={() => openPhoneCompose("task")}>{PI.plus}</button>
  ), []);

  /* ── Later from a swipe: the existing snooze sheet, over the desktop's own writer ── */
  const snooze = async (t: WsTask, days: number, ymd: string) => {
    setLater(null);
    const undo = await core.snoozeTask(t, days);
    if (!undo) { showUndoBar({ message: "That task can’t be snoozed that far.", sub: "" }); return; }
    const [y, m, d] = ymd.split("-").map(Number);
    showUndoBar({ message: core.snoozeWords(t, new Date(y, m - 1, d)), sub: "", undo });
  };
  const rulesFor = (t: WsTask) => { if (t.userTask) return null; const c = core.cardOf(t); return setAsideRules(c, t.query, flagForCard(c, db.taskFlags)?.snoozeCount ?? 0, core.todayYmd); };

  const bringBack = async (a: Parameters<typeof core.bringBackWrite>[0]) => {
    const w = await core.bringBackWrite(a);
    if (w.toTodo) setTab("todo");
    showUndoBar({ message: w.msg, sub: "", ...(w.undo ? { undo: w.undo } : {}) });
  };

  let body: React.ReactNode;
  if (tab === "snoozed") {
    body = snoozed.length === 0 ? <p className="tdp-none" data-tdp="none">Nothing snoozed.</p> : (
      <section className="tdp-grp" data-tdp="snoozed">
        {[...snoozed].sort((x, y) => (x.until ?? "").localeCompare(y.until ?? "")).map((a) => (
          <div key={a.id} className="tdp-row tdp-row--flat" data-tdp="snoozed-row">
            <span className="tdp-disc" aria-hidden="true">{PI.later}</span>
            <span className="tdp-rt"><b>{core.asideTitle(a)}</b><i>{[a.who, a.until ? `Back on ${dayMonth(Date.parse(a.until))}` : "Snoozed"].filter(Boolean).join(" · ")}</i></span>
            <button type="button" className="tdp-bb" onClick={() => void bringBack(a)}>Bring back</button>
          </div>
        ))}
      </section>
    );
  } else if (tab === "done") {
    body = doneRows.length === 0 ? <p className="tdp-none" data-tdp="none">Nothing cleared yet this week.</p> : (
      <section className="tdp-grp" data-tdp="done">
        {doneRows.map((r) => (
          <div key={r.key} className="tdp-row tdp-row--flat" data-tdp="done-row" data-muted={r.dis ? "" : undefined}>
            <span className="tdp-disc" aria-hidden="true">{r.dis ? PI.closeq : PI.check}</span>
            <span className="tdp-rt"><b>{r.label}</b><i>{r.sub}</i></span>
            {r.dis ? <button type="button" className="tdp-bb" onClick={() => void bringBack(r.dis!)}>{r.dis.kind === "rule" ? "Turn back on" : "Bring back"}</button> : null}
          </div>
        ))}
      </section>
    );
  } else if (!all.length) {
    body = <p className="tdp-none" data-tdp="none">Nothing to do. Every query is waiting on someone else.</p>;
  } else {
    const pt = prio.task;
    body = (
      <>
        {pt ? (
          <button type="button" className="tdp-start" data-tdp="start" data-key={pt.key} onClick={() => setOpen(pt.key)}>
            <span className="tdp-ph" aria-hidden="true">quill</span>
            <span className="tdp-st"><small>Start here</small><b data-tdp="start-phrase">{doingPhrase(pt)}</b><span data-tdp="start-reason">{startReason(prio)}</span></span>
            <span className="tdp-arr" aria-hidden="true">→</span>
          </button>
        ) : null}
        {sections.map((s) => {
          const isShut = shut.has(s.id);
          return (
            <section key={s.id} className="tdp-grp" data-tdp="group" data-group={s.id} data-band={s.band} data-shut={isShut ? "" : undefined}>
              <button type="button" className="tdp-gh" aria-expanded={!isShut} data-tdp="group-head" onClick={() => toggle(s.id)}>
                {s.name} <span className="n">{s.tasks.length}</span><span className="cv" aria-hidden="true">▾</span>
              </button>
              {isShut ? null : s.tasks.map((t) => <TaskRow key={t.key} t={t} onOpen={() => setOpen(t.key)} onLater={() => setLater(t)} />)}
            </section>
          );
        })}
        <p className="tdp-hint">Swipe a task left for Later.</p>
      </>
    );
  }

  return (
    <div className="pa-td tdp" data-pa="todo" data-tdp="list">
      <div className="pa-tdbody">
        <div className="pa-seg" role="tablist" aria-label="To-do">
          <button type="button" role="tab" aria-pressed="true" aria-selected="true" data-pa="seg-tasks">Tasks</button>
          <button type="button" role="tab" aria-pressed="false" aria-selected="false" data-pa="seg-cork" onClick={() => navigate("/todo/corkboard")}>Corkboard</button>
        </div>
        {body}
      </div>

      <MobileSheet open={!!later} onClose={() => setLater(null)} ariaLabel="Later" pa={{ height: "auto", white: true, className: "pa-later" }}>
        {later ? (
          <div data-pa="later-sheet">
            <SetAsidePop mode="aside" focus="snooze" todayYmd={core.todayYmd} rules={rulesFor(later)}
              first={later.first} backLine="" rulePlain={null} deedPlain={later.title}
              onSnooze={(days, ymd) => void snooze(later, days, ymd)} onDismiss={() => setLater(null)} onRule={() => setLater(null)}
              onDelete={() => setLater(null)} onDoor={() => setLater(null)} onClose={() => setLater(null)} opener={null} />
          </div>
        ) : null}
      </MobileSheet>

      {open && routeActive ? <PhoneTaskScreen core={core} tasks={seq} startKey={open} now={now} onClose={() => setOpen(null)} /> : null}
    </div>
  );
};

/* ── a row: the status glyph, the task, the agency, and when; swipe left for Later (Phone app v2's swipe, kept) ── */
const ACT_W = 92;
const TaskRow: React.FC<{ t: WsTask; onOpen: () => void; onLater: () => void }> = ({ t, onOpen, onLater }) => {
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
  const chip = dueChip(t);
  const glyph = t.query && t.kind !== "fix" ? <PhoneDisc status={t.query.status as QueryStatus} size={38} />
    : <span className="tdp-disc" aria-hidden="true">{t.kind === "own" ? PI.todo : t.group === "house" ? PI.doc : PI.person}</span>;
  const sub = t.kind === "own" ? "Your task" : [t.agency || (t.kind === "batch" ? `${t.batch?.length ?? 0} queries` : t.agentName), t.group === "house" ? "Quick fill" : ""].filter(Boolean).join(" · ");
  return (
    <div className="tdp-sw" data-tdp="row" data-key={t.key} data-kind={t.kind} data-swipe={x < 0 ? "left" : undefined}>
      <div className="tdp-acts"><button type="button" data-pa="later" tabIndex={x < 0 ? 0 : -1} onClick={() => { setX(0); onLater(); }}>{PI.later}Later</button></div>
      <div className="tdp-row" role="button" tabIndex={0} style={{ transform: x ? `translateX(${x}px)` : undefined }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onClick={guard(onOpen)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}>
        {glyph}
        <span className="tdp-rt"><b data-tdp="row-title">{t.title}</b>{sub ? <i>{sub}</i> : null}</span>
        {chip ? <span className="tdp-due" data-tdp="due" data-late={chip.late ? "" : undefined}><b>{chip.b}</b>{chip.s}</span> : null}
      </div>
    </div>
  );
};
