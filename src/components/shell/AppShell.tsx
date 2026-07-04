/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AppShell — the global left-rail chrome that wraps every routed page (replaces both the legacy
 * top-bar shell in src/components/AppShell.tsx and the Queries-only SidebarShell). Anatomy per
 * design-reference/appshell-journey-mockup-v4.html (normative for the SHELL only):
 *
 *   rail (216px ↔ 60px collapsed) · wordmark + monogram · search · nav items · foot
 *   (bell + settings icon row → theme segmented switcher → account chip) · edge collapse chevron
 *
 * The rail renders once and never remounts on navigation — the only motion it is allowed is the
 * 200ms collapse width transition. The content column holds the mobile slim bar (the old <Nav>,
 * kept below md only) above the STAGE — the app's scroll container (#app-stage-scroll). Pages
 * render inside as persistent StagePage slots (display-toggled, never unmounted) so page-local
 * state survives navigation; scroll position is remembered per route on the stage element.
 *
 * Theme: the `.t-capp` / `.t-bold` class lives on the shell root (moved here from SidebarShell),
 * so the CSS variables reach the rail chrome and the Queries page. Critical border/colour styles
 * are inline or var(--…) — never Tailwind utilities (they have silently overridden inline-critical
 * colours in this codebase before). Tailwind is used for layout/breakpoints only.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LayoutGrid, Send, Users, Book, ChevronLeft, Bell, Settings, User, Sparkles, BookOpen, HelpCircle, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useScriptAllyDb } from "../../lib/db";
import { UserPlan } from "../../types";
import {
  burgundy,
  bodyInk,
  parchment,
  kraft,
  ghostButtonText,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
  hairline,
  labelColor,
  mutedInk,
} from "../../lib/designTokens";
import { ScriptAllyLogo } from "../ScriptAllyLogo";
import { NavSearch } from "../NavSearch";
import { Nav } from "../Nav";
import { BottomTabBar } from "../BottomTabBar";
import { TasksDropdown, useTaskAlerts } from "../TasksDropdown";
import { STAGE_SCROLL_ID } from "../../lib/stageScroll";

// Collapse persistence — deliberately reuses the Queries-rail key so an existing collapsed
// preference carries over to the global rail (the Queries rail is what this generalises).
const COLLAPSE_KEY = "scriptally.queriesRailCollapsed";

const NAV_ITEMS: { tab: string; label: string; Icon: React.ComponentType<{ style?: React.CSSProperties }> }[] = [
  { tab: "dashboard", label: "Dashboard", Icon: LayoutGrid },
  { tab: "queries", label: "Queries", Icon: Send },
  { tab: "agents", label: "Agents", Icon: Users },
  { tab: "manuscripts", label: "Manuscripts", Icon: Book },
];

/* ── Rail pieces ─────────────────────────────────────────────────────────── */

const RailNavItem: React.FC<{ label: string; Icon: React.ComponentType<{ style?: React.CSSProperties }>; active: boolean; onClick: () => void }> = ({ label, Icon, active, onClick }) => (
  <button
    type="button"
    className="arail-item"
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    title={label}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: "9px 11px",
      borderRadius: 9,
      fontFamily: FONT_SANS,
      fontSize: 13,
      fontWeight: active ? 500 : 400,
      // Active text is theme-driven (v37: capp mocha / bold ink / editorial graphite).
      color: active ? `var(--navtext, ${burgundy})` : "#6a5a50",
      background: active ? "var(--navpill)" : "transparent",
      border: "1px solid transparent",
      cursor: "pointer",
      whiteSpace: "nowrap",
      textAlign: "left",
      width: "100%",
      transition: "background 0.14s, color 0.14s",
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(124,58,42,0.05)"; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
  >
    <span style={{ display: "flex", flexShrink: 0 }}><Icon style={{ width: 17, height: 17 }} /></span>
    <span className="arail-label">{label}</span>
  </button>
);

