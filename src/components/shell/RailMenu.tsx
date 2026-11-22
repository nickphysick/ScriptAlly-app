/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RailMenu — a section's pages beside the rail (shell rail menu v1, 14 Nov; ref design-refs/shell-rail-menu-v1.html,
 * the `.rmenu` / `.rm-row` layer). Hovering a rail row whose section has more than one page (Queries, Agents,
 * Materials, Tasks) opens a small menu of that section's pages in nav order; choosing one goes straight there. A
 * shortcut over the folder tabs, never a replacement for them: no heading, no icons, no counts, no other section.
 *
 *   · opens 120ms after the pointer enters a row; closes 220ms after it has left both the row and the menu;
 *   · with one menu open, another row's menu takes over at once (no opening delay);
 *   · closes on a choice, on any navigation, on Escape (focus back to the row), and on a click outside;
 *   · never opens while the full sidebar is floating or pinned, in the settings rail, below 768px, or on a touch
 *     screen (`hover: none`), where the row simply navigates;
 *   · placed 8px right of the rail, its top 8px above the row's top, shifted up to stay inside the window.
 *
 * ⚠️ NO DEAD GAP. The menu's `::before` bridges the space between the row's right edge and the menu, so a pointer crossing
 * from the row to the menu is over one or the other at every step; the 220ms close is the second safety, not the
 * first.
 *
 * ⚠️ THE PAGES ARE THE SECTION'S OWN CHILDREN in workspaceNav (`railMenuPages`). There is no second list of pages.
 *
 * ⚠️ A MENU BUTTON AND A MENU. ArrowRight on a row opens its menu on the current page's row (or the first); Up / Down /
 * Home / End move; Enter chooses; Escape or ArrowLeft closes and returns focus to the row; Tab closes and moves on
 * from the row. Escape is a layer on the one stack (`ESC_LEVEL.page`), so it never reaches a page's own handler.
 *
 * ⚠️ THE MENU PORTALS TO `document.body`, so railMenu.css scopes every rule to `.rmenu` and hands inheritance back
 * from brand.tsx itself.
 *
 * Carried over from the retired More panel (RailMore.tsx, deleted at 0a8b28526): the 120/220ms timing, the outside
 * click, the Escape layer, the placement maths, the portal, the ground/radius/shadow and the menu keys. Left behind:
 * hold-on-click (a row's click navigates now), group headings, icons, the foot line, the button's label swap.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ShellChild, ShellHit, ShellSection } from "../../lib/workspaceShell";
import { isPageLocked } from "../../lib/workspaceNav";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import "./railMenu.css";

export const RAIL_MENU_OPEN_MS = 120;
export const RAIL_MENU_CLOSE_MS = 220;
/** The ref's offsets: the menu's left edge from the rail's right edge, and its top above the row's top. */
export const RAIL_MENU_GAP = 8;
export const RAIL_MENU_LIFT = 8;

/** A section's menu rows: its pages in nav order, or null when it has only one page (Dashboard). */
export function railMenuPages(section: ShellSection): ShellChild[] | null {
  const kids = section.children ?? [];
  return kids.length > 1 ? kids : null;
}

const canHover = () => typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover)").matches;
const isDesktop = () => typeof window !== "undefined" && !!window.matchMedia?.("(min-width: 768px)").matches;

