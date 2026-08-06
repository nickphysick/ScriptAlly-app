/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AppShell — the global chrome that wraps every routed page. The persistent left rail is
 * Navigation today: the v2 shell — the rail plus the top bar's breadcrumb (ShellV2). The
 * overnight-nav era's NavDrawer/CrumbStrip/DashTopBar chrome is long gone (shell follow-up P3;
 * the tombstones further down mark the slots they vacated).
 *
 * The content column holds the mobile slim bar (the old <Nav>, kept below md only) above the
 * STAGE — the app's scroll container (#app-stage-scroll). Pages render inside as persistent
 * StagePage slots (display-toggled, never unmounted) so page-local state survives navigation;
 * scroll position is remembered per route on the stage element.
 *
 * Theme: the `.t-capp` / `.t-bold` / `.t-edn` class lives on the shell root, so the CSS
 * variables reach the chrome (drawer included) and the pages. Critical border/colour styles
 * are inline or var(--…) — never Tailwind utilities (they have silently overridden inline-
 * critical colours in this codebase before). Tailwind is used for layout/breakpoints only.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Book, CalendarDays, Compass, HelpCircle, LayoutGrid, LineChart, ListChecks, LogOut, Package,
  Send, Settings, StickyNote, Sun, Upload, Users,
} from "lucide-react";
import { parchment } from "../../lib/designTokens";
import { ShellTopBar } from "./ShellV2";
import { WorkspaceShell } from "./WorkspaceShell";
import { workspaceSections } from "../../lib/workspaceNav";
import { AccountMenu } from "./AccountMenu";
import { usePalette } from "./usePalette";
import { ShellScope, useShellNavCounts } from "./ShellSidebar";
import { ShellV2Section, shellPageForPath } from "./shellV2Nav";
import { MobileChromeContext, MobileDetailSpec } from "./mobileChrome";
import { MobileSheet } from "./MobileSheet";
import { BottomTabBar } from "../BottomTabBar";
import { STAGE_SCROLL_ID } from "../../lib/stageScroll";
import { useScriptAllyDb } from "../../lib/db";
import { planLine } from "../../lib/shellSidebar";
import { BackgroundLab } from "../dev/BackgroundLab";
import "./contentColumn.css";
import "./mobileShell.css";

/* ── Stage page slot ─────────────────────────────────────────────────────── */

/**
 * A persistent page slot inside the stage. `active` toggles visibility only — the slot's children
 * stay mounted, preserving page-local state (Queries filters/sort/selection, etc.). Layouts:
 *  - "flow" (default): normal document flow; the stage scrolls when the page is tall.
 *  - "fill": exactly the visible stage height (viewport-locked pages own their internal scroll).
 *  - "fillColumn": as "fill" but a flex column (the agents sub-nav strip above a flex-1 page).
 *
 * The enter animation class is applied per activation and REMOVED on animationend: while it runs,
 * its transform makes the slot the containing block for position:fixed page furniture (floaters,
 * overlays), so it must never linger past the 180ms entry. Under prefers-reduced-motion the
 * animation is none (no transform), so a missing animationend is harmless.
 */
