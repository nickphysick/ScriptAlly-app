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
  LayoutGrid, Send, Users, Book, Settings, PanelLeft, List, Package, User, Compass, BookCopy,
  SlidersHorizontal, HelpCircle,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { NavSearch } from "../NavSearch";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { useShellNavCounts } from "./ShellSidebar";
import {
  SHELL_RAIL, SHELL_SECTIONS, SHELL_SETUP, SHELL_SETUP_PATHS, ShellV2Section, railClickPlan,
  shellCrumbForPath, shellPageForPath, shellSectionKeyForPath,
} from "./shellV2Nav";
import "./shellV2.css";

const RAIL_ICONS: Record<string, React.ComponentType<{ "aria-hidden"?: boolean | "true" }>> = {
  dashboard: LayoutGrid,
  querying: Send,
  agents: Users,
  shelf: Book,
};

/** The paper-plane brand glyph (capsule mockup .mk) — small, burgundy, top of the rail. */
const Mark: React.FC = () => (
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

export const ShellRail: React.FC<{
  /** Navigate to a path, clearing the global search (AppShell's goPath). */
  onNavigatePath: (path: string) => void;
  /** Panel collapse (fixes pack): while collapsed, the rail carries the flyouts. */
  collapsed?: boolean;
  onExpand?: () => void;
  /** The rail selects a SECTION (rail-section-select pack): expand the panel and open this
   *  accordion section (null = open none — the on-Dashboard expand). Never navigates. */
  onBrowse?: (section: ShellV2Section["key"] | null) => void;
  /** The accordion's open section (rail-icon-toggle pack) — AppShell owns it; the click
   *  policy keys COLLAPSE off this, never off the route's section. */
  openSection?: ShellV2Section["key"] | null;
  /** The OPEN section's icon toggles the panel shut (rail-icon-toggle pack). */
  onCollapse?: () => void;
}> = ({ onNavigatePath, collapsed = false, onExpand, onBrowse, openSection = null, onCollapse }) => {
  const { pathname } = useLocation();
  const { currentUser } = useScriptAllyDb();
  const counts = useShellNavCounts();
  const activeKey = shellSectionKeyForPath(pathname);
  const activePage = shellPageForPath(pathname)?.page.key ?? null;
  const initials = (currentUser?.name ?? "")
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  // ── flyout state: which section, anchored where; the ~140ms grace timer lets the pointer
  // travel rib → flyout (interaction logic — the appearance itself is the CSS .show class).
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

  // The open flyout's rows — nav sections from the model; Setup's pair is bespoke (Task
  // settings triggers the modal: it lives in the To-do page, so the row navigates there and
  // dispatches the existing sa:open-task-settings event).
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

  const ribFlyProps = (key: FlyoutKey) =>
    collapsed
      ? {
          "data-fly": key,
          onMouseEnter: openFly(key),
          onMouseLeave: scheduleHide,
          onFocus: openFly(key),
          onBlur: scheduleHide,
        }
      : {};

  return (
    <nav className="sv2-rail sv2-cap" aria-label="Sections">
      <Mark />
      {/* (The dedicated expand control is RETIRED — rail-section-select pack P2. Expansion
          comes from any section icon, the Dashboard icon when already on Dashboard, and ⌘\;
          the flyout footer advertises it, and the panel's tuck control keeps collapse
          discoverable.) */}
      <div className="sv2-railnav">
        {SHELL_RAIL.map((rib) => {
          const Icon = RAIL_ICONS[rib.key];
          const on = activeKey === rib.key;
          const hasFly = rib.key !== "dashboard";
          return (
            <button
              key={rib.key}
              type="button"
              className={`sv2-rib${on ? " on" : ""}${fly?.key === rib.key ? " hovering" : ""}`}
              aria-current={on ? "page" : undefined}
              title={rib.caption}
              aria-label={rib.caption}
              onClick={() => {
                setFly(null);
                const plan = railClickPlan(rib.key, pathname, collapsed, openSection);
                if (plan.kind === "navigate") onNavigatePath(plan.path);
                else if (plan.kind === "browse") onBrowse?.(plan.section);
                else onCollapse?.();
              }}
              {...(hasFly ? ribFlyProps(rib.key as FlyoutKey) : {})}
            >
              <Icon aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className="sv2-railspacer" />
      <button
        type="button"
        className={`sv2-rib${SHELL_SETUP_PATHS.has(pathname) ? " on" : ""}${fly?.key === "setup" ? " hovering" : ""}`}
        aria-current={SHELL_SETUP_PATHS.has(pathname) ? "page" : undefined}
        title={SHELL_SETUP.caption}
        aria-label={SHELL_SETUP.caption}
        onClick={() => {
          setFly(null);
          const plan = railClickPlan("setup", pathname, collapsed, openSection);
          if (plan.kind === "navigate") onNavigatePath(plan.path);
          else if (plan.kind === "browse") onBrowse?.(plan.section);
          else onCollapse?.();
        }}
        {...ribFlyProps("setup")}
      >
        <Settings aria-hidden="true" />
      </button>
      {currentUser && (
        <button
          type="button"
          className="sv2-railav"
          title="Account"
          aria-label="Account"
          onClick={() => onNavigatePath("/account")}
        >
          {initials}
        </button>
      )}
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
    </nav>
  );
};

/* ── panel capsule frame ──────────────────────────────────────────────────── */

export const ShellSide: React.FC<{
  /** Panel collapse (fixes pack): hidden via the container's state class (CSS transition). */
  collapsed?: boolean;
  onCollapse?: () => void;
  /** The panel contents below the brand (ShellSidebarBody). */
  children?: React.ReactNode;
}> = ({ collapsed = false, onCollapse, children }) => (
  <aside className="sv2-side sv2-cap" aria-hidden={collapsed || undefined}>
    <div className="sv2-side-inner">
      {/* The real brand artwork, large and centred (capsule spec item 1) — the canonical
          height-locked wordmark component; alt="ScriptAlly" rides inside it. Never restyled.
          The tuck toggle sits top-right, vertically centred on the mark (fixes pack). */}
      <div className="sv2-wmrow">
        <div className="sv2-wm">
          <ScriptAllyLogo heightPx={30} />
        </div>
        <button
          type="button"
          className="sv2-tuck"
          title="Hide the panel (⌘\)"
          aria-label="Hide the panel"
          onClick={onCollapse}
        >
          <PanelLeft aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
  </aside>
);

/* ── top bar (inside the content capsule) ─────────────────────────────────── */

export const ShellTopBar: React.FC<{
  routeKey: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ routeKey, searchQuery, setSearchQuery, onNavigate }) => {
  const { pathname } = useLocation();
  const crumb = shellCrumbForPath(pathname);
  const searchRef = useRef<HTMLInputElement | null>(null);

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
      {crumb && (
        <div className="sv2-crumb">
          {crumb.section !== crumb.page && (
            <>
              <span>{crumb.section}</span>
              <span className="sv2-sl">/</span>
            </>
          )}
          <b>{crumb.page}</b>
        </div>
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