const RailIconButton: React.FC<{ title: string; onClick: () => void; badge?: string; children: React.ReactNode }> = ({ title, onClick, badge, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    style={{
      position: "relative",
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "7px 0",
      border: "var(--bdw) solid var(--bd)",
      background: "#ffffff",
      borderRadius: 9,
      color: "#6a5a50",
      cursor: "pointer",
      transition: "color 0.14s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.color = burgundy; }}
    onMouseLeave={(e) => { e.currentTarget.style.color = "#6a5a50"; }}
  >
    {children}
    {badge && (
      <span
        style={{
          position: "absolute",
          top: -5,
          right: -4,
          background: burgundy,
          color: parchment,
          fontFamily: FONT_MONO,
          fontSize: 7,
          fontWeight: 700,
          borderRadius: 99,
          padding: "1px 4px",
          lineHeight: "10px",
        }}
      >
        {badge}
      </span>
    )}
  </button>
);

const RailMenuItem: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="w-full text-left cursor-pointer flex items-center gap-1.5"
    style={{
      fontFamily: FONT_SANS,
      fontSize: 13,
      color: "#6a5045",
      background: "transparent",
      border: "none",
      borderRadius: 7,
      padding: "8px 12px",
      transition: "background 0.13s, color 0.13s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.color = burgundy; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6a5045"; }}
  >
    {children}
  </button>
);

/* ── The rail ────────────────────────────────────────────────────────────── */

interface RailProps {
  activeTab: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const Rail: React.FC<RailProps> = ({ activeTab, onNavigate, searchQuery, setSearchQuery }) => {
  const { currentUser, logout, updateUserProfile } = useScriptAllyDb();
  const { activeTasksCount, badgeText } = useTaskAlerts();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // The dashboard hosts the canonical search in its top bar, so the rail search hides there
  // (the nav list simply starts higher). ⌘K/Ctrl+K focuses the RAIL search on every other
  // route; the dashboard's own binding (DashTopBar, gated on route visibility) is the only
  // one live on /dashboard — never both.
  const railSearchShown = activeTab !== "dashboard";
  useEffect(() => {
    if (!railSearchShown) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [railSearchShown]);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });
  const [showBell, setShowBell] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const toggle = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* private mode — ignore */ }
    return next;
  });

  const closeAll = () => { setShowBell(false); setShowAccount(false); };
  if (!currentUser) return null;

  const theme = currentUser.queriesTheme === "bold" || currentUser.queriesTheme === "editorial"
    ? currentUser.queriesTheme
    : "cappuccino";
  const planLabel = currentUser.plan === UserPlan.PRO ? "Pro" : "Free";

  const themeSegBtn = (on: boolean): React.CSSProperties => ({
    flex: 1,
    border: "none",
    background: on ? "var(--band)" : "transparent",
    fontFamily: FONT_MONO,
    fontSize: 8.5,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "6px 0",
    color: on ? burgundy : labelColor,
    fontWeight: on ? 700 : 400,
    cursor: "pointer",
  });

  return (
    <aside
      className={`arail${collapsed ? " arail-collapsed" : ""}`}
      style={{
        width: collapsed ? 60 : 216,
        minWidth: 0,
        flexShrink: 0,
        background: "#fffefb",
        borderRight: "var(--bdw) solid var(--bd)",
        flexDirection: "column",
        transition: "width 200ms ease",
        position: "relative",
        zIndex: 20,
        minHeight: 0,
      }}
    >
      <style>{`
        /* The rail's display lives here (not inline) so the mobile media query can hide it —
           an inline display:flex would beat any breakpoint utility class. */
        .arail { display: flex; }
        @media (max-width: 767.98px) {
          .arail { display: none !important; }
        }
        /* !important throughout: several of these elements carry inline display/padding (the
           critical-styles-inline convention), which plain descendant rules cannot override. */
        .arail-collapsed .arail-label,
        .arail-collapsed .arail-wordmark,
        .arail-collapsed .arail-search,
        .arail-collapsed .arail-themeseg,
        .arail-collapsed .arail-acct-text { display: none !important; }
        .arail-collapsed .arail-item { justify-content: center !important; padding: 9px 0 !important; }
        .arail-collapsed .arail-head { justify-content: center !important; padding: 18px 8px 14px !important; }
        .arail-collapsed .arail-iconrow { flex-direction: column !important; }
        .arail-collapsed .arail-acct { justify-content: center !important; padding: 6px 0 !important; }
        .arail-collapsed .arail-collapse svg { transform: rotate(180deg); }
      `}</style>

      {/* Outside-click backdrop for the rail dropdowns */}
      {(showBell || showAccount) && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={closeAll} />
      )}

      {/* Collapse toggle — straddles the rail's right edge */}
      <button
        type="button"
        className="arail-collapse"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand" : "Collapse"}
        style={{
          position: "absolute", top: 22, right: -11, width: 22, height: 22, borderRadius: "50%",
          background: "#fffefb", border: "var(--bdw) solid var(--bd)", color: "#9a8c80",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 25,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = burgundy; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#9a8c80"; }}
      >
        <ChevronLeft style={{ width: 12, height: 12, transition: "transform 200ms ease" }} />
      </button>

      {/* Wordmark + monogram (the real brand mark stands in for the mockup's S disc) */}
      <button
        type="button"
        className="arail-head"
        onClick={() => { onNavigate("dashboard"); closeAll(); }}
        aria-label="ScriptAlly — go to dashboard"
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "18px 16px 14px", minHeight: 58, background: "transparent", border: "none", cursor: "pointer", width: "100%" }}
      >
        <img src="/scriptally-logo-v2.png" alt="" aria-hidden="true" width={30} height={30} style={{ width: 30, height: 30, flexShrink: 0, display: "block" }} />
        <span className="arail-wordmark" style={{ display: "flex", overflow: "hidden" }}>
          <ScriptAllyLogo size="sm" textColor={burgundy} iconColor={burgundy} />
        </span>
      </button>

      {/* Search — the existing NavSearch typeahead, rail presentation. Hidden on the dashboard
          (its top bar is the canonical search there). */}
      {railSearchShown && (
        <div className="arail-search" style={{ margin: "2px 12px 12px" }}>
          <NavSearch variant="rail" searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNavigate={onNavigate} inputRef={searchInputRef} />
        </div>
      )}

      {/* Global page nav */}
      <nav style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 3 }}>
        {NAV_ITEMS.map((item) => (
          <RailNavItem
            key={item.tab}
            label={item.label}
            Icon={item.Icon}
            active={activeTab === item.tab}
            onClick={() => { onNavigate(item.tab); closeAll(); }}
          />
        ))}
      </nav>

      {/* Rail foot: bell + settings → theme switcher → account chip */}
      <div style={{ marginTop: "auto", padding: 12 }}>
        {/* The icon row is the positioning context for the tasks panel so it opens BESIDE the
            rail: the row's right edge sits 12px inside the rail edge, so 100% + 26px clears the
            border by 14px at both rail widths (216 and 60). */}
        <div className="arail-iconrow" style={{ position: "relative", display: "flex", gap: 6, marginBottom: 10 }}>
          <RailIconButton
            title="Notifications"
            onClick={() => { setShowBell((v) => !v); setShowAccount(false); }}
            badge={activeTasksCount > 0 ? badgeText : undefined}
          >
            <Bell style={{ width: 14, height: 14 }} />
          </RailIconButton>
          <RailIconButton title="Settings" onClick={() => { onNavigate("account"); closeAll(); }}>
            <Settings style={{ width: 14, height: 14 }} />
          </RailIconButton>
          <AnimatePresence>
            {showBell && (
              <TasksDropdown
                onNavigate={onNavigate}
                positionClassName="absolute left-[calc(100%+26px)] bottom-0 w-80"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Theme segmented switcher — same Firestore field as the Settings radio group */}
        <div
          className="arail-themeseg"
          role="radiogroup"
          aria-label="Queries page theme"
          style={{ display: "flex", border: "var(--bdw) solid var(--bd)", borderRadius: 9, overflow: "hidden", marginBottom: 12 }}
        >
          {([["cappuccino", "Capp"], ["bold", "Bold"], ["editorial", "Editorial"]] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              role="radio"
              aria-checked={theme === val}
              onClick={() => updateUserProfile({ queriesTheme: val })}
              style={themeSegBtn(theme === val)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Account chip + user dropdown (the five actions from the old top-bar menu) */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="arail-acct"
            onClick={() => { setShowAccount((v) => !v); setShowBell(false); }}
            title="Account"
            style={{ display: "flex", alignItems: "center", gap: 9, padding: 6, borderRadius: 9, background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,42,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span
              className="flex items-center justify-center select-none shrink-0"
              style={{
                width: 30, height: 30, borderRadius: "50%",
                background: parchment, border: "1px solid rgba(124,58,42,0.25)",
                fontFamily: FONT_SERIF, fontSize: 13, fontWeight: 500, color: burgundy,
              }}
            >
              {currentUser.name[0]?.toUpperCase()}
            </span>
            <span className="arail-acct-text" style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, color: bodyInk, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentUser.name}
              </span>
              <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: labelColor }}>
                {planLabel}
              </span>
            </span>
          </button>

          <AnimatePresence>
            {showAccount && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-[calc(100%+14px)] bottom-0 w-52 p-1 text-left"
                style={{
                  background: parchment, border: "0.5px solid #e0d5c8",
                  borderRadius: 12, boxShadow: "0 8px 24px rgba(58,28,20,0.16)", zIndex: 60, fontFamily: FONT_SANS,
                }}
              >
                <div className="px-3 py-2" style={{ borderBottom: hairline }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: bodyInk }}>{currentUser.name}</p>
                  <p className="truncate" style={{ fontSize: 10, color: mutedInk, marginTop: 2 }}>{currentUser.email}</p>
                </div>
                <div className="py-1">
                  <RailMenuItem onClick={() => { onNavigate("account"); closeAll(); }}>
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" style={{ color: burgundy }} /> My Account</span>
                  </RailMenuItem>
                  <RailMenuItem onClick={() => { onNavigate("plans"); closeAll(); }}>
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" style={{ color: burgundy }} /> {currentUser.plan === UserPlan.PRO ? "Plans" : "Upgrade to Pro"}</span>
                  </RailMenuItem>
                  <RailMenuItem onClick={() => { onNavigate("import"); closeAll(); }}>
                    <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" style={{ color: burgundy }} /> Import CSV Data</span>
                  </RailMenuItem>
                  <RailMenuItem onClick={() => { onNavigate("help"); closeAll(); }}>
                    <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" style={{ color: burgundy }} /> Help Centre</span>
                  </RailMenuItem>
                  <div style={{ height: 0.5, background: "#f0e6e0", margin: "4px 2px" }} />
                  <RailMenuItem onClick={() => { logout(); closeAll(); }}>
                    <span className="flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Log Out</span>
                  </RailMenuItem>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
};

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
  children: React.ReactNode;
}> = ({ active, layout = "flow", background, clip = false, children }) => {
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
  return (
    <div
      className={active && entering ? "stage-page-on" : undefined}
      onAnimationEnd={(e) => { if (e.animationName === "pageIn") setEntering(false); }}
      style={{
        display: active ? (layout === "fillColumn" ? "flex" : "block") : "none",
        ...(layout !== "flow" ? { height: "100%" } : {}),
        ...(layout === "fillColumn" ? { flexDirection: "column" as const } : {}),
        ...(clip ? { overflow: "hidden" } : {}),
        ...(background ? { background } : {}),
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
};

/* ── Agents sub-nav (moved from the legacy top-bar AppShell; now sticks inside the stage) ── */

const SUBTAB_PINK = "#f8e7dc"; // soft-pink pill fill — mirrors the primary NavLink (inline, not Tailwind)

const SubTab: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    className="cursor-pointer"
    style={{
      fontFamily: FONT_SANS,
      fontSize: 12.5,
      fontWeight: active ? 500 : 400,
      whiteSpace: "nowrap",
      padding: "5px 13px",
      borderRadius: 16,
      border: "none",
      background: active ? SUBTAB_PINK : "transparent",
      color: active ? burgundy : ghostButtonText,
      transition: "background 0.15s, color 0.15s",
    }}
    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = SUBTAB_PINK; e.currentTarget.style.color = burgundy; } }}
    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ghostButtonText; } }}
  >
    {label}
  </button>
);

export const AgentsSubNav: React.FC<{ discover: boolean; onNavigate: (tab: string, subPageName?: string) => void }> = ({ discover, onNavigate }) => (
  <div
    className="sticky z-40 flex items-center gap-1 px-4 md:px-10 lg:px-14 xl:px-16"
    style={{ top: 0, height: 44, flexShrink: 0, background: kraft, borderBottom: "1px solid rgba(124,58,42,0.10)" }}
  >
    <SubTab label="Agents database" active={!discover} onClick={() => onNavigate("agents", "Agents database")} />
    <SubTab label="Discover new agents" active={discover} onClick={() => onNavigate("agents", "Discover new agents")} />
  </div>
);

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

  return (
    <div
      className={THEME_CLASS[theme]}
      style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#F5F0EA" }}
    >
      <Rail activeTab={routeKey} onNavigate={onNavigate} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

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
    </div>
  );
};
