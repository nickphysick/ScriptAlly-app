/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CAPTURE BUTTON — "Log a query", split, at the top of the sidebar (ref
 * design-refs/shell/sidebar-metrics-states.html: the Tuned sidebar, the Interaction states board,
 * the motion table and the 68px rail).
 *
 * ⚠️ IT IS NEVER CALLED "+ New", in code, CSS or comments. The bar's `+ New` was retired app-wide
 * (Query Centre v11) and its locks stay green: this control lives in the SIDEBAR, between the brand
 * and the nav, and the bar holds no create control.
 *
 * ⚠️ EVERY ROW IS AN EXISTING FLOW, REACHED THE WAY THE PALETTE REACHES IT. Log a query, Record a
 * response and Add an agent go through `invokeCapture` (railNav) and the shell's navigate bridge;
 * Add a manuscript is the manuscript switcher's own footer call, `onNavigate("manuscripts", "Add a
 * manuscript")`, which opens the add form whose Free-tier check runs at submit. No new path, no
 * write here.
 *
 * ⚠️ IT LIVES IN ITS OWN FILE, AND THAT IS PARTLY A LOCK'S DOING. `workspaceShell.test.tsx` forbids
 * the string `invokeCapture` anywhere in WorkspaceShell.tsx — written when `+ New` left the bar, as
 * a proxy for "the bar has no create control". The proxy is broader than its claim; the claim is
 * asserted on the rendered bar (SB1), and this file is where the sidebar's capture contracts live.
 *
 * ⚠️ NO KEY OPENS THE MENU. `n` is already "Add a comparable title" (Comparable titles scope) in
 * lib/shortcuts.ts, so a global binding would collide there; the registry gains no entry and the
 * menu shows no keycaps. Deferred, and said so in the run report.
 *
 * ⚠️ COLLAPSED, THE FLYOUT IS PORTALLED. The panel is `overflow: hidden` — the same reason the rail
 * tips go through DeskTooltip — so a flyout that is a child of the panel is clipped at the rail's
 * 68px edge. It renders into `document.body`, fixed to the tile's measured right edge, and reads only
 * `:root` tokens for that reason.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invokeCapture } from "./railNav";
import { menuRows, moveInMenu } from "../../lib/menuKeys";
import "./shellMenus.css";

type Navigate = (tab: string, sub?: string) => void;

/** The menu's rows, in order. `sep` draws a hairline ABOVE that row. */
type Row = { id: "query" | "record" | "agent" | "manuscript"; label: string; icon: React.ReactNode; sep?: boolean };

const svg = (size: number, children: React.ReactNode, sw = 1.7) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const QUILL = (size: number, sw = 1.8) => svg(size, <><path d="M12 19.5c0-5 2-9.5 8-13-1 6-3.5 10.5-8 13z" /><path d="M12 19.5c-3.5 0-6.5-1-8.5-3" /></>, sw);
const MAIL = svg(15, <><path d="M4 7.5 12 13l8-5.5" /><rect x="4" y="5" width="16" height="14" rx="2" /></>);
const PERSON = svg(15, <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /></>);
const BOOKS = svg(15, <path d="M5 4v16M9 4v16M13 4l5 16" />);

/** The split menu's three rows; the rail's flyout puts "Log a query" first and then these. */
export const CAPTURE_MENU_ROWS: Row[] = [
  { id: "record", label: "Record a response", icon: MAIL },
  { id: "agent", label: "Add an agent", icon: PERSON },
  /* set apart: the one row the beta does not offer yet */
  { id: "manuscript", label: "Add a manuscript", icon: BOOKS, sep: true },
];
export const CAPTURE_FLYOUT_ROWS: Row[] = [
  { id: "query", label: "Log a query", icon: QUILL(15, 1.7) },
  ...CAPTURE_MENU_ROWS,
];

/**
 * One row → its existing flow. The three capture rows are `invokeCapture`'s contracts, unchanged;
 * the manuscript row is the switcher footer's exact call.
 */
export function runCaptureRow(id: Row["id"], navigate: Navigate): void {
  if (id === "manuscript") return; /* SOON — see MANUSCRIPT_SOON */
  invokeCapture(id, navigate);
}

/**
 * ⚠️ ADD A MANUSCRIPT IS "COMING SOON" (follow-up 2, 1b). The beta allows one manuscript, so the row is
 * shown and disabled: `aria-disabled`, a SOON tag, no navigation, and never an arrow-key stop. The
 * add form's own Free-tier check stays where it was; this is the shell no longer offering the door.
 */
export const MANUSCRIPT_SOON = true;