export const StagePage: React.FC<{
  active: boolean;
  layout?: "flow" | "fill" | "fillColumn";
  background?: string;
  /** Clip overflow (the Queries desk expects a non-scrolling, overflow-hidden host). */
  clip?: boolean;
  /** Content max-width cap (ultrawide). When set, the slot paints the theme desk full-width and
   *  centres the page inside a capped column (work 1600 / read 1200) — the ONE place a route
   *  declares its width kind. Omit → uncapped (the dashboard's exemption). See contentColumn.css. */
  contentVariant?: "work" | "read";
  children: React.ReactNode;
}> = ({ active, layout = "flow", background, clip = false, contentVariant, children }) => {
  const [entering, setEntering] = useState(false);
  const prevActive = useRef(false);
  React.useEffect(() => {
    if (active && !prevActive.current) setEntering(true);
    prevActive.current = active;
  }, [active]);
  // animationend is the fast path; the timeout is the guarantee (reduced-motion and lost/frozen
  // animation clocks never fire the event, and the transform must not outlive the entry).
  React.useEffect(() => {
    if (!entering) return;
    const id = window.setTimeout(() => setEntering(false), 250);
    return () => window.clearTimeout(id);
  }, [entering]);
  // Ultrawide cap + full-bleed crumb (ref crumb-fullwidth-v1.html, variant A): the theme desk
  // fills the slot; the crumb strip spans it edge-to-edge (window chrome, OUTSIDE the cap); the
  // page centres in the capped column below. --fill passes height:100% through for viewport-
  // locked (fill/fillColumn) pages. A crumbed contentVariant slot is a flex column so the crumb
  // is flex:none above the flex:1 capped column; flow slots stack as blocks (content-height).
  const isFillCol = layout === "fillColumn" || (contentVariant && layout === "fill");
  // CrumbStrip retired (shell follow-up P3): the v2 top bar draws the one breadcrumb; the slot
  // keeps only the width-cap column.
  const body = contentVariant ? (
    <div className={`sa-content-col sa-content-col--${contentVariant}${layout !== "flow" ? " sa-content-col--fill" : ""}`}>
      {children}
    </div>
  ) : (
    children
  );
  return (
    <div
      className={active && entering ? "stage-page-on" : undefined}
      onAnimationEnd={(e) => { if (e.animationName === "pageIn") setEntering(false); }}
      style={{
        display: active ? (isFillCol ? "flex" : "block") : "none",
        /* ⚠️ `flex:1; min-height:0` RATHER THAN `height:100%` (refinement §4). The stage is now a
           flex COLUMN inside the card, with the sticky bar as its first child. A viewport-locked
           page asking for 100% of that column would be a full height BELOW a 66px bar — the page
           would fit, the card would scroll 66px, and Query Centre's internal panes would sit in a
           second scroller. Filling the REMAINING space is what makes "no page scroll" true again. */
        ...(layout !== "flow" ? { flex: 1, minHeight: 0 } : {}),
        ...(isFillCol ? { flexDirection: "column" as const } : {}),
        ...(clip ? { overflow: "hidden" } : {}),
        // The slot paints NOTHING (canvas scheme 1): the stage's var(--shell-canvas) shows
        // through everywhere; the legacy `background` prop survives for any future explicit use.
        ...(background ? { background } : {}),
        minWidth: 0,
      }}
    >
      {body}
    </div>
  );
};

/* ── The shell ───────────────────────────────────────────────────────────── */

interface AppShellProps {
  /** Top-level route key ("dashboard" | "queries" | …) — drives nav highlight + scroll memory. */
  routeKey: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  theme: "cappuccino" | "bold" | "editorial";
  children: React.ReactNode;
}

const THEME_CLASS = { cappuccino: "t-capp", bold: "t-bold", editorial: "t-edn" } as const;

/** ⚠️ A PARALLEL SURFACE TO workspaceSections, and not type-linked to it: a section without an
 *  icon here renders an empty cell rather than crashing, so the failure is quiet. Add both, or
 *  the rail simply loses a glyph with nothing to point at. */
/* ⚠️ KEYED BY THE ITEM'S OWN ICON, not by section. The flat nav has no parent row to inherit
   from, so every destination carries one — a row without an icon among rows with them reads as
   broken. The GROUP keys (workspace/queries/…) stay: the rail's ribs still read them. */
const WORKSPACE_ICONS: Record<string, React.ReactNode> = {
  // rail ribs — one per group. (The `todo` GROUP key became `tasks` with the sidebar-IA fix,
  // 6 Aug — the To-do row left Workspace for its own TASKS section; the old key is deleted, not
  // aliased, so a stale section id loses its glyph loudly in the parity lock rather than half
  // working here.)
  workspace: <LayoutGrid aria-hidden="true" />,
  tasks: <ListChecks aria-hidden="true" />,
  queries: <Send aria-hidden="true" />,
  agents: <Users aria-hidden="true" />,
  materials: <Book aria-hidden="true" />,
  // panel rows — one per destination
  dash: <LayoutGrid aria-hidden="true" />,
  send: <Send aria-hidden="true" />,
  chart: <LineChart aria-hidden="true" />,
  check: <ListChecks aria-hidden="true" />,
  sun: <Sun aria-hidden="true" />,
  calendar: <CalendarDays aria-hidden="true" />,
  note: <StickyNote aria-hidden="true" />,
  people: <Users aria-hidden="true" />,
  compass: <Compass aria-hidden="true" />,
  folder: <Book aria-hidden="true" />,
};

