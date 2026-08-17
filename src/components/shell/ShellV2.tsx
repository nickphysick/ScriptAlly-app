/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ShellV2 — the CAPSULE shell chrome (ref design-refs/scriptally-shell-canonical.html): the 70px
 * icon rail capsule (burgundy plane glyph, icon-only ribs with tooltips, Setup at the foot — the
 * avatar chip is RETIRED), the 288px panel capsule (a 58px head band carrying the wordmark, or
 * the "Navigate" label on the dashboard where the bar has the wordmark instead; contents
 * in ShellSidebar), and the content capsule's 58px top bar — wordmark-or-breadcrumb · divider ·
 * scope · the search OPENER (⌘K) · help · the user block. The bar no longer holds a search
 * field: it opens the command palette, which is the app's one search.
 *
 * The flat shell's tab tongue, captions, masthead rule/kicker and tuck control are RETIRED
 * (collapse behaviour is an open question — deliberately not built). Display of every sv2
 * element is class + media-query driven (shellV2.css) — never inline.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutGrid, Send, Users, Book, Settings, PanelLeft, List, Package, User, Compass, BookCopy,
  SlidersHorizontal, HelpCircle, ChevronDown, ChevronLeft, Search, ListChecks, CalendarDays, StickyNote, Sun,
} from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { MobileDetailSpec } from "./mobileChrome";
import { useShellNavCounts } from "./ShellSidebar";
import {
  SHELL_DASHBOARD, SHELL_RAIL, SHELL_SECTIONS, SHELL_SETUP, SHELL_SETUP_PATHS, ShellV2Section, railClickPlan,
  shellCrumbForPath, shellPageForPath, shellSectionKeyForPath,
} from "./shellV2Nav";
import "./shellV2.css";

const RAIL_ICONS: Record<string, React.ComponentType<{ "aria-hidden"?: boolean | "true" }>> = {
  dashboard: LayoutGrid,
  querying: Send,
  // ⚠️ A PARALLEL SURFACE, not type-linked to SHELL_SECTIONS (the same trap the comps rail entry
  // hit): a section with no icon here renders nothing at all. Add both, always.
  todo: ListChecks,
  agents: Users,
  shelf: Book,
};

/** The paper-plane brand glyph (capsule mockup .mk) — small, burgundy, top of the rail. */
const Mark: React.FC = () => (
  <svg className="sv2-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.7 2.3 2.6 9.6c-.8.3-.8 1.4 0 1.7l6.1 2.3 2.3 6.1c.3.8 1.4.8 1.7 0l7.3-19.1c.3-.7-.4-1.4-1.1-1.1Z" />
  </svg>
);

/* (THE RAIL, ITS FLYOUTS AND THE SIDE PANEL ARE RETIRED — app-shell pack, Phase 2: one
   expanding column replaced them. Flyouts existed only because the column was hard to open;
   clicking a section while collapsed now expands and opens in one move, so the second surface
   that had to agree with the panel about everything is gone.

   ⚠️ AND THAT COLUMN IS GONE TOO (shell-rebuild pack, Phase 3): the DOUBLE-DECKER superseded it,
   and FLYOUTS CAME BACK WITH IT — a 52px rail has nowhere to put an accordion, so the collapsed
   state needs a second surface again. See WorkspaceShell.tsx. What survives in THIS file is the
   bar's <768px variant, which is the phone's only bar. */

/* ── top bar (inside the content capsule) ─────────────────────────────────── */

export const ShellTopBar: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
  /** The manuscript SCOPE control — it lives in the bar so which manuscript you are working on
   *  is visible on every page and in every state. ⚠️ Whatever renders here MUST keep writing
   *  `scriptally_active_manuscript_id`: Packages, Comps and Manuscripts read it, and they break
   *  SILENTLY without it — no error, just the wrong manuscript. */
  scope?: React.ReactNode;
  onOpenSearch?: () => void;
  searchOpenerRef?: React.RefObject<HTMLButtonElement | null>;
  /** The tuck collapses the column — the bar's only chrome control. */
  onTuck?: () => void;
  /** The account block opens the SHARED AccountMenu (one component, both shells). */
  accountMenu?: React.ReactNode;
  /** Opens the account menu, handing it the element to anchor against (it is portalled). */
  onOpenAccount?: (anchor: HTMLElement) => void;
  mobileDetail?: MobileDetailSpec | null;
  onOpenYou?: () => void;
}> = ({ onNavigate, scope, onOpenSearch, searchOpenerRef, onTuck, accountMenu, onOpenAccount, mobileDetail, onOpenYou }) => {
  const { pathname } = useLocation();
  const { currentUser } = useScriptAllyDb();
  const crumb = shellCrumbForPath(pathname);
  const initials = (currentUser?.name ?? "")
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sv2-topbar">
      {/* ⚠️ PER-PAGE ACTIONS DO NOT GO IN THIS BAR. It answers two questions — where am I, and
          which manuscript — and it must not accumulate page-specific buttons. A page's actions
          live in the tool row beneath its title (PageHeader). */}
      <button type="button" className="sv2-tuck" onClick={onTuck} title="Collapse the column" aria-label="Collapse the column">
        <PanelLeft aria-hidden="true" />
      </button>
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
      <span className="sv2-vr" aria-hidden="true" />
      {scope}
      <div className="sv2-grow" />
      <div className="sv2-tbright">
        <div className="sv2-gsearch sv2-gsearch-r">
          <button type="button" className="sv2-searchopen" onClick={onOpenSearch} ref={searchOpenerRef}>
            <Search aria-hidden="true" />
            <span className="sv2-sotext">Search…</span>
            <span className="sv2-sokb" aria-hidden="true">⌘K</span>
          </button>
        </div>
        {currentUser && (
          <span className="sv2-acctwrap">
            <button type="button" className="sv2-tbuser" onClick={(e) => onOpenAccount?.(e.currentTarget)} title="Account" aria-haspopup="menu">
              <span className="sv2-tbav" aria-hidden="true">{initials}</span>
              <span className="sv2-tbname">{currentUser.name}</span>
              <ChevronDown className="sv2-tbuchev" aria-hidden="true" />
            </button>
            {accountMenu}
          </span>
        )}
      </div>
    </header>
  );
};
