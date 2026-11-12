/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase D — TO DO, the dock's second tab (`/todo` below 768px): UP NEXT AS ONE CARD
 * (design-refs/phone-app-v5/phone-hub-v5.html `todoPh`, `cardHTML`; the card's behaviour is phone-upnext-v1.html's
 * script: the drag, the threshold, the tilt, the stamp, the fly-off, the next card rising, the spring back).
 *
 *   - Header: "To do", "N things need you · N done today", search. N need is `useV3().ordered.length` — the dock badge's
 *     and Today's need pill's array. Done today is the To-do workspace's own `core.done` (todoCleared
 *     `clearedThisWeek`) from London's midnight, i.e. todoCleared `clearedToday` — the desk's "Done today" source.
 *   - The card: the task in focus, its status fill across the top with the glyph, "1 of N", the task and the agency;
 *     the date chips; one line; the task's verb (the workspace's `type`, as v4's Up next; an own task "Mark done") as the one filled button;
 *     "Not now, show the next one". The edges of up to two cards behind.
 *   - The button and a right swipe call ONE function, `openJourney`, which opens the task's existing journey
 *     (PhoneTaskScreen, startKey = the task). ⚠️ NOTHING IS RECORDED HERE: this file imports no writer.
 *       · the journey SAVED → PhoneTaskScreen calls `onDid` (only after its commit resolved). The stamp lands, the card
 *         flies off right, the next rises. The snackbar with Undo is the journey's own (PhoneTaskScreen's `showUndoBar`
 *         with the commit's own `undo`, drawn on the phone by UndoBar as `data-pa="snack-undo"`): one Undo, not two.
 *         Its Undo deletes what the save wrote; the task comes back into `ordered`, so the badge rises, and this page
 *         puts it back on top (`front`).
 *       · the journey closed without saving → `onClose` alone. The workspace's list is the truth: a task still in it
 *         springs back; one that left it (snoozed or dismissed inside the journey) simply goes, with no stamp.
 *   - "Not now" or a left swipe: the card to the back of TODAY's order (localStorage, keyed by the day; resets
 *     tomorrow). No data changes.
 *   - Under the card: "Then" (the rest, as rows that open their journey the same way) and "Done today", struck through.
 *   - Reduced motion: no tilt, no fly, no stamp — the state changes at once.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useV3Data } from "../v3/V3Provider";
import { V3Glyph, statusFill } from "../v3/V3Parts";
import { PhoneTaskScreen } from "../../todo/phone/PhoneTaskScreen";
import { taskLine, type V3Query } from "../../../lib/phoneV3";
import type { WsTask } from "../../../lib/todoWs";
import { londonDayStart } from "../../../lib/todoCleared";
import { dayMonth } from "../../../lib/dates";
import {
  deckOrder, doneToday, dragAxis, dragLabel, readTodoOrder, saveTodoOrder, sendToBack, stampWord, swipeOutcome,
  todoChips, todoHeadLine, type TodoOrder,
} from "../../../lib/phoneV5";
import { Chev, Cta, IconBtn, Link4, Stamp } from "../v4/V4Parts";
import { openV3 } from "../v3/v3Store";
import "../v4/phoneV4.css";
import "./phoneV5.css";

const reduced = (): boolean => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
/** the prototype's timings: the stamp holds, then the card flies */
const STAMP_MS = 650, FLY_MS = 300;
const SPRING = "transform .35s cubic-bezier(.3,1.4,.5,1)";
const FLY = "transform .32s cubic-bezier(.4,0,.2,1), opacity .32s";

interface Snap { t: WsTask; q: V3Query | null; total: number }
interface Leave extends Snap { word: string; date: string }

const agencyOf = (t: WsTask): string => {
  if (t.kind === "own") return "Your task";
  const a = (t.agency || "").trim();
  return a && a !== "No agency" ? a : (t.agentName || "").trim();
};
/** the card's one button: the workspace's own verb (`type`, as v4's Up next); an own task's is its journey's own pill,
 *  "Mark done" (the workspace types an own task "Send", which would not say what the button does) */
