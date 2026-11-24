/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2, Part A (design-refs/add-agent-v2/, screens/01) — "QUICK ACTIONS", THE BAR'S ONE CREATE BUTTON.
 * It replaces the "Log a query" split button (SidebarCapture, retired with it): a cream pill with a navy disc holding a
 * plus, which turns to a cross while the menu is open. The menu shows each journey by its hawk, in the journeys' own
 * frame (white rim, inner hairline):
 *
 *   Log a query          the Mentor     (/icon-192.png, QcLogStages' header)
 *   Record a response    the Archivist  (/images/archivist-head.png, QcRespondStages' header)
 *   Add an agent         the Scout      (/images/scout-head.png, QcAddAgent's header)
 *   ┄┄┄ Add a manuscript, coming soon — not a button
 *
 * ⚠️ EVERY ROW IS AN EXISTING DOOR, through the shell's navigate bridge (`invokeCapture`, railNav): App intercepts each
 *    one and opens the journey IN PLACE over the page on screen. Nothing here writes or navigates on its own.
 * ⚠️ ONE TOP-BAR POP-UP AT A TIME (`claimTopbar`), and the menu lives in the pop-up layer, placed from the button.
 * ⚠️ KEYBOARD: opening moves focus to the first row; ↑ ↓ move; Enter opens; Escape closes and gives focus back to the
 *    button. A press outside closes it.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { invokeCapture, type RailCaptureKey } from "./railNav";
import { moveInMenu, menuRows } from "../../lib/menuKeys";
import { AnchoredPortal, useAnchoredPopover } from "./useAnchoredPopover";
import { claimTopbar, onTopbarClaim, releaseTopbar } from "../../lib/popoverLayer";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import "./quickActions.css";

type Navigate = (tab: string, sub?: string) => void;

/** the journeys' heads — the same files their headers draw */
export const MENTOR_HEAD = "/icon-192.png";
export const ARCHIVIST_HEAD = "/images/archivist-head.png";
export const SCOUT_HEAD = "/images/scout-head.png";

export interface QuickRow { id: RailCaptureKey; title: string; line: string; head: string; scout?: boolean }
/** the three rows, in this order (screen 01) */
export const QUICK_ROWS: readonly QuickRow[] = [
  { id: "query", title: "Log a query", line: "You’ve sent one. Get it on the record.", head: MENTOR_HEAD },
  { id: "record", title: "Record a response", line: "An agent has replied.", head: ARCHIVIST_HEAD },
  { id: "agent", title: "Add an agent", line: "Someone new for your list.", head: SCOUT_HEAD, scout: true },
];

const ARROW = <svg className="mn-a" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>;
const PLUS = <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 2.5v7M2.5 6h7" /></svg>;
const BOOKS = <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M3 2.5v11M6 2.5v11M9 3l3.5 10.5" /></svg>;

export const QuickActions: React.FC<{ onNavigate?: Navigate }> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const anchored = useAnchoredPopover(btnRef, menuRef, open, { align: "end", gap: 6 });

  useEffect(() => { if (open) claimTopbar("capture"); else releaseTopbar("capture"); }, [open]);
  useEffect(() => onTopbarClaim((id) => { if (id !== "capture") setOpen(false); }), []);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) btnRef.current?.focus();
  }, []);
  const openMenu = () => {
    setOpen(true);
    requestAnimationFrame(() => menuRows(menuRef.current)[0]?.focus({ preventScroll: true }));
  };

  /* a press outside closes; Escape from anywhere closes, back to the button — through the one Escape stack, above any page
     layer, so a page's own layer never eats the key while the menu is open */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, close]);
  useEscapeLayer(open, () => close(true), ESC_LEVEL.drawerPopup);

  const pick = (id: RailCaptureKey) => {
    close(false);
    if (onNavigate) invokeCapture(id, onNavigate);
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (moveInMenu(e, menuRef.current)) return;
    if (e.key === "Tab") close(false);
  };

  const menu = (
    <div ref={menuRef} className={`mn qa-menu${open ? " is-open" : ""}`} role="menu" aria-label="Quick actions" data-shell="quick-menu"
      onKeyDown={onMenuKey} style={anchored.style} aria-hidden={open ? undefined : true}>
      <div className="mn-in">
        {QUICK_ROWS.map((r) => (
          <button key={r.id} type="button" role="menuitem" tabIndex={-1} className="mn-r" data-quick={r.id} onClick={() => pick(r.id)}>
            <span className="mn-d"><img className={r.scout ? "is-sc" : undefined} alt="" src={r.head} width={40} height={40} /></span>
            <span className="mn-t"><b>{r.title}</b><span>{r.line}</span></span>
            {ARROW}
          </button>
        ))}
        <div className="mn-soon" data-quick="manuscript">{BOOKS}Add a manuscript<i>coming soon</i></div>
      </div>
    </div>
  );

  return (
    <span className={`tb-b is-one${open ? " is-open" : ""}`} data-shell="quick">
      <button ref={btnRef} type="button" className="tb-m" data-shell="quick-btn" aria-haspopup="menu" aria-expanded={open}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); openMenu(); } }}>
        <span className="tb-plus" aria-hidden="true">{PLUS}</span>Quick actions
      </button>
      <AnchoredPortal>{menu}</AnchoredPortal>
    </span>
  );
};