export const AppShell: React.FC<AppShellProps> = ({ routeKey, onNavigate, searchQuery, setSearchQuery, theme, children }) => {
  // The palette's corpus reads these — already in memory on every route (DbProvider), so the
  // palette never fetches. currentUser/logout feed the mobile you-menu (Mobile Pass 1).
  const { agents, queries, manuscripts, currentUser, logout } = useScriptAllyDb();

  /* ⚠️ ONE FIGURE IN THE NAV NOW (Amendment 1, H5). The Queries attention count went with the
     filter children: with the sidebar carrying destinations rather than views, there is nothing
     under Queries for a count to describe, and a navigation column that displays figures is on
     its way to being a dashboard. `attentionCount` is NOT deleted — it still drives the hub's
     own filter and the parked mega panel. */
  const navCounts = useShellNavCounts();
  const sections = useMemo(
    () => workspaceSections({ todo: navCounts.todo ?? 0 }),
    [navCounts.todo],
  );

  const stageRef = useRef<HTMLDivElement>(null);
  // Per-route scroll memory: saved continuously while scrolling, restored on route change
  // (top for a first visit). Lives on the stage element — the window never scrolls now.
  const scrollMemo = useRef<Record<string, number>>({});

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (el) el.scrollTop = scrollMemo.current[routeKey] ?? 0;
  }, [routeKey]);

  // VI P3 — the help FAB's /todo two-item menu returns (the workbench-era route hide is
  // reversed; the board's sidebar no longer carries help).
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  // (NavDrawer retired — shell follow-up P3. The slim mobile Nav is retired too (Mobile Pass 1):
  // the v2 top bar now carries the <md variant itself — one bar, two breakpoint states — and the
  // rebuilt BottomTabBar is the floating tab capsule.)

  // ── MOBILE CHROME (Mobile Pass 1) ──
  // The you-menu sheet (concept frame 07) and the per-route pushed-detail registry. Pages
  // register a MobileDetailSpec under their OWN route key (mounted-but-inactive StagePage slots
  // can therefore never hide another route's tab bar); the shell reads only the active route's.
  const [youOpen, setYouOpen] = useState(false);
  // The SHARED account menu's open state — Phase 4's top-nav shell will drive the same component.
  const [accountOpen, setAccountOpen] = useState(false);

  const [mobileDetailMap, setMobileDetailMap] = useState<Record<string, MobileDetailSpec | null>>({});
  const setMobileDetail = useCallback((route: string, spec: MobileDetailSpec | null) => {
    setMobileDetailMap((prev) => (prev[route] === spec ? prev : { ...prev, [route]: spec }));
  }, []);
  const mobileChromeValue = useMemo(() => ({ setMobileDetail }), [setMobileDetail]);
  const activeMobileDetail = mobileDetailMap[routeKey] ?? null;

  // Panel collapse (fixes pack) — the rail IS the collapsed state (the deferred rail question,
  // resolved; no flyouts, no mini-panel). Persisted under the sa. UI-pref convention, REUSING
  // the flat shell's sa.shellSideTucked key (same concept — no key litter). ⌘\ toggles (the
  // ⌘K convention's sibling), registered HERE rather than in the top bar: the bar's ⌘K stands
  // down on /todo and the chord must work on every route. Skipped while an editable has focus.
  // The hide is a CSS transition on the container class (never JS timers).
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("sa.shellSideTucked") === "1"; } catch { return false; }
  });
  const setPanel = useCallback((value: boolean) => {
    setPanelCollapsed(value);
    try { localStorage.setItem("sa.shellSideTucked", value ? "1" : "0"); } catch { /* private mode */ }
  }, []);
  const togglePanel = useCallback(() => {
    setBrowsing(false); // a manual toggle ends any rail-initiated browse
    setPanelCollapsed((prev) => {
      const value = !prev;
      try { localStorage.setItem("sa.shellSideTucked", value ? "1" : "0"); } catch { /* private mode */ }
      return value;
    });
  }, []);

  // The rail selects a SECTION (rail-section-select pack), and — rail-icon-toggle pack — the
  // OPEN section's icon toggles the panel shut. The accordion's open section is OWNED HERE so
  // the rail's click policy can read the REAL open section at click time (collapse keys off
  // the open section, never the route's — the two differ while browsing). Route changes steer
  // it; ANY collapse snaps it back to the current page's section, so the panel never drifts;
  // "querying" seeds a fresh expanded mount on a sectionless route (the old sidebar default).
  const { pathname } = useLocation();
  const routeSec = shellPageForPath(pathname)?.section?.key ?? null;
  const [openSec, setOpenSec] = useState<ShellV2Section["key"] | null>(() => routeSec ?? "querying");
  useEffect(() => { if (routeSec) setOpenSec(routeSec); }, [routeSec]);
  useEffect(() => { if (panelCollapsed) setOpenSec(routeSec ?? null); }, [panelCollapsed, routeSec]);
  const onToggleSection = useCallback((key: ShellV2Section["key"]) => {
    setOpenSec((prev) => (prev === key ? null : key));
  }, []);
  // A browse expands the panel and steers the accordion — it never navigates. `browsing` marks
  // a rail-initiated expansion so an ABANDONED browse (Escape, or a click into page content
  // outside the panel/rail) collapses again. (The old {sec, n} bump channel is gone — the
  // state lives here now, so a browse is plain assignment.)
  const [browsing, setBrowsing] = useState(false);
  const onBrowse = useCallback((sec: ShellV2Section["key"] | null) => {
    setPanel(false);
    setBrowsing(true);
    setOpenSec(sec);
  }, [setPanel]);
  // One collapse path for the rail toggle, Escape and the outside click — ends any live browse.
  const collapsePanel = useCallback(() => {
    setPanel(true);
    setBrowsing(false);
  }, [setPanel]);
  // Escape closes the expanded panel regardless of how it was opened (no focus trap exists).
  useEffect(() => {
    if (panelCollapsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      collapsePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelCollapsed, collapsePanel]);
  // Abandon-a-browse: a pointer-down in page content (outside the panel AND the rail — rail
  // clicks are section switches or the toggle, never abandonment) while a browse is open.
  useEffect(() => {
    if (panelCollapsed || !browsing) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest(".sv2-side") || t.closest(".sv2-rail"))) return;
      collapsePanel();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [panelCollapsed, browsing, collapsePanel]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
        togglePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePanel]);

  // ── THE FOOT FADE (canonical shell pack). It appears ONLY when content continues below the
  // fold: a permanent fade over a short page reads as a rendering fault rather than an
  // affordance. The 8px slack keeps sub-pixel rounding from flickering it at the very bottom.
  const [fadeOn, setFadeOn] = useState(false);
  const updateFade = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    setFadeOn(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  }, []);
  // Re-check when the page changes and when the viewport does — the scroll event alone would
  // leave a freshly-navigated long page with no fade until the first scroll.
  useEffect(() => {
    updateFade();
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateFade);
      return () => window.removeEventListener("resize", updateFade);
    }
    // The CONTENT's height is what matters, not just the viewport's: pages that expand in place
    // (an accordion, a lazily-filled list) change the answer without a scroll or a resize.
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    window.addEventListener("resize", updateFade);
    return () => { ro.disconnect(); window.removeEventListener("resize", updateFade); };
  }, [pathname, updateFade]);

  /* ── THE COMMAND PALETTE. ⚠️ THE HOSTING MOVED TO `usePalette` (shell-rebuild pack, Phase 5)
     because it lived HERE, inside the workspace shell — which meant the top-nav shell had no
     palette at all: on /dashboard the search pill opened nothing and ⌘K did nothing. Copying the
     block into the second shell would have registered ⌘K twice. */
  const { openPalette, searchOpenerRef, palette } = usePalette({
    onNavigate, onNavigatePath: (to) => goPath(to), setSearchQuery,
  });

  // Chrome navigation — router-direct (new-code rule), clearing the global search the way the
  // handleNavigate bridge does on real navigation.
  const navigate = useNavigate();
  const goPath = useCallback(
    (path: string) => {
      setSearchQuery("");
      navigate(path);
    },
    [navigate, setSearchQuery]
  );

  // Auto-collapse on navigation (flyouts pack, baked option a): EVERY route change returns the
  // panel to the rail; expansion is manual (⌘\ / the expand control) and lasts until the next
  // navigation. Observed on the full pathname — routeKey alone would miss sibling moves like
  // /agents ↔ /agents/discover. The persisted key still tracks within-page toggling, but the
  // collapse-on-navigate wins on route change. First render is exempt (nothing was navigated).
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) { firstPath.current = false; return; }
    setPanelCollapsed(true);
    setBrowsing(false); // choosing a page ends the browse (the nav collapse covers it)
    try { localStorage.setItem("sa.shellSideTucked", "1"); } catch { /* private mode */ }
  }, [pathname]);

  return (
    <div
      className={`${THEME_CLASS[theme]} sv2-app ws-host${panelCollapsed ? " sv2-collapsed" : ""}`}
      data-sa-ground=""
      // ⚠️ THE DESK IS GONE (Amendment 1, A1). This was the sage-grey field the capsules floated
      // on; the workspace is full-screen now, so --shell-chrome IS the page ground and the
      // content is a white card laid on it. The grain went with the desk: it was texture for a
      // field that no longer exists, and grain under a full-bleed chrome ground is invisible work.
      // Layout (flex · viewport height · overflow) still lives on the .sv2-app class so the
      // mobile pass can swap 100vh → 100dvh below md.
      style={{ backgroundColor: "var(--shell-chrome)" }}
    >
      {/* THE DOUBLE-DECKER (shell-rebuild pack, Phase 3) — it replaces ShellColumn and the
          desktop top bar in one move. The rail is PAINT on a single column; the IA is a prop, so
          a nav change never means editing the shell. */}
      <WorkspaceShell
        sections={sections}
        icons={WORKSPACE_ICONS}
        onNavigatePath={goPath}
        onOpenSearch={openPalette}
        onOpenHelp={() => goPath("/help")}
        onOpenAccount={() => setAccountOpen((v) => !v)}
        onUpgrade={() => goPath("/plans")}
        onNavigate={onNavigate}
        scrollId={STAGE_SCROLL_ID}
        scrollRef={stageRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          scrollMemo.current[routeKey] = el.scrollTop;
          updateFade();
        }}
        footFade={
          /* THE FOOT FADE — only when there IS more below. A permanent fade over a short page
             reads as a rendering fault, so it is a state, not decoration. It is sticky inside the
             scroller now (it used to be absolute in a wrapper that no longer exists). */
          <div className={`sv2-fade${fadeOn ? " on" : ""}`} aria-hidden="true" />
        }
        accountMenu={
          <AccountMenu
            open={accountOpen}
            onClose={() => setAccountOpen(false)}
            name={currentUser?.name ?? ""}
            email={currentUser?.email}
            plan={currentUser?.plan}
            onNavigatePath={goPath}
            onSignOut={logout}
          />
        }
      >
        {/* ⚠️ THE MOBILE BAR IS UNTOUCHED AND STILL MOUNTED. Mobile Pass 1 is live and locked,
            and both rebuild mockups are desktop-only — so the new chrome is a ≥768px
            replacement and this keeps rendering below it. Removing it would take the phone's
            only bar with it. */}
        <div className="ws-mobilebar">
          <ShellTopBar
            onNavigate={onNavigate}
            scope={<ShellScope onNavigate={onNavigate} />}
            onOpenSearch={openPalette}
            searchOpenerRef={searchOpenerRef}
            onTuck={togglePanel}
            onOpenAccount={() => setAccountOpen((v) => !v)}
            mobileDetail={activeMobileDetail}
            onOpenYou={() => setYouOpen(true)}
          />
        </div>

        {/* ⚠️ THE STAGE MOVED INTO THE CARD (refinement §4). It is still the app's ONE scroll
            container and still carries STAGE_SCROLL_ID, the ref and the scroll memory — because
            stageScroll.ts and per-route restoration address it by id — but the element itself is
            now the card's `.ws-cscroll`, so the bar can be sticky above the scrolling content.
            Keeping a second scroller here would have double-scrolled every page. */}
        <MobileChromeContext.Provider value={mobileChromeValue}>{children}</MobileChromeContext.Provider>
      </WorkspaceShell>

      {palette}

      {/* (The floating help FAB is RETIRED — top-bar rebuild: help is a bar button now, so it
          is chrome rather than a thing measured from the browser edge. Its /todo two-item menu
          survives below, re-anchored under the bar's right end.) */}
      {helpMenuOpen && routeKey !== "help" && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={() => setHelpMenuOpen(false)} />
          <div
            role="menu"
            aria-label="Help"
            className="ashell-help-menu"
            style={{
              // re-anchored under the bar's right end (the FAB it hung off is retired)
              position: "fixed", top: 62, right: 24, zIndex: 41, minWidth: 176,
              background: parchment, border: "var(--bdw) solid var(--bd)", borderRadius: 12,
              boxShadow: "0 6px 24px rgba(58,28,20,0.16)", padding: 6, fontSize: 13,
            }}
          >
            <button type="button" role="menuitem" style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8, color: "inherit" }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(124,58,42,0.08)"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
              onClick={() => { setHelpMenuOpen(false); onNavigate("help"); }}>
              Help centre
            </button>
            <button type="button" role="menuitem" style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8, color: "inherit" }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(124,58,42,0.08)"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
              onClick={() => { setHelpMenuOpen(false); window.dispatchEvent(new CustomEvent("sa:todo-replay-tour")); }}>
              Replay the tour
            </button>
          </div>
        </>
      )}

      {/* The floating tab-bar capsule (<md). It stands down while the active route shows a
          pushed detail screen (baked decision 5) — the detail's own affordances take the foot. */}
      <BottomTabBar activeTab={routeKey} onNavigate={onNavigate} hidden={activeMobileDetail !== null} />

      {/* THE YOU-MENU (Mobile Pass 1, concept frame 07) — the avatar's sheet: user block with
          the plan as PLAIN SLATE TEXT (no Pro card), then the demoted destinations. Rows route
          to existing pages; nothing here is a new surface. */}
      <MobileSheet open={youOpen} onClose={() => setYouOpen(false)} ariaLabel="Your account and shortcuts">
        {currentUser && (
          <div className="sa-ymenu-user">
            <span className="sa-ymenu-av" aria-hidden="true">
              {currentUser.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <div>
              <div className="sa-ymenu-nm">{currentUser.name}</div>
              <div className="sa-ymenu-em">{currentUser.email}</div>
              <div className="sa-ymenu-plan">
                {planLine(currentUser.plan).label}
                {planLine(currentUser.plan).upgrade && (
                  <>
                    {" · "}
                    <button type="button" className="sa-ymenu-uplink" onClick={() => { setYouOpen(false); goPath("/plans"); }}>
                      Upgrade
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        <button type="button" className="sa-ymenu-row" onClick={() => { setYouOpen(false); goPath("/todo"); }}>
          <ListChecks aria-hidden="true" /> To-do
        </button>
        <button type="button" className="sa-ymenu-row" onClick={() => { setYouOpen(false); goPath("/manuscripts/packages"); }}>
          <Package aria-hidden="true" /> Submission packages
        </button>
        <button type="button" className="sa-ymenu-row" onClick={() => { setYouOpen(false); goPath("/import"); }}>
          <Upload aria-hidden="true" /> Import your queries
        </button>
        <button type="button" className="sa-ymenu-row" onClick={() => { setYouOpen(false); goPath("/account"); }}>
          <Settings aria-hidden="true" /> Account settings
        </button>
        <button type="button" className="sa-ymenu-row" onClick={() => { setYouOpen(false); goPath("/help"); }}>
          <HelpCircle aria-hidden="true" /> Help
        </button>
        <button type="button" className="sa-ymenu-row sa-ymenu-out" onClick={() => { setYouOpen(false); logout(); }}>
          <LogOut aria-hidden="true" /> Sign out
        </button>
      </MobileSheet>

      {/* DEV-only page-colour lab (local + scriptally-dev builds; statically false → tree-shaken
          from prod). Overrides ride an injected <style>; the root's data-sa-ground is its hook. */}
      {import.meta.env.DEV && <BackgroundLab theme={theme} />}
    </div>
  );
};
