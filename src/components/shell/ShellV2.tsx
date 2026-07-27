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
import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { LayoutGrid, Send, Users, Book, Settings, PanelLeft } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { NavSearch } from "../NavSearch";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { SHELL_RAIL, SHELL_SETUP, shellCrumbForPath, shellSectionKeyForPath } from "./shellV2Nav";
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

/* ── rail capsule ─────────────────────────────────────────────────────────── */

export const ShellRail: React.FC<{
  /** Navigate to a path, clearing the global search (AppShell's goPath). */
  onNavigatePath: (path: string) => void;
  /** Panel collapse (fixes pack): while collapsed, the rail carries the expand toggle. */
  collapsed?: boolean;
  onExpand?: () => void;
}> = ({ onNavigatePath, collapsed = false, onExpand }) => {
  const { pathname } = useLocation();
  const { currentUser } = useScriptAllyDb();
  const activeKey = shellSectionKeyForPath(pathname);
  const initials = (currentUser?.name ?? "")
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <nav className="sv2-rail sv2-cap" aria-label="Sections">
      <Mark />
      {/* The expand toggle — the same two-pane glyph as the panel's tuck, directly beneath the
          brand glyph, only while the panel is away. */}
      {collapsed && (
        <button
          type="button"
          className="sv2-rib sv2-railtuck"
          title="Show the panel (⌘\)"
          aria-label="Show the panel"
          onClick={onExpand}
        >
          <PanelLeft aria-hidden="true" />
        </button>
      )}
      <div className="sv2-railnav">
        {SHELL_RAIL.map((rib) => {
          const Icon = RAIL_ICONS[rib.key];
          const on = activeKey === rib.key;
          return (
            <button
              key={rib.key}
              type="button"
              className={on ? "sv2-rib on" : "sv2-rib"}
              aria-current={on ? "page" : undefined}
              title={rib.caption}
              aria-label={rib.caption}
              onClick={() => onNavigatePath(rib.path)}
            >
              <Icon aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className="sv2-railspacer" />
      <button
        type="button"
        className="sv2-rib"
        title={SHELL_SETUP.caption}
        aria-label={SHELL_SETUP.caption}
        onClick={() => onNavigatePath(SHELL_SETUP.path)}
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
      {/* Save-state chip — presentational for now: no live pending-writes source exists
          (flagged in the rollout report); the chrome reserves the slot the pack bakes. */}
      <div className="sv2-state">
        <i aria-hidden="true" />
        All changes saved
      </div>
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
