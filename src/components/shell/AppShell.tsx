/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AppShell — the global chrome that wraps every routed page. The persistent left rail is
 * RETIRED (overnight nav run): navigation lives in the app-wide NavDrawer, opened from the
 * header menu buttons (CrumbStrip on workspace pages, DashTopBar on the dashboard), and the
 * content column is full-bleed to the left edge.
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
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { burgundy, parchment, FONT_SERIF, PAGE_GRAIN } from "../../lib/designTokens";
import { ShellRail, ShellSide, ShellTopBar } from "./ShellV2";
import { ShellSidebarBody } from "./ShellSidebar";
import { Nav } from "../Nav";
import { BottomTabBar } from "../BottomTabBar";
import { STAGE_SCROLL_ID } from "../../lib/stageScroll";
import { BackgroundLab } from "../dev/BackgroundLab";
import "./contentColumn.css";

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
        ...(layout !== "flow" ? { height: "100%" } : {}),
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

export const AppShell: React.FC<AppShellProps> = ({ routeKey, onNavigate, searchQuery, setSearchQuery, theme, children }) => {
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
  // (NavDrawer retired — shell follow-up P3: its last trigger left with CrumbStrip; the v2
  // rail + sidebar are the desktop navigation, the slim bar + BottomTabBar the mobile.)

  // (The flat shell's sidebar tuck + ⌘\ chord retired with the masthead — capsule Phase 3;
  // collapse behaviour is an open question, deliberately not built. The old
  // sa.shellSideTucked localStorage key is orphaned — noted in the report.)

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

  return (
    <div
      className={`${THEME_CLASS[theme]} sv2-app`}
      data-sa-ground=""
      // The capsule GROUND — the warm grained field all three capsules float on (the paper
      // grain reuses the canonical PAGE_GRAIN data-URI inline; the CSS parser rejects it in
      // .css files). Padding + gap arrive with the .sv2-app class at ≥768px.
      style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "var(--shell-ground)", backgroundImage: PAGE_GRAIN }}
    >
      {/* v2 shell chrome (ref scriptally-shell-v2.html): icon rail + paper sidebar, desktop
          only (class + media query in shellV2.css — never inline display). The interim layers
          (NavDrawer, CrumbStrip, per-page strips) are gone — shell follow-up P3. */}
      <ShellRail onNavigatePath={goPath} />
      <ShellSide>
        <ShellSidebarBody onNavigate={onNavigate} onNavigatePath={goPath} />
      </ShellSide>
      <div className="sv2-cap sv2-plane" style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile slim bar — the existing top Nav, below md only (the rail is desktop-only). */}
        <div className="md:hidden" style={{ flexShrink: 0 }}>
          <Nav activeTab={routeKey} onNavigate={onNavigate} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>

        {/* v2 top bar — breadcrumb · save-state chip · the shared NavSearch (⌘K). */}
        <ShellTopBar routeKey={routeKey} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNavigate={onNavigate} />

        {/* THE STAGE — the app's scroll container. Bottom clearance below md reserves space for
            the fixed BottomTabBar (was on the legacy shell's <main>). */}
        <div
          id={STAGE_SCROLL_ID}
          ref={stageRef}
          className="pb-[76px] md:pb-0"
          onScroll={(e) => { scrollMemo.current[routeKey] = (e.target as HTMLElement).scrollTop; }}
          // The ONE canvas (scheme 1, "Raised light"): painted here, inherited by every page —
          // no page sets a bespoke ground, and the canvas stays lighter than the sidebar (the
          // depth law, locked in shellV2Tokens.test.ts).
          style={{ flex: 1, minHeight: 0, overflowY: "auto", position: "relative", background: "var(--shell-canvas)" }}
        >
          {children}
        </div>
      </div>

      {/* Floating help — global again (VI P3 reversed the workbench-era /todo hide); mockup
          anatomy. Desktop only: below md the account menu carries Help Centre and the bottom tab
          bar owns that corner. Display comes from the class (not inline) so the media query can
          hide it. */}
      <style>{`
        .ashell-help-fab { display: flex; }
        @media (max-width: 767.98px) {
          .ashell-help-fab { display: none !important; }
        }
      `}</style>
      <button
        type="button"
        className="ashell-help-fab"
        onClick={() => {
          // On the To-do board the ? opens a two-item menu (the tour replay lives here); the
          // existing direct-navigate behaviour is KEPT as the menu's first item — and stays the
          // click action itself on every other route.
          if (routeKey === "todo") setHelpMenuOpen((v) => !v);
          else onNavigate("help");
        }}
        title="Help"
        aria-label="Help"
        style={{
          position: "fixed", bottom: 20, right: 20, width: 38, height: 38, borderRadius: "50%",
          background: parchment, border: "var(--bdw) solid var(--bd)", color: burgundy,
          fontFamily: FONT_SERIF, fontSize: 17, cursor: "pointer",
          boxShadow: "0 3px 12px rgba(58,28,20,0.12)", zIndex: 30,
          alignItems: "center", justifyContent: "center",
        }}
      >
        ?
      </button>
      {helpMenuOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={() => setHelpMenuOpen(false)} />
          <div
            role="menu"
            aria-label="Help"
            style={{
              position: "fixed", bottom: 66, right: 20, zIndex: 41, minWidth: 176,
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

      <BottomTabBar activeTab={routeKey} onNavigate={onNavigate} />

      {/* DEV-only page-colour lab (local + scriptally-dev builds; statically false → tree-shaken
          from prod). Overrides ride an injected <style>; the root's data-sa-ground is its hook. */}
      {import.meta.env.DEV && <BackgroundLab theme={theme} />}
    </div>
  );
};
