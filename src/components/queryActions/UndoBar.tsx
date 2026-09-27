/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The drawer's undo bar (brief §E): bottom-left, ink. The message and a mono consequence line; View,
 * Log another (after Log a query only) and Undo, whose 8-second countdown ring PAUSES ON HOVER.
 * ⌘Z / Ctrl+Z also undoes while the bar shows — never while the writer is typing in a field.
 *
 * ⚠️ THE TIMER AND THE RING ARE ONE CLOCK. The ring is a CSS animation over `--qad-dur` and the
 * timeout is JS; hovering pauses BOTH (the ring by `animation-play-state`, the timer by storing
 * what is left), so a paused bar can never expire behind a ring that says it has time.
 *
 * A new save REPLACES the bar and the earlier save stays committed — there is one undo, and it is
 * always the latest.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hideUndoBar, subscribeUndoBar, type UndoToast } from "../../lib/queryActions/drawerStore";
import "./queryDrawer.css";

export const UNDO_MS = 8000;
const DONE_MS = 2200;
const isApple = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function UndoBar() {
  const [t, setT] = useState<UndoToast | null>(null);
  const [paused, setPaused] = useState(false);
  const left = useRef(0);
  const deadline = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const busy = useRef(false);

  useEffect(() => subscribeUndoBar((x) => { setT(x); setPaused(false); }), []);

  const arm = (ms: number) => {
    window.clearTimeout(timer.current);
    left.current = ms;
    deadline.current = Date.now() + ms;
    timer.current = window.setTimeout(() => hideUndoBar(), ms);
  };
  useEffect(() => {
    if (!t) { window.clearTimeout(timer.current); return; }
    arm(t.done ? DONE_MS : t.failed ? UNDO_MS * 2 : UNDO_MS);
    return () => window.clearTimeout(timer.current);
  }, [t?.id]);

  const pause = (p: boolean) => {
    if (!t) return;
    if (p) { window.clearTimeout(timer.current); left.current = Math.max(0, deadline.current - Date.now()); }
    else arm(left.current);
    setPaused(p);
  };

  const doUndo = async () => {
    if (!t?.undo || busy.current) return;
    busy.current = true;
    const msg = t.message.replace(" · ", " — ").toUpperCase();
    try { await t.undo(); } finally { busy.current = false; }
    setT({ id: t.id + 1000000, message: "Undone", sub: msg, done: true });
  };
  const undoRef = useRef(doUndo);
  undoRef.current = doUndo;

  useEffect(() => {
    if (!t?.undo || t.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const a = document.activeElement as HTMLElement | null;
      if (a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)) return;
      e.preventDefault();
      void undoRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [t?.id, t?.undo, t?.done]);

  if (!t) return null;
  const dur = t.done ? DONE_MS : UNDO_MS;
  return createPortal(
    <div className={`qad-toast${paused ? " paused" : ""}${t.failed ? " failed" : ""}`} role="status" aria-live="polite" data-qad-toast={t.done ? "done" : t.failed ? "failed" : "on"}
      style={{ ["--qad-dur" as string]: `${dur}ms` }} key={t.id}
      onMouseEnter={() => pause(true)} onMouseLeave={() => pause(false)}>
      <span className="tx"><b>{t.message}</b>{t.sub ? <small>{t.sub}</small> : null}</span>
      {t.failed ? (
        <button type="button" className="ub" onClick={() => { hideUndoBar(); t.failed!.retry(); }}>Try again</button>
      ) : null}
      {!t.done && !t.failed && t.view ? <button type="button" className="view" onClick={() => { hideUndoBar(); t.view!(); }}>View</button> : null}
      {!t.done && !t.failed && t.again ? <button type="button" className="view" data-qad-again onClick={() => { hideUndoBar(); t.again!(); }}>Log another</button> : null}
      {!t.done && !t.failed && t.undo ? (
        <button type="button" className="ub" onClick={() => void doUndo()} data-qad-undo>
          Undo <kbd>{isApple() ? "⌘Z" : "CTRL+Z"}</kbd>
          <svg className="ring" viewBox="0 0 22 22" aria-hidden="true"><circle className="bg" cx="11" cy="11" r="9" /><circle className="fg" cx="11" cy="11" r="9" /></svg>
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
