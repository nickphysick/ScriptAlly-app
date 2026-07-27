/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ShellV2 — the v2 app-shell chrome (ref design-refs/scriptally-shell-v2.html): the 74px icon
 * rail (mono captions, tab-tongue active state), the 288px paper-grain sidebar frame with the
 * ScriptAlly masthead (section kicker + the account-level querying week), and the 56px canvas
 * top bar (breadcrumb · save-state chip · the shared NavSearch, focused by ⌘K).
 *
 * Phase 2 of the shell rollout builds the FRAME; the sidebar contents below the masthead (nav,
 * manuscript switcher, task ledger, actions, Pro line, user block) arrive in Phase 3 through
 * ShellSide's `children` slot. Display of every sv2 element is class + media-query driven
 * (shellV2.css) — never inline. The paper grain reuses the canonical PAGE_GRAIN data-URI as an
 * inline style (the Tailwind v4 CSS parser rejects data-URIs in .css files — known trap).
 *
 * The masthead week number reuses weekOfQuerying (lib/dashboardStats) — the account-level
 * ISO-week derivation the dashboard greeting already renders; never manuscript-scoped.
 */
import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { LayoutGrid, Send, Users, Book, Settings, PanelLeft } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { weekOfQuerying } from "../../lib/dashboardStats";
import { PAGE_GRAIN } from "../../lib/designTokens";
import { NavSearch } from "../NavSearch";
import { SHELL_SECTIONS, SHELL_SETUP, shellCrumbForPath, shellSectionKeyForPath } from "./shellV2Nav";
import "./shellV2.css";

const SECTION_ICONS: Record<string, React.ComponentType<{ "aria-hidden"?: boolean | "true" }>> = {
  desk: LayoutGrid,
  queries: Send,
  agents: Users,
  shelf: Book,
};

/** The paper-plane brand mark (mockup .mark), white on the dark rail. */
const Mark: React.FC = () => (
  <svg className="sv2-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.7 2.3 2.6 9.6c-.8.3-.8 1.4 0 1.7l6.1 2.3 2.3 6.1c.3.8 1.4.8 1.7 0l7.3-19.1c.3-.7-.4-1.4-1.1-1.1L21.7 2.3Zm-2.4 2.2L10 13.8 6 12.3l13.3-5.1v-.2Z" />
  </svg>
);

/* ── icon rail ─────────────────────────────────────────────────────────────── */

export const ShellRail: React.FC<{
  /** Navigate to a path, clearing the global search (and untucking the sidebar — AppShell's). */
  onNavigatePath: (path: string) => void;
}> = ({ onNavigatePath }) => {
  const { pathname } = useLocation();
  const activeKey = shellSectionKeyForPath(pathname);
  return (
    <nav className="sv2-rail" aria-label="Sections">
      <Mark />
      <div className="sv2-railnav">
        {SHELL_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.key];
          const on = activeKey === section.key;
          return (
            <button
              key={section.key}
              type="button"
              className={on ? "sv2-railbtn on" : "sv2-railbtn"}
              aria-current={on ? "page" : undefined}
              onClick={() => onNavigatePath(section.path)}
            >
              <Icon aria-hidden="true" />
              <span>{section.caption}</span>
            </button>
          );
        })}
      </div>
      <div className="sv2-railspacer" />
      <div className="sv2-railfoot">
        <button type="button" className="sv2-railbtn" onClick={() => onNavigatePath(SHELL_SETUP.path)}>
          <Settings aria-hidden="true" />
          <span>{SHELL_SETUP.caption}</span>
        </button>
      </div>
    </nav>
  );
};

/* ── sidebar frame + masthead ─────────────────────────────────────────────── */

export const ShellSide: React.FC<{
  tucked: boolean;
  onToggleTuck: () => void;
  /** Phase 3 slot — the sidebar contents below the masthead. */
  children?: React.ReactNode;
}> = ({ tucked, onToggleTuck, children }) => {
  const { pathname } = useLocation();
  const { queries } = useScriptAllyDb();
  const crumb = shellCrumbForPath(pathname);
  return (
    <aside className="sv2-side" style={{ backgroundImage: PAGE_GRAIN }} aria-hidden={tucked || undefined}>
      <div className="sv2-side-inner">
        <div className="sv2-mh">
          <div className="sv2-mhtop">
            <div className="sv2-mhname">ScriptAlly</div>
            <button
              type="button"
              className="sv2-tuck"
              onClick={onToggleTuck}
              aria-pressed={tucked}
              title="Tuck the sidebar (⌘\)"
              aria-label="Tuck the sidebar"
            >
              <PanelLeft aria-hidden="true" />
            </button>
          </div>
          <div className="sv2-mhrule" />
          <div className="sv2-mhkick">
            <span className="sv2-sect">{crumb?.section ?? "ScriptAlly"}</span>
            <span>{weekOfQuerying(queries, new Date())}</span>
          </div>
        </div>
        {children}
      </div>
    </aside>
  );
};

/* ── top bar ──────────────────────────────────────────────────────────────── */

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
  // The dashboard's DashTopBar retired in Phase 7 — this bar owns dashboard ⌘K now.
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
          <span>{crumb.section}</span>
          <span className="sv2-sl">/</span>
          <b>{crumb.page}</b>
        </div>
      )}
      {/* Save-state chip — presentational for now: no live pending-writes source exists yet
          (flagged in the rollout report); the chrome reserves the slot the pack bakes. */}
      <div className="sv2-state">
        <i aria-hidden="true" />
        All changes saved
      </div>
      <div className="sv2-grow" />
      <div className="sv2-gsearch">
        <NavSearch
          variant="rail"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNavigate={onNavigate}
          inputRef={searchRef}
        />
      </div>
    </header>
  );
};
