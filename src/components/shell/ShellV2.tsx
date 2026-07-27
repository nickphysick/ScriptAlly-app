/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ShellV2 — the CAPSULE shell chrome (ref design-refs/scriptally-capsule-shell.html): the 70px
 * icon rail capsule (burgundy plane glyph, icon-only ribs with tooltips, Setup + the avatar at
 * the foot), the 288px panel capsule (the real brand artwork centred at its head; contents in
 * ShellSidebar), and the content capsule's 58px top bar (breadcrumb · save-state chip · the
 * shared NavSearch in its cream capsule variant, focused by ⌘K).
 *
 * The flat shell's tab tongue, captions, masthead rule/kicker and tuck control are RETIRED
 * (collapse behaviour is an open question — deliberately not built). Display of every sv2
 * element is class + media-query driven (shellV2.css) — never inline.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Send, Book, List, Package, User, Compass, BookCopy, SlidersHorizontal, HelpCircle,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { NavSearch } from "../NavSearch";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { useShellNavCounts } from "./ShellSidebar";
import {
  SHELL_DASHBOARD, SHELL_SECTIONS, shellCrumbForPath, shellPageForPath,
} from "./shellV2Nav";
import "./shellV2.css";

/** The paper-plane brand glyph (capsule mockup .mk) — small, burgundy, top of the rail. */
export const Mark: React.FC = () => (
  <svg className="sv2-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.7 2.3 2.6 9.6c-.8.3-.8 1.4 0 1.7l6.1 2.3 2.3 6.1c.3.8 1.4.8 1.7 0l7.3-19.1c.3-.7-.4-1.4-1.1-1.1Z" />
  </svg>
);

/* ── rail flyouts (collapsed state only — supersedes the fixes pack's "rail only") ─────────
   Hovering a section rib opens a floating quick-nav capsule beside the rail: kicker, page rows
   (icon · label · count), and an Expand-sidebar footer. Dashboard is a straight link — no
   flyout (baked); Setup's flyout carries Task settings (the modal trigger — it navigates to
   /todo and dispatches sa:open-task-settings, since the sheet lives in that page) + Help
   centre. The ~140ms grace timer is interaction logic, not animation; appearance animates via
   the CSS .show class. Keyboard: ribs open on focus, rows are real buttons (Tab + Enter) — no
   fuller menu-key system, per the pack. ── */

/** The rail sections that carry a flyout while collapsed — Dashboard deliberately absent. */
export const FLYOUT_SECTIONS = ["querying", "agents", "shelf", "setup"] as const;
export type FlyoutKey = (typeof FLYOUT_SECTIONS)[number];

const PAGE_ICONS: Record<string, React.ReactNode> = {
  "queries-hub": <Send aria-hidden="true" />,
  todo: <List aria-hidden="true" />,
  packages: <Package aria-hidden="true" />,
  "agents-list": <User aria-hidden="true" />,
  "agents-discover": <Compass aria-hidden="true" />,
  manuscripts: <Book aria-hidden="true" />,
  comps: <BookCopy aria-hidden="true" />,
};

export interface FlyoutRowSpec {
  key: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  active: boolean;
  onClick: () => void;
}

/** The floating quick-nav capsule — presentational; exported for the structural locks. */
export const ShellFlyout: React.FC<{
  kicker: string;
  rows: FlyoutRowSpec[];
  onExpand: () => void;
  /** Fixed top from the rib's rect (top-aligned, −8px); clamped to the viewport on layout. */
  top: number;
  show: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ kicker, rows, onExpand, top, show, onMouseEnter, onMouseLeave }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    el.style.top = `${Math.min(top, window.innerHeight - el.offsetHeight - 20)}px`;
  }, [top, rows.length]);
  return (
    <div
      ref={ref}
      className={`sv2-fly${show ? " show" : ""}`}
      style={{ top }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="sv2-fk">{kicker}</div>
      {rows.map((row) => (
        <button
          key={row.key}
          type="button"
          className={`sv2-frow${row.active ? " on" : ""}`}
          aria-current={row.active ? "page" : undefined}
          onClick={row.onClick}
        >
          {row.icon}
          <span className="sv2-flbl">{row.label}</span>
          {row.count !== undefined && <span className="sv2-fct">{row.count}</span>}
        </button>
      ))}
      <button type="button" className="sv2-ff" onClick={onExpand}>
        Expand sidebar
        <span className="sv2-fkb">⌘\</span>
      </button>
    </div>
  );
};

/* ── rail capsule ─────────────────────────────────────────────────────────── */

/* (ShellRail is RETIRED — one-sidebar pack: the rail and the panel are ONE capsule now.
   Its ribs became sidebar rows; its flyouts moved into ShellSide, which owns the hover state
   so a collapsed row can still reach a page without expanding.) */

/* ── panel capsule frame ──────────────────────────────────────────────────── */

