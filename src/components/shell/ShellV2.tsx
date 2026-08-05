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
  SlidersHorizontal, HelpCircle, ChevronDown, ChevronLeft, Search,
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
   that had to agree with the panel about everything is gone. See ShellColumn.tsx.) */

/* ── top bar (inside the content capsule) ─────────────────────────────────── */

export const ShellTopBar: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
  /** The manuscript SCOPE control, rendered by the shell and seated in the bar (top-bar
   *  rebuild): it left the sidebar entirely, so which manuscript you are working on is visible
   *  on every page and in every state — it used to vanish the moment the panel collapsed. */
  scope?: React.ReactNode;
  /** Help's existing behaviour, lifted out of the retired floating FAB. */
  onHelp?: () => void;
  /** THE SEARCH IS AN OPENER now — the palette takes the typing (palette pack). */
  onOpenSearch?: () => void;
  /** Focus returns to this control when the palette closes. */
  searchOpenerRef?: React.RefObject<HTMLButtonElement | null>;
  /** Mobile Pass 1 — the ACTIVE route's pushed detail (back/title or Cancel·title·Done). All
   *  detail elements are <md-only by CSS, so a registered spec changes nothing at md+. */
  mobileDetail?: MobileDetailSpec | null;
  /** Mobile Pass 1 — the avatar opens the you-menu sheet (<md only; desktop keeps the user
   *  block navigating to /account). */
  onOpenYou?: () => void;
}> = ({ onNavigate, scope, onHelp, onOpenSearch, searchOpenerRef, mobileDetail = null, onOpenYou }) => {
  const { pathname } = useLocation();
  const { currentUser } = useScriptAllyDb();
  // THE BAR HAS TWO STATES, ONE COMPONENT (ref design-refs/scriptally-bar-per-page.html).
  // Exactly two things differ — wordmark vs crumb, and where the search sits — so the bar never
  // reads as a different component between pages. Everything else is constant.
  const isDashboard = pathname === SHELL_DASHBOARD.path;
  const crumb = shellCrumbForPath(pathname);

  // (⌘K is registered ONCE, globally, by the palette host in AppShell — it must work from
  // anywhere including inside a text field, which a bar-local listener could not promise.)

  // THE OPENER — it still looks like the field it replaced, because it is still the thing you
  // click to search; it simply hands the typing to the palette.
  const search = (
    <button type="button" className="sv2-searchopen" onClick={onOpenSearch} ref={searchOpenerRef}>
      <Search aria-hidden="true" />
      <span className="sv2-sotext">Search agents, queries, notes…</span>
      <span className="sv2-sokb" aria-hidden="true">⌘K</span>
    </button>
  );
  // Help stops being a thing stuck to the viewport and becomes chrome. (The TIMELINE is out of
  // scope entirely — it stays exactly as it is.)
  const help = (
    <button type="button" className="sv2-tbicon" onClick={onHelp} title="Help" aria-label="Help">
      <HelpCircle aria-hidden="true" />
    </button>
  );

  // THE USER BLOCK — avatar · name · chevron, at the right end, on EVERY page.
  // It ALSO sits at the panel's foot. ⚠️ That duplication is INTENTIONAL AND APPROVED (canonical
  // shell pack): the bar's copy is the one that survives the panel collapsing, and the panel's
  // carries the plan line. Do not "tidy" either away. The rail's third copy is what went.
  const initials = (currentUser?.name ?? "")
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const user = currentUser && (
    <button type="button" className="sv2-tbuser" onClick={() => onNavigate("account")} title="Account">
      <span className="sv2-tbav" aria-hidden="true">{initials}</span>
      <span className="sv2-tbname">{currentUser.name}</span>
      <ChevronDown className="sv2-tbuchev" aria-hidden="true" />
    </button>
  );

  return (
    <header className={`sv2-topbar${isDashboard ? " sv2-tb-dash" : ""}${mobileDetail ? " sv2-tb-mdetail" : ""}`}>
      {/* MOBILE DETAIL (Mobile Pass 1, baked decision 5) — a pushed screen swaps the bar to
          ‹ back (query detail) or Cancel · title · Done (agent editor). Every element here is
          display:none at md+ (mobileShell.css), so desktop never sees them. */}
      {mobileDetail &&
        (mobileDetail.kind === "back" ? (
          <button type="button" className="sv2m-back" onClick={mobileDetail.onBack}>
            <ChevronLeft aria-hidden="true" />
            {mobileDetail.title}
          </button>
        ) : (
          <>
            <button type="button" className="sv2m-cancel" onClick={mobileDetail.onCancel}>
              Cancel
            </button>
            <span className="sv2m-dtitle">{mobileDetail.title}</span>
            <button type="button" className="sv2m-done" onClick={mobileDetail.onDone}>
              {mobileDetail.doneLabel ?? "Done"}
            </button>
          </>
        ))}
      {/* LEFT (ref design-refs/scriptally-bar-per-page.html) — the front door names the product;
          a working page names your location. THE BREADCRUMB IS BACK on every non-dashboard page:
          with the wordmark gone from those pages the slot stood empty, and orientation is what
          belongs in it. The DASHBOARD crumb rule stays deleted — the dashboard reads the
          wordmark, never a crumb, so that rule has nothing to come back to. */}
      {isDashboard ? (
        <span className="sv2-tbbrand">
          {/* The id is set HERE and nowhere else, so inspecting the brand measures THIS
              instance — the panel's and the mobile bar's copies no longer collide with it. */}
          <ScriptAllyLogo heightPx={38} id="scriptally-brand-logo-root" />
        </span>
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
      <span className="sv2-vr" aria-hidden="true" />
      {scope}
      <div className="sv2-grow" />
      {/* SEARCH — on the dashboard it sits on the TRUE MIDLINE, absolutely centred so the flank
          widths can never pull it off the line; on working pages it returns to the right, and
          narrower, inside the tools cluster. */}
      {isDashboard ? (
        <>
          <div className="sv2-gsearch sv2-gsearch-c">{search}</div>
          <div className="sv2-tbright">{help}{user}</div>
        </>
      ) : (
        <div className="sv2-tbright">
          <div className="sv2-gsearch sv2-gsearch-r">{search}</div>
          {help}
          {user}
        </div>
      )}
      {/* MOBILE CLUSTER (Mobile Pass 1, concept frames 01/02/05) — the search opener as an icon
          and the avatar as the you-menu trigger. <md only by CSS; desktop keeps the pill + the
          user block above. */}
      <button type="button" className="sv2m-iconbtn" onClick={onOpenSearch} aria-label="Search">
        <Search aria-hidden="true" />
      </button>
      {currentUser && (
        <button
          type="button"
          className="sv2m-av"
          onClick={onOpenYou}
          aria-label="Your account and shortcuts"
          aria-haspopup="dialog"
        >
          {initials}
        </button>
      )}
    </header>
  );
};