const verbOf = (t: WsTask): string => (t.kind === "own" ? "Mark done" : t.type ?? "Open");
const dueYmdOf = (t: WsTask): string | null => (t.kind === "own" ? t.userTask?.dueDate ?? null : t.item?.dial?.ymd ?? null);
const chipsOf = (t: WsTask, q: V3Query | null, now: number) =>
  todoChips({ kind: t.kind, dueYmd: dueYmdOf(t), replyMs: q?.replyMs ?? null, quietDays: t.quietDays }, now);

export const TodoV5: React.FC = () => {
  const v = useV3Data();
  const { core, ordered, now, byId } = v;
  const todayYmd = core.todayYmd;
  const n = ordered.length;

  /* ── today's order: "Not now" sends a key to the back; an Undo brings a saved one back to the front ── */
  const [order, setOrder] = useState<TodoOrder>(() => readTodoOrder(todayYmd));
  const [front, setFront] = useState<string[]>([]);
  const back = order.day === todayYmd ? order.back : [];
  const keys = useMemo(() => ordered.map((t) => t.key), [ordered]);
  const byKey = useMemo(() => new Map(ordered.map((t) => [t.key, t])), [ordered]);
  const deck = useMemo(() => deckOrder(keys, back, front).map((k) => byKey.get(k)).filter((t): t is WsTask => !!t), [keys, back, front, byKey]);

  /* a saved task: once it has left the list ("gone"), its coming back (the snackbar's Undo) puts it back on top */
  const flown = useRef(new Map<string, "pending" | "gone">());
  /* the list as it stands now (the journey's `onDid` is a callback from an earlier render) */
  const keysNow = useRef(keys);
  keysNow.current = keys;
  useEffect(() => {
    const live = new Set(keys);
    const returned: string[] = [];
    flown.current.forEach((st, k) => {
      if (st === "pending" && !live.has(k)) flown.current.set(k, "gone");
      else if (st === "gone" && live.has(k)) { returned.push(k); flown.current.delete(k); }
    });
    if (returned.length) setFront((f) => [...returned, ...f.filter((k) => !returned.includes(k))]);
  }, [keys]);

  /* ── done today: the workspace's own cleared acts, from London's midnight ── */
  const done = useMemo(() => doneToday(core.done, londonDayStart(now)), [core.done, now]);

  /* ── the journey ── */
  const [opened, setOpened] = useState<(Snap & { fromCard: boolean }) | null>(null);
  const [leave, setLeave] = useState<Leave | null>(null);
  const [seq, setSeq] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach((x) => window.clearTimeout(x)); }, []);
  const after = (ms: number, f: () => void) => { timers.current.push(window.setTimeout(f, ms)); };
  const pose = (transform: string, transition: string, opacity?: string) => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = transition; el.style.transform = transform;
    if (opacity !== undefined) el.style.opacity = opacity;
  };

  /* the pile on show: while the card's journey is open, or its stamp is landing, the card stays the task it was */
  const pinned: Snap | null = leave ?? (opened?.fromCard ? opened : null);
  const rest = deck.filter((t) => t.key !== pinned?.t.key);
  const top: Snap | null = pinned ?? (rest[0] ? { t: rest[0], q: rest[0].query ? byId.get(rest[0].query.id) ?? null : null, total: n } : null);
  const behind = pinned ? rest : rest.slice(1);
  /* during the stamp the next card is already the one behind; Then starts after it */
  const then = leave ? behind.slice(1) : behind;

  /** opens a task's existing journey — every way in (the card's button, its right swipe, a Then row) */
  const openTask = (t: WsTask, fromCard: boolean) => {
    if (opened || leave) return;
    setOpened({ t, q: t.query ? byId.get(t.query.id) ?? null : null, total: n, fromCard });
  };
  /** ⚠️ THE CARD'S BUTTON AND ITS RIGHT SWIPE BOTH CALL THIS, AND ONLY THIS */
  const openJourney = () => {
    if (!top || leave || opened) return;
    if (!reduced()) pose("translateX(18px) rotate(1.5deg)", "transform .25s");
    else pose("", "none");
    openTask(top.t, true);
  };
  /** "Not now": to the back of today's order. No data changes. */
  const notNow = () => {
    if (!top || leave || opened) return;
    const key = top.t.key;
    const commit = () => {
      const o = sendToBack(order, key, todayYmd);
      setOrder(o); saveTodoOrder(o);
      setFront((f) => f.filter((k) => k !== key));
      setSeq((s) => s + 1);
    };
    if (reduced()) { commit(); return; }
    pose("translateX(-420px) rotate(-14deg)", FLY, "0");
    after(FLY_MS, commit);
  };

  /* the journey SAVED (PhoneTaskScreen's `onDid`, called only after its commit resolved) */
  const onDid = (d: { head: string; task: WsTask; next: string | null }) => {
    const o = opened;
    setOpened(null);
    flown.current.set(d.task.key, keysNow.current.includes(d.task.key) ? "pending" : "gone");
    setFront((f) => f.filter((k) => k !== d.task.key));
    if (!o?.fromCard || o.t.key !== d.task.key || reduced()) { setSeq((s) => s + 1); return; }
    setLeave({ t: o.t, q: o.q, total: o.total, word: stampWord(o.t), date: dayMonth(now) });
    pose("", "transform .2s");
    after(STAMP_MS, () => {
      pose("translateX(420px) rotate(14deg)", FLY, "0");
      after(FLY_MS, () => { setLeave(null); setSeq((s) => s + 1); });
    });
  };
  /* the journey closed WITHOUT a save (cancel, or a snooze or dismiss inside it): the list is the truth — a task still
     in it springs back; one that left it simply goes (the pile re-reads `ordered`), with no stamp */
  const onClose = () => {
    setOpened(null);
    pose("", reduced() ? "none" : SPRING);
  };

  /* ── the drag (the prototype's): horizontal only once the first pixels say so; a vertical start scrolls ── */
  const drag = useRef<{ x0: number; y0: number; dx: number; axis: "x" | null } | null>(null);
  const moved = useRef(false);
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leave || opened) return;
    drag.current = { x0: e.clientX, y0: e.clientY, dx: 0, axis: null };
    moved.current = false;
    if (cardRef.current) cardRef.current.style.transition = "none";
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g) return;
    const ddx = e.clientX - g.x0, ddy = e.clientY - g.y0;
    if (!g.axis) {
      const a = dragAxis(ddx, ddy);
      if (a === "y") { drag.current = null; return; }
      if (!a) return;
      g.axis = "x";
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* capture refused: the drag still follows */ }
    }
    g.dx = ddx;
    moved.current = true;
    const el = cardRef.current;
    if (el) {
      el.style.transform = reduced() ? `translateX(${ddx}px)` : `translateX(${ddx}px) rotate(${ddx / 22}deg)`;
      const lab = dragLabel(ddx);
      el.style.setProperty("--l", String(lab.l));
      el.style.setProperty("--r", String(lab.r));
    }
    e.preventDefault();
  };
  const onUp = () => {
    const g = drag.current;
    if (!g) return;
    drag.current = null;
    const el = cardRef.current;
    if (el) { el.style.setProperty("--l", "0"); el.style.setProperty("--r", "0"); }
    if (g.axis === "x") {
      const out = swipeOutcome(g.dx, el?.offsetWidth ?? 0);
      if (out === "do") openJourney();
      else if (out === "later") notNow();
      else pose("", reduced() ? "none" : SPRING);
    }
    window.setTimeout(() => { moved.current = false; }, 50);
  };
  /* a drag that moved is not a tap on the card's buttons */
  const tap = (f: () => void) => () => { if (!moved.current) f(); };

  const head = todoHeadLine(n, done.length);
  let card: React.ReactNode = null;
  if (top) {
    const { t, q, total } = top;
    const chips = chipsOf(t, q, now);
    const line = q?.step?.sub || taskLine(t, q);
    const agency = agencyOf(t);
    const stamped = !!leave && leave.t.key === t.key;
    card = (
      <div key={`${t.key}:${seq}`} ref={cardRef} className={`pa4-card pa5-dkc${seq > 0 && !stamped ? " rise" : ""}`} data-pa5="todo-card"
        data-key={t.key} data-i={1} data-total={total} data-kind={t.kind}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <span className="pa5-dlab l" aria-hidden="true">Later</span>
        <span className="pa5-dlab r" aria-hidden="true">Do it</span>
        <div className="pa5-dkb" style={{ background: statusFill(t.query?.status ?? null) }} data-pa5="todo-fill" data-status={t.query?.status ?? ""}>
          <V3Glyph status={t.query?.status ?? null} size={56} bg="rgba(255,255,255,.75)" />
          <div className="pa5-dkx">
            <div className="pa4-s" data-pa5="todo-pos">1 of {total}</div>
            <h2 className="pa4-h" data-pa5="todo-title">{t.title}</h2>
            {agency ? <div className="pa4-s" data-pa5="todo-agency">{agency}</div> : null}
          </div>
        </div>
        <div className="pa5-dkm">
          {chips ? (
            <div className="pa5-chips" data-pa5="todo-chips">
              <span className="pa5-due">{chips.lead}</span>
              <span className="pa5-due soft">{chips.rel}</span>
            </div>
          ) : null}
          {line ? <p className="pa4-b pa5-dkl" data-pa5="todo-line">{line}</p> : <div style={{ height: 8 }} />}
          <Cta pa4="todo-verb" data-pa5="todo-verb" disabled={stamped} onClick={tap(openJourney)}>{verbOf(t)}</Cta>
          <Link4 pa4="todo-later" data-pa5="todo-later" disabled={stamped} onClick={tap(notNow)}>Not now, show the next one</Link4>
        </div>
        {stamped ? (
          <div className="pa5-dks" data-pa5="todo-stamp" data-word={leave!.word}><Stamp word={leave!.word} date={leave!.date} style={{ right: 0, top: 0 }} /></div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pa4 pa5 pa5-todo" data-pa5="todo" data-n={n} data-done={done.length}>
      <header className="pa5-tdh" data-pa5="todo-hd">
        <div className="pa5-tdh-t">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="pa5-tdh-h">To do</h1>
            <div className="pa4-s pa5-tdh-s" data-pa5="todo-head">{head}</div>
          </div>
          <span style={{ marginRight: -12 }}><IconBtn label="Search" n="search" pa4="search" onClick={() => openV3({ type: "search" })} /></span>
        </div>
      </header>
      <div className="pa5-td" data-pa4="tasks-page">
        {card ? (
          <div className="pa5-dk" data-pa5="todo-deck">
            {behind.length >= 2 ? <i className="pa5-edge e2" data-pa5="todo-edge" aria-hidden="true" /> : null}
            {behind.length >= 1 ? <i className="pa5-edge e1" data-pa5="todo-edge" aria-hidden="true" /> : null}
            {card}
          </div>
        ) : (
          <div className="pa4-card pa5-tdempty" data-pa5="todo-empty"><h2 className="pa4-h">That’s everything for today.</h2></div>
        )}
        {then.length ? (
          <>
            <h2 className="pa4-h pa5-tdsec">Then</h2>
            <div className="pa4-card pa5-ckc" data-pa5="todo-then">
              {then.map((t) => {
                const q = t.query ? byId.get(t.query.id) ?? null : null;
                const sub = chipsOf(t, q, now)?.lead ?? taskLine(t, q);
                return (
                  <button key={t.key} type="button" className="pa5-ck" data-pa5="todo-then-row" data-key={t.key} onClick={() => openTask(t, false)}>
                    <i className="pa5-ckb" aria-hidden="true" />
                    <span className="pa5-ckx"><span className="pa4-b">{t.title}</span>{sub ? <span className="pa4-s">{sub}</span> : null}</span>
                    <Chev />
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
        {done.length ? (
          <>
            <h2 className="pa4-h pa5-tdsec">Done today</h2>
            <div className="pa4-card pa5-ckc" data-pa5="todo-done">
              {done.map((a) => (
                <div key={a.id} className="pa5-ck done" data-pa5="todo-done-row" data-kind={a.kind}>
                  <i className="pa5-ckb" aria-hidden="true">✓</i>
                  <span className="pa5-ckx"><s className="pa4-b">{a.label}</s></span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
      {opened ? (
        <PhoneTaskScreen core={core} tasks={deck} startKey={opened.t.key} now={now} onClose={onClose} onDid={onDid} />
      ) : null}
    </div>
  );
};