export const ShellSide: React.FC<{
  /** ONE capsule, two widths (one-sidebar pack): 62px collapsed, 280px expanded. */
  collapsed?: boolean;
  /** Navigate to a path, clearing the global search (AppShell's goPath). */
  onNavigatePath: (path: string) => void;
  /** Expansion is manual — the flyout footer offers it. */
  onExpand?: () => void;
  children?: (ribProps: (key: string) => Record<string, unknown>) => React.ReactNode;
}> = ({ collapsed = false, onNavigatePath, onExpand, children }) => {
  const { pathname } = useLocation();
  const counts = useShellNavCounts();
  const activePage = shellPageForPath(pathname)?.page.key ?? null;

  // ── the hover FLYOUTS, unchanged in behaviour and now MORE load-bearing: with one capsule
  // there is no second container to reveal, so hovering a collapsed row is the only way to
  // reach a page without expanding. The ~140ms grace carries the pointer row → flyout.
  const [fly, setFly] = useState<{ key: FlyoutKey; top: number } | null>(null);
  const hideTimer = useRef<number | null>(null);
  const cancelHide = () => {
    if (hideTimer.current !== null) { window.clearTimeout(hideTimer.current); hideTimer.current = null; }
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setFly(null), 140);
  };
  const openFly = (key: FlyoutKey) => (e: React.SyntheticEvent) => {
    if (!collapsed) return;
    cancelHide();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFly({ key, top: rect.top - 8 });
  };
  useEffect(() => { if (!collapsed) setFly(null); }, [collapsed]);
  useEffect(() => () => cancelHide(), []);

  const closeAnd = (fn: () => void) => () => { setFly(null); fn(); };
  const flyoutRows = (key: FlyoutKey): FlyoutRowSpec[] => {
    if (key === "setup") {
      return [
        {
          key: "task-settings", label: "Task settings",
          icon: <SlidersHorizontal aria-hidden="true" />, active: false,
          onClick: closeAnd(() => {
            window.dispatchEvent(new CustomEvent("sa:open-task-settings"));
            onNavigatePath("/todo");
          }),
        },
        {
          key: "help", label: "Help centre",
          icon: <HelpCircle aria-hidden="true" />, active: pathname === "/help",
          onClick: closeAnd(() => onNavigatePath("/help")),
        },
      ];
    }
    const section = SHELL_SECTIONS.find((s) => s.key === key)!;
    return section.pages.map((page) => ({
      key: page.key,
      label: page.label,
      icon: PAGE_ICONS[page.key],
      count: counts[page.key],
      active: activePage === page.key,
      onClick: closeAnd(() => onNavigatePath(page.path)),
    }));
  };
  const flyKicker = (key: FlyoutKey): string =>
    key === "setup" ? "Setup" : SHELL_SECTIONS.find((s) => s.key === key)!.label;

  /** Hover/focus hooks for a row — live only while collapsed, and never for Dashboard. */
  const ribProps = (key: string): Record<string, unknown> =>
    collapsed && (FLYOUT_SECTIONS as readonly string[]).includes(key)
      ? {
          "data-fly": key,
          onMouseEnter: openFly(key as FlyoutKey),
          onMouseLeave: scheduleHide,
          onFocus: openFly(key as FlyoutKey),
          onBlur: scheduleHide,
        }
      : {};

  return (
    <aside className="sv2-side sv2-cap" aria-label="Sections">
      {children?.(ribProps)}
      {collapsed && fly && (
        <ShellFlyout
          kicker={flyKicker(fly.key)}
          rows={flyoutRows(fly.key)}
          onExpand={() => { setFly(null); onExpand?.(); }}
          top={fly.top}
          show
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}
    </aside>
  );
};

/* ── top bar (inside the content capsule) ─────────────────────────────────── */

export const ShellTopBar: React.FC<{
  routeKey: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Panel collapse — the DASHBOARD crumb slot depends on it (tone/crumb pack). */
  collapsed?: boolean;
}> = ({ routeKey, searchQuery, setSearchQuery, onNavigate, collapsed = false }) => {
  const { pathname } = useLocation();
  const crumb = shellCrumbForPath(pathname);
  const searchRef = useRef<HTMLInputElement | null>(null);
  // The dashboard's crumb slot is special (tone/crumb pack): the brand lives in the panel, so
  // when the panel goes the mark moves here; with the panel showing, the slot reads as prose.
  // Handled at the RENDER, not in shellV2Nav — the model's "Dashboard" label is shared with the
  // accordion row, and renaming it there would rename the nav item too.
  const isDashboard = pathname === SHELL_DASHBOARD.path;

  // ⌘K — focus the global search. The To-do page owns its route-local ⌘K registration (one
  // live owner per route, the long-standing invariant), so this handler stands down there.
  useEffect(() => {
    if (routeKey === "todo") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [routeKey]);

  return (
    <header className="sv2-topbar">
      {isDashboard ? (
        collapsed ? (
          // Panel collapsed — the brand mark stands in for it (same artwork, bar-sized).
          <div className="sv2-crumbmark">
            <ScriptAllyLogo heightPx={22} />
          </div>
        ) : (
          <div className="sv2-crumb"><b>Your dashboard</b></div>
        )
      ) : (
        crumb && (
          <div className="sv2-crumb">
            {crumb.section !== crumb.page && (
              <>
                <span>{crumb.section}</span>
                <span className="sv2-sl">/</span>
              </>
            )}
            <b>{crumb.page}</b>
          </div>
        )
      )}
      {/* The save-state chip is REMOVED (fixes pack Phase 4): crumb left, search right,
          nothing else. It was purely presentational — no save-state logic existed to keep. */}
      <div className="sv2-grow" />
      <div className="sv2-gsearch">
        <NavSearch
          variant="capsule"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNavigate={onNavigate}
          inputRef={searchRef}
        />
      </div>
    </header>
  );
};
