/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoRowCard — one to-do row, and the three things a tick can mean (to-do row round, 20 Sep;
 * ref `todo-journeys.html` for the row and its panels, `todo-row-v2.html` for the card it opens).
 *
 * ⚠️ IT IS A SLIM QUERY CARD, NOT A LIST LINE, and that is the point rather than the styling. The
 * row and the reference card it opens are visibly the same object at two sizes, so the quick
 * reference reads as the row expanding rather than as something else arriving.
 *
 * ⚠️ THE TICK'S MEANING IS THE ROW'S BUSINESS AND THE WRITE IS NOT. A tick with ONE meaning commits
 * immediately (`DashTaskCommit` does the writing); a tick with SEVERAL opens a menu and writes
 * nothing until an option is chosen. Deciding which is `journeyFor` below, and it reads
 * `taskCategory` rather than re-testing the task type — two derivations of "what kind of task is
 * this" is how a quiet card comes to commit a send.
 *
 * ⚠️ AND THIS COMPONENT TOUCHES NO DATABASE. It raises requests; `DashTaskCommit` performs them.
 * That is what keeps `lib/firebase` out of the dashboard suites' import graph.
 */
import React, { useEffect, useRef } from "react";
import { StatePill } from "./StatePill";
import { getStatusLabel } from "../StatusPill";
import { elapsedParts } from "../../lib/elapsed";
import { completionVia } from "../../lib/todoActions";
import type { BoardCard } from "../../lib/todoBoard";
import type { TodoRow } from "../../lib/dashTodo";

/** what a tick means on a row of this category */
export type TodoJourney = "sent" | "nudge" | "choose" | "page";

/**
 * ⚠️ ONE MEANING COMMITS, SEVERAL ASK — AND WHICH IS WHICH IS `completionVia`'S, NOT THE CATEGORY'S.
 *
 * This read `taskCategory` first, and it was wrong in a way no reading would have caught: the
 * `req` group ("Agents are waiting") holds OFFER cards as well as sends, and an offer's completion
 * is a DECISION rather than a send. `quickDone` correctly refused it and returned false, so the
 * tick did nothing at all and the row said "That didn't save" over an offer — measured on the
 * first row of the harness board.
 *
 * `completionVia` is the app's own answer to "what does finishing this write", which is the
 * question the tick is actually asking. So: a send and a nudge each have one honest completion and
 * commit; a silence has three (close it, chase it again, leave it) and there is no right answer, so
 * the tick asks; everything else — an offer's decision, a housekeeping gap, a writer's own note —
 * belongs to a surface this row does not have, and goes to the page that does.
 */
export const journeyFor = (card: BoardCard): TodoJourney => {
  switch (completionVia(card)) {
    case "mark-sent": return "sent";
    case "log-nudge": return "nudge";
    case "close-query": return "choose";
    default: return "page";
  }
};

/** the panel a row is showing beneath itself — at most one, by construction */
export type RowPanel =
  | { kind: "menu" }
  | { kind: "strip"; text: React.ReactNode; canChange: boolean }
  | { kind: "edit"; mode: "sent" | "nudge"; warn?: string };

export interface TodoRowCardProps {
  row: TodoRow;
  panel: RowPanel | null;
  /** the quick-reference card is open against this row */
  peeking: boolean;
  onTick: () => void;
  onQuickRef: (anchor: HTMLElement) => void;
  onSnooze: (anchor: HTMLElement) => void;
  onDismiss: () => void;
  onChange: () => void;
  onUndo: () => void;
  onChoose: (choice: "close" | "nudge" | "snooze") => void;
  onSave: (mode: "sent" | "nudge") => void;
  onCancelEdit: () => void;
  /** the editor's own fields — supplied by the card so one row's draft cannot outlive it */
  editor: React.ReactNode;
}

const Tick = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f5f1eb" strokeWidth={3.2}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
);

/* the three control glyphs, in the ref's own weights */
const IcoRef = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 16.5v-5M12 8.2v.1" strokeLinecap="round" /></svg>
);
const IcoClock = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" /></svg>
);
const IcoX = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.9}
    strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
const IcoMinus = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#1c130f" strokeWidth={2} aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M7 12h10" strokeWidth="2.5" strokeLinecap="round" /></svg>
);
const IcoCircle = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#1c130f" strokeWidth={2} aria-hidden="true">
    <circle cx="12" cy="12" r="10" /></svg>
);

/**
 * ⚠️ THE THREE OPTIONS EACH STATE WHAT THEY DO TO THE QUERY, on the right, in mono. The title says
 * what the writer is doing and that line says what the app will do with it — without it a menu asks
 * somebody to guess which of three options closes a query, which is not a guess to invite.
 */
const QUIET_CHOICES: { key: "close" | "nudge" | "snooze"; title: string; why: string; what: string; ico: React.FC }[] = [
  { key: "close", title: "Close it, no reply", why: "Two nudges and nothing back. Record that.", what: "Closes the query", ico: IcoMinus },
  { key: "nudge", title: "Nudge once more", why: "Logs a third nudge and resets the clock.", what: "Back to Queried", ico: IcoCircle },
  { key: "snooze", title: "Leave it a while", why: "Snooze it. Nothing changes on the query.", what: "Comes back later", ico: IcoClock },
];

/** the plain sentence of the row, for the tick's accessible name — the italic run cannot travel */
const plain = (r: TodoRow): string => `${r.title.pre}${r.title.who}${r.title.post}`.replace(/\s+/g, " ").trim();

