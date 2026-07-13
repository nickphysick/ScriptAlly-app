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
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { burgundy, parchment, FONT_SERIF } from "../../lib/designTokens";
import { Nav } from "../Nav";
import { BottomTabBar } from "../BottomTabBar";
import { STAGE_SCROLL_ID } from "../../lib/stageScroll";
import { CrumbStrip } from "./CrumbStrip";
import { NavDrawer, NavDrawerProvider } from "./NavDrawer";
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
  const body = contentVariant ? (
    <>
      <CrumbStrip />
      <div className={`sa-content-col sa-content-col--${contentVariant}${layout !== "flow" ? " sa-content-col--fill" : ""}`}>
        {children}
      </div>
    </>
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
        // contentVariant → the desk fills the margins; else the page's own background prop.
        ...(contentVariant ? { background: "var(--desk)" } : background ? { background } : {}),
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

  // App-wide nav drawer — AppShell owns the open state; triggers (CrumbStrip / DashTopBar
  // menu buttons) and the drawer itself consume it through NavDrawerProvider.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerCtx = useMemo(
    () => ({ open: drawerOpen, setOpen: setDrawerOpen, toggle: () => setDrawerOpen((v) => !v) }),
    [drawerOpen]
  );

  return (
    <NavDrawerProvider value={drawerCtx}>
    <div
      className={THEME_CLASS[theme]}
      data-sa-ground=""
      style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#F5F0EA" }}
    >
      {/* The persistent rail is RETIRED (overnight nav run) — navigation lives in the NavDrawer,
          opened from the header menu buttons. The content column reclaims the full width. */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile slim bar — the existing top Nav, below md only (the rail is desktop-only). */}
        <div className="md:hidden" style={{ flexShrink: 0 }}>
          <Nav activeTab={routeKey} onNavigate={onNavigate} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>

        {/* THE STAGE — the app's scroll container. Bottom clearance below md reserves space for
            the fixed BottomTabBar (was on the legacy shell's <main>). */}
        <div
          id={STAGE_SCROLL_ID}
          ref={stageRef}
          className="pb-[76px] md:pb-0"
          onScroll={(e) => { scrollMemo.current[routeKey] = (e.target as HTMLElement).scrollTop; }}
          style={{ flex: 1, minHeight: 0, overflowY: "auto", position: "relative" }}
        >
          {children}
        </div>
      </div>

      {/* Floating help — global now (was Queries-only on SidebarShell); mockup anatomy. Desktop
          only: below md the account menu carries Help Centre and the bottom tab bar owns that
          corner. Display comes from the class (not inline) so the media query can hide it. */}
      <style>{`
        .ashell-help-fab { display: flex; }
        @media (max-width: 767.98px) {
          .ashell-help-fab { display: none !important; }
        }
      `}</style>
      <button
        type="button"
        className="ashell-help-fab"
        onClick={() => onNavigate("help")}
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

      <BottomTabBar activeTab={routeKey} onNavigate={onNavigate} />

      {/* App-wide nav drawer — closed by default; opens from the header menu buttons (1b). */}
      <NavDrawer onNavigate={onNavigate} />

      {/* DEV-only page-colour lab (local + scriptally-dev builds; statically false → tree-shaken
          from prod). Overrides ride an injected <style>; the root's data-sa-ground is its hook. */}
      {import.meta.env.DEV && <BackgroundLab theme={theme} />}
    </div>
    </NavDrawerProvider>
  );
};