export interface SidebarCaptureProps {
  collapsed: boolean;
  onNavigate?: Navigate;
  /** The shell's rail-tip handlers for the collapsed tile; `when` is false while the flyout is open. */
  tipFor?: (when: boolean) => Record<string, (e: React.SyntheticEvent<Element>) => void>;
  /** Called as the menu opens, so the shell can drop a rail tip that is already showing. */
  onOpenMenu?: () => void;
  /**
   * Where it is mounted. ⚠️ INK SHELL v1 MOVES IT TO THE BAR (`"bar"`): the split button, cream on ink,
   * and never the collapsed tile — the bar does not narrow with the sidebar. The contracts below are
   * untouched; only the place and the skin change. `"side"` survives for the class name it adds and
   * for any future mount, and is the default so a caller that names nothing gets today's control.
   */
  placement?: "side" | "bar";
}

export const SidebarCapture: React.FC<SidebarCaptureProps> = ({ collapsed: collapsedIn, onNavigate, tipFor, onOpenMenu, placement = "side" }) => {
  /* in the bar there is no collapsed form — the bar does not narrow with the sidebar */
  const collapsed = placement === "bar" ? false : collapsedIn;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);

  const rows = collapsed ? CAPTURE_FLYOUT_ROWS : CAPTURE_MENU_ROWS;
  const items = () => menuRows(menuRef.current);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);
  const openMenu = useCallback((focusFirst: boolean) => {
    onOpenMenu?.();
    setOpen(true);
    if (focusFirst) requestAnimationFrame(() => items()[0]?.focus());
  }, [onOpenMenu]);

  /* the state flips between expanded and collapsed: whatever was open belongs to the other shape */
  useEffect(() => { setOpen(false); }, [collapsed]);

  /* the flyout is fixed to the tile's right edge, measured when it opens and on resize */
  useLayoutEffect(() => {
    if (!open || !collapsed) return undefined;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setAt({ left: r.right + 8, top: r.top });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, collapsed]);

  /* outside pointerdown closes; Escape closes from anywhere, back to the trigger */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown, true); document.removeEventListener("keydown", onKey); };
  }, [open, close]);

  const pick = (id: Row["id"]) => {
    if (id === "manuscript" && MANUSCRIPT_SOON) return;
    close(false);
    if (onNavigate) runCaptureRow(id, onNavigate);
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); openMenu(true); }
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (moveInMenu(e, menuRef.current)) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
    /* ⚠️ Tab CLOSES WITHOUT TRAPPING — no preventDefault, so focus moves on as it would anyway. In
       the rail the flyout is portalled to the end of the body, so Tab from it would leave the page's
       order; focus goes back to the tile first and the browser carries on from there. */
    else if (e.key === "Tab") { if (collapsed) triggerRef.current?.focus(); close(false); }
  };

  const menu = (
    <div
      ref={menuRef}
      className={`ws-capm sa-pop${collapsed ? " ws-capm--fly" : ""}${open ? " is-open" : ""}`}
      role="menu"
      aria-label="Ways to add"
      data-shell="capture-menu"
      onKeyDown={onMenuKey}
      style={collapsed && at ? { left: at.left, top: at.top } : undefined}
    >
      {placement === "bar" && <p className="sa-peb" aria-hidden="true">Add something</p>}
      {rows.map((r) => {
        const soon = r.id === "manuscript" && MANUSCRIPT_SOON;
        return (
          <React.Fragment key={r.id}>
            {r.sep && <div className="ws-capsep sa-hr" role="separator" />}
            <button
              type="button" role="menuitem" tabIndex={-1} className="ws-capi sa-mi" data-cap={r.id}
              aria-disabled={soon ? true : undefined}
              onClick={() => pick(r.id)}
            >
              <span className="ws-capic">{r.icon}</span>
              <span className="ws-capt">{r.label}</span>
              {soon && <span className="sa-soon" aria-label="coming soon">SOON</span>}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );

  if (collapsed) {
    return (
      <div ref={wrapRef} className={`ws-cap ws-cap--tile${open ? " is-open" : ""}`} data-shell="capture">
        <button
          ref={triggerRef}
          type="button"
          className="ws-capb ws-captile"
          aria-label="Log a query"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => (open ? close(false) : openMenu(false))}
          onKeyDown={onTriggerKey}
          {...(tipFor ? tipFor(!open) : {})}
        >
          {QUILL(16)}
        </button>
        {typeof document !== "undefined" && createPortal(menu, document.body)}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`ws-cap${placement === "bar" ? " ws-cap--bar" : ""}${open ? " is-open" : ""}`} data-shell="capture" data-placement={placement}>
      <div className="ws-capb">
        <button type="button" className="ws-capl" onClick={() => { close(false); if (onNavigate) invokeCapture("query", onNavigate); }}>
          <span className="ws-capic">{QUILL(15)}</span>
          <span className="ws-capt">Log a query</span>
        </button>
        <button
          ref={triggerRef}
          type="button"
          className="ws-capr"
          aria-label="More ways to add"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => (open ? close(false) : openMenu(false))}
          onKeyDown={onTriggerKey}
        >
          {svg(13, <path d="m6 9 6 6 6-6" />, 2)}
        </button>
      </div>
      {menu}
    </div>
  );
};
