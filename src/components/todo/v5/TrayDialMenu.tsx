/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do v5.2 §G.2 — a tray dial's date menu: "SET A NEW DATE" (an own task: "MOVE TO"), Tomorrow · Monday · In a week ·
 * In a month with their dates, and "Pick on the calendar". The guards are v5.1's Set aside popover's (setAsideRules):
 * days past the ceiling are disabled, and a passed send-by shows v5.1's "Can't be snoozed" and its send-by door.
 * Portalled to the body (so `.td5-root`'s tokens do not reach it: literals), on the escape stack at its top level.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";

export interface DialOpt { k: "tomorrow" | "monday" | "week" | "month"; label: string; ymd: string; date: string; disabled: boolean }

export const TrayDialMenu: React.FC<{
  left: number;
  top: number;
  head: string;
  opts: DialOpt[];
  /** a passed send-by (or answer-by): v5.1's words and door instead of dates */
  cant: { line: string; door: string; onDoor: () => void } | null;
  onPick: (ymd: string) => void;
  onPickCal: () => void;
  onClose: () => void;
  opener: HTMLElement | null;
}> = (p) => {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeLayer(true, p.onClose, ESC_LEVEL.dialMenu);
  useEffect(() => {
    const on = (e: PointerEvent) => { const t = e.target as Node; if (ref.current?.contains(t) || p.opener?.contains(t)) return; p.onClose(); };
    document.addEventListener("pointerdown", on, true);
    return () => document.removeEventListener("pointerdown", on, true);
  }, [p.onClose, p.opener]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true }); }, []);
  return createPortal(
    <div ref={ref} className="td52-dm" role="menu" aria-label={p.head} data-td52="dial-menu" style={{ left: p.left, top: p.top }}>
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
      <button type="button" role="menuitem" data-td52="move" data-k="pick" onClick={p.onPickCal}>Pick on the calendar<small>DRAG</small></button>
    </div>,
    document.body,
  );
};