export interface RailMenuRowProps {
  "aria-haspopup"?: "menu";
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  ref?: (el: HTMLButtonElement | null) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export interface RailMenuApi {
  rowProps: (section: ShellSection) => RailMenuRowProps;
  menu: React.ReactNode;
  close: () => void;
}
/** A rail with no menu (a source test calling the rail's view as a function). */
export const NO_RAIL_MENU: RailMenuApi = { rowProps: () => ({}), menu: null, close: () => {} };

/**
 * The rail's one menu. `rowProps(section)` goes on that section's rail row; `menu` is rendered once by the rail.
 * `close()` is for the row's own click, which navigates as before (`railTargetFor`).
 */
export function useRailMenu({ sections, hit, locked, onGo, disabled }: {
  sections: ShellSection[];
  hit: ShellHit | null;
  locked: ReadonlySet<string>;
  onGo: (path: string) => void;
  /** the full sidebar is floating or pinned, or the rail is the settings rail: the menu never opens */
  disabled: boolean;
}): RailMenuApi {
  const [openId, setOpenId] = useState<string | null>(null);
  const openRef = useRef<string | null>(null);
  openRef.current = openId;
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const focusOnOpen = useRef(false);
  const [pos, setPos] = useState<{ left: number; top: number; bridge: number } | null>(null);

  const clear = () => { if (timer.current !== undefined) { window.clearTimeout(timer.current); timer.current = undefined; } };
  const close = useCallback((refocus = false) => {
    clear();
    const was = openRef.current;
    setOpenId(null);
    if (refocus && was) rows.current.get(was)?.focus({ preventScroll: true });
  }, []);
  const show = (id: string, focus = false) => {
    if (disabled || !isDesktop()) return;
    clear(); focusOnOpen.current = focus; setOpenId(id);
  };

  /* the full sidebar floating or pinned (or the settings rail) puts it away */
  useEffect(() => { if (disabled && openId) close(); }, [disabled, openId, close]);
  /* any navigation puts it away */
  useEffect(() => { close(); }, [hit?.section, hit?.child, close]);
  useEffect(() => () => clear(), []);
  useEscapeLayer(openId !== null, () => close(true), ESC_LEVEL.page);

  /* a click outside both the open row and the menu closes it */
  useEffect(() => {
    if (!openId) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rows.current.get(openId)?.contains(t) || panel.current?.contains(t)) return;
      close();
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [openId, close]);

  /* placed beside the rail, kept inside the window; then focus, when the keyboard opened it */
  useLayoutEffect(() => {
    if (!openId) { setPos(null); return; }
    const b = rows.current.get(openId), p = panel.current;
    if (!b) return;
    const rail = (b.closest(".wsr") as HTMLElement | null)?.getBoundingClientRect() ?? b.getBoundingClientRect();
    const r = b.getBoundingClientRect();
    const h = p?.offsetHeight ?? 0;
    const top = Math.max(8, Math.min(r.top - RAIL_MENU_LIFT, window.innerHeight - h - 8));
    const left = rail.right + RAIL_MENU_GAP;
    setPos({ left, top, bridge: Math.max(RAIL_MENU_GAP, left - r.right) });
    if (focusOnOpen.current && p) {
      focusOnOpen.current = false;
      (p.querySelector<HTMLElement>('[aria-current="page"]') ?? p.querySelector<HTMLElement>('[role="menuitem"]'))?.focus({ preventScroll: true });
    }
  }, [openId]);

  /* hover: a row's menu after 120ms (at once while another is open); out 220ms after leaving row and menu */
  const enterRow = (id: string) => {
    if (disabled || !canHover() || !isDesktop()) return;
    clear();
    if (openRef.current === id) return;
    if (openRef.current) show(id);
    else timer.current = window.setTimeout(() => show(id), RAIL_MENU_OPEN_MS);
  };
  const leave = () => {
    if (!canHover()) return;
    clear();
    if (openRef.current) timer.current = window.setTimeout(() => close(), RAIL_MENU_CLOSE_MS);
  };
  const enterMenu = () => { clear(); };

  const onRowKey = (id: string) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); show(id, true); }
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = [...(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus(); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "ArrowLeft") { e.preventDefault(); close(true); }
    /* Tab: back on the row first, so the browser's own Tab moves on from the rail, not from the end of <body> */
    else if (e.key === "Tab") close(true);
  };
  const choose = (path: string) => { close(); onGo(path); };

  const rowProps = (section: ShellSection): RailMenuRowProps => {
    if (!railMenuPages(section)) return {};
    const open = openId === section.id;
    return {
      "aria-haspopup": "menu",
      "aria-expanded": open,
      "aria-controls": open ? `rmenu-${section.id}` : undefined,
      ref: (el) => { if (el) rows.current.set(section.id, el); else rows.current.delete(section.id); },
      onPointerEnter: () => enterRow(section.id),
      onPointerLeave: leave,
      onKeyDown: onRowKey(section.id),
    };
  };

  const sec = openId ? sections.find((s) => s.id === openId) : undefined;
  const pages = sec ? railMenuPages(sec) : null;
  const menu = sec && pages && typeof document !== "undefined" ? createPortal(
    <div
      ref={panel}
      id={`rmenu-${sec.id}`}
      className={`rmenu${pos ? " is-in" : ""}`}
      role="menu"
      aria-label={`${sec.label} pages`}
      data-shell="rail-menu"
      data-section={sec.id}
      style={pos ? ({ left: pos.left, top: pos.top, "--rm-bridge": `${pos.bridge}px` } as React.CSSProperties) : { left: -9999, top: 0 }}
      onPointerEnter={enterMenu}
      onPointerLeave={leave}
      onKeyDown={onMenuKey}
    >
      {pages.map((p) => {
        const cur = hit?.section === sec.id && hit?.child === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={`rm-row${cur ? " cur" : ""}`}
            data-go={p.id}
            aria-current={cur ? "page" : undefined}
            onClick={() => choose(p.path)}
          >
            <span className="rm-lbl">{p.label}</span>
            {isPageLocked(p, locked) && <span className="rm-pro" data-shell="pro">Pro</span>}
          </button>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return { rowProps, menu, close: () => close() };
}