export const TodoRowCard: React.FC<TodoRowCardProps> = ({
  row, panel, peeking, onTick, onQuickRef, onSnooze, onDismiss,
  onChange, onUndo, onChoose, onSave, onCancelEdit, editor,
}) => {
  const refRef = useRef<HTMLButtonElement>(null);
  const snoozeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /* ⚠️ THE BOX IS ON FOR ANY OPEN PANEL, INCLUDING THE MENU — the ref's own behaviour. While a quiet
     row is being asked about, the tick shows WHICH row the question is about; nothing is written,
     and Escape or a click away turns it back off. Only `strip` also strikes the sentence. */
  const done = !!row.done || panel?.kind === "strip";
  const ticked = done || !!panel;
  const open = !!panel || peeking;

  /**
   * ⚠️ ESCAPE AND A CLICK AWAY UNTICK THE MENU, because nothing has been written yet — the box is
   * on to show which row is being asked about, and leaving it on over an unanswered question would
   * be the app claiming a completion the writer never chose.
   */
  useEffect(() => {
    if (panel?.kind !== "menu") return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onCancelEdit(); } };
    const away = (e: PointerEvent) => {
      if (!menuRef.current || menuRef.current.contains(e.target as Node)) return;
      onCancelEdit();
    };
    document.addEventListener("keydown", key, true);
    document.addEventListener("pointerdown", away, true);
    return () => {
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("pointerdown", away, true);
    };
  }, [panel?.kind, onCancelEdit]);

  const fig = row.days === null ? null : elapsedParts(row.days);

  return (
    <div
      className={`os-tdrow${open ? " os-tdrow--open" : ""}${done ? " os-tdrow--done" : ""}`}
      data-probe="todo-row" data-category={row.category} data-key={row.key}
    >
      <span className={`os-tdband os-tdband--${row.band}`} aria-hidden="true" />

      <button
        type="button" className={`os-tdbox${ticked ? " os-tdbox--on" : ""}`} data-probe="todo-tick"
        aria-label={row.done ? `${row.done.logged} — ${plain(row)}` : `Complete: ${plain(row)}`}
        aria-expanded={panel?.kind === "menu" ? true : undefined}
        onClick={onTick}
      ><Tick /></button>

      <span className="os-tdav" aria-hidden="true">{row.initials}</span>

      <span className="os-tdt">
        <span className="os-tdl1">
          <span className="os-tdtx">{row.title.pre}{row.title.who ? <b>{row.title.who}</b> : null}{row.title.post}</span>
          {row.ms && <span className="os-tdms">{row.ms}</span>}
        </span>
        <span className="os-tdl2">
          {row.status && <StatePill status={row.status} state={null} label={getStatusLabel(row.status)} />}
          <span className="os-tdfact" title={row.fact}>{row.fact}</span>
        </span>
      </span>

      <span className="os-tdright">
        <span className={`os-tdn${row.urgent ? " os-tdn--hot" : ""}`}>
          {fig ? <><b>{fig.figure}</b>{fig.unit}</> : <em className="os-tdgo" aria-hidden="true">→</em>}
        </span>
        {/* ⚠️ FIXED ORDER, ALWAYS — quick reference, snooze, dismiss. They slide in on hover and a
            control that moved between rows would be pressed by accident. */}
        <span className="os-tdacts">
          <button type="button" className={`os-tdact${peeking ? " os-tdact--on" : ""}`} data-probe="todo-ref"
            ref={refRef} aria-label={`Quick reference: ${plain(row)}`} aria-pressed={peeking}
            onClick={() => refRef.current && onQuickRef(refRef.current)}><IcoRef /></button>
          <button type="button" className="os-tdact" data-probe="todo-snooze" ref={snoozeRef}
            aria-label={`Snooze: ${plain(row)}`}
            onClick={() => snoozeRef.current && onSnooze(snoozeRef.current)}><IcoClock /></button>
          <button type="button" className="os-tdact" data-probe="todo-dismiss"
            aria-label={`Dismiss: ${plain(row)}`} onClick={onDismiss}><IcoX /></button>
        </span>
      </span>

      {panel?.kind === "strip" && (
        <div className="os-tdstrip" data-probe="todo-strip" role="status">
          <span className="os-tdstriptx">{panel.text}</span>
          <span className="os-tdsp" />
          {panel.canChange && <button type="button" data-probe="todo-change" onClick={onChange}>Change</button>}
          <button type="button" data-probe="todo-undo" onClick={onUndo}>Undo</button>
        </div>
      )}

      {panel?.kind === "menu" && (
        <div className="os-tdmenu" data-probe="todo-menu" role="group" aria-label="What would you like to do?" ref={menuRef}>
          <p className="os-tdmh">What would you like to do?</p>
          {QUIET_CHOICES.map((c) => (
            <button type="button" className="os-tdmi" key={c.key} data-probe={`todo-choice-${c.key}`}
              onClick={() => onChoose(c.key)}>
              <span className="os-tdic"><c.ico /></span>
              <span>{c.title}<small>{c.why}</small></span>
              <span className="os-tdwhat">{c.what}</span>
            </button>
          ))}
        </div>
      )}

      {panel?.kind === "edit" && (
        <div className="os-tdedit" data-probe="todo-edit">
          {panel.warn && <p className="os-tdwarn" data-probe="todo-warn">{panel.warn}</p>}
          {editor}
          <div className="os-tdef">
            <span className="os-tdrec" data-probe="todo-records">
              {panel.mode === "nudge" ? "This records a nudge" : "This records a send"}
            </span>
            <button type="button" className="os-tdb os-tdb--quiet" onClick={onCancelEdit}>Cancel</button>
            <button type="button" className="os-tdb os-tdb--ink" data-probe="todo-save"
              onClick={() => onSave(panel.mode)}>{panel.warn ? "Log it anyway" : "Save"}</button>
          </div>
        </div>
      )}
    </div>
  );
};
