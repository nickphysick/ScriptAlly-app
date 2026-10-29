/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do v5.2 §G.2, v7 — a tray date's menu: "SET A NEW DATE" (an own task: "MOVE TO"), Tomorrow · Monday · In a week ·
 * In a month with their dates, and "Pick a date", which opens the small month the compose card uses (ComposeCard's
 * MonthCal) inside this popover. The guards are v5.1's Set aside popover's (setAsideRules): days past the ceiling are
 * disabled, today and the past are disabled, and a passed send-by shows v5.1's "Can't be snoozed" and its send-by door
 * (no month then). The page's `refusal()` is the last word on any pick. Drag onto a day is retired (v7).
 * Portalled to the body (so `.td5-root`'s tokens do not reach it: literals), on the escape stack at its top level.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { MonthCal } from "./ComposeCard";

export interface DialOpt { k: "tomorrow" | "monday" | "week" | "month"; label: string; ymd: string; date: string; disabled: boolean }

export const TrayDialMenu: React.FC<{
  left: number;
  top: number;
  head: string;
  opts: DialOpt[];
  /** a passed send-by (or answer-by): v5.1's words and door instead of dates */
  cant: { line: string; door: string; onDoor: () => void } | null;
  onPick: (ymd: string) => void;
  onClose: () => void;
  /** "Pick a date": the month's today, its first pickable day, its last (the ceiling; null = none) and the current date */
  todayYmd: string;
  min: string;
  max: string | null;
  value: string | null;
  opener: HTMLElement | null;
}> = (p) => {
  const ref = useRef<HTMLDivElement>(null);
  const [picking, setPicking] = useState(false);
  /* the month makes the popover taller: keep its foot on screen (8px clear) without moving it sideways */
  const [top, setTop] = useState(p.top);
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    setTop(Math.max(8, Math.min(p.top, window.innerHeight - h - 8)));
  }, [picking, p.top]);
  useEscapeLayer(true, p.onClose, ESC_LEVEL.dialMenu);
  useEffect(() => {
    const on = (e: PointerEvent) => { const t = e.target as Node; if (ref.current?.contains(t) || p.opener?.contains(t)) return; p.onClose(); };
    document.addEventListener("pointerdown", on, true);
    return () => document.removeEventListener("pointerdown", on, true);
  }, [p.onClose, p.opener]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true }); }, []);
  return createPortal(
    <div ref={ref} className={`td52-dm${picking ? " td7-picking" : ""}`} role="menu" aria-label={p.head} data-td52="dial-menu" style={{ left: p.left, top }}>
      <div className="td52-dmh" data-td52="dm-head">{p.head}</div>
      {p.cant ? (
        <div className="td52-dmc" data-td52="cant-snooze">
          <b>Can’t be snoozed</b>{p.cant.line}{" "}
          <button type="button" className="td52-dml" data-td52="sendby-door" onClick={p.cant.onDoor}>{p.cant.door}</button>
        </div>
      ) : p.opts.map((o) => (
        <button key={o.k} type="button" role="menuitem" data-td52="move" data-k={o.k} data-ymd={o.ymd} disabled={o.disabled} onClick={() => p.onPick(o.ymd)}>
          {o.label}<small>{o.date}</small>
        </button>
      ))}
      {p.cant ? null : (
        <button type="button" role="menuitem" data-td52="move" data-k="pick" aria-expanded={picking} onClick={() => setPicking((x) => !x)}>Pick a date<small aria-hidden="true">{picking ? "▴" : "▾"}</small></button>
      )}
      {picking && !p.cant ? <MonthCal todayYmd={p.todayYmd} value={p.value} min={p.min} max={p.max} onPick={p.onPick} /> : null}
    </div>,
    document.body,
  );
};
