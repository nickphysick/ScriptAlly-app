/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AppShell — the global left-rail chrome that wraps every routed page (replaces both the legacy
 * top-bar shell in src/components/AppShell.tsx and the Queries-only SidebarShell). Anatomy per
 * design-reference/appshell-journey-mockup-v4.html (normative for the SHELL only):
 *
 *   rail (hover-peek: 60px rest / 240px peek-overlay / 240px pinned-in-flow — railPeek.ts)
 *   brand lockup + pin · search · grouped index · capture cluster · utility · theme seg · account
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
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { LayoutGrid, Send, Users, Book, Settings, User, Sparkles, BookOpen, HelpCircle, LogOut, Search, Table, Library, ListTodo } from "lucide-react";
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
import { RAIL_GROUPS, railActiveKey } from "./railNav";
import { railMode, scrimVisible, railFlowWidth, railPanelWidth, readRailPinned, writeRailPinned, makePeekIntent } from "./railPeek";
import { STAGE_SCROLL_ID } from "../../lib/stageScroll";
import { CrumbStrip } from "./CrumbStrip";
import "./contentColumn.css";

// Grouped-index data lives in railNav.ts (pure, tested); icons stay here (React-free model).
const RAIL_ICONS: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  dashboard: LayoutGrid,
  "queries-hub": Send,
  todo: ListTodo,
  "agents-db": Users,
  "agents-discover": Search,
  manuscripts: Book,
  comps: Library,
  packages: Table,
};

/* ── Rail pieces ─────────────────────────────────────────────────────────── */

/**
 * A rail index/utility item per the grouped-v5 ref: 15px accent-stroke icon, 12.5px label,
 * radius-10 row; active = theme pill + ink text. `muted` is the utility-group variant (label
 * colour on text AND icon, warming to ink/accent on hover). `badge` renders the corner count
 * bubble on the icon (survives collapse, where labels hide).
 */
const RailNavItem: React.FC<{
  label: string;
  Icon: React.ComponentType<{ style?: React.CSSProperties }>;
  active?: boolean;
  muted?: boolean;
  badge?: string;
  onClick: () => void;
}> = ({ label, Icon, active = false, muted = false, badge, onClick }) => (
  <button
    type="button"
    className="arail-item"
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    title={label}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: muted ? "8px 10px" : "9px 10px",
      borderRadius: 10,
      fontFamily: FONT_SANS,
      fontSize: muted ? 13 : 15,
      fontWeight: active ? 700 : 500,
      color: active
        ? `var(--rail-ink, ${bodyInk})`
        : muted
          ? "var(--rail-label, #9c8878)"
          : "var(--rail-itemtx, #5a4a40)",
      background: active ? "var(--rail-pill, #f1e9df)" : "transparent",
      border: "none",
      cursor: "pointer",
      whiteSpace: "nowrap",
      textAlign: "left",
      width: "100%",
      transition: "background 0.14s, color 0.14s",
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.background = "var(--rail-hov, #f7f3ed)";
      if (muted) {
        e.currentTarget.style.color = `var(--rail-ink, ${bodyInk})`;
        const icon = e.currentTarget.querySelector<HTMLElement>(".arail-item-icon");
        if (icon) icon.style.color = `var(--rail-accent, ${burgundy})`;
      }
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = "transparent";
      if (muted) {
        e.currentTarget.style.color = "var(--rail-label, #9c8878)";
        const icon = e.currentTarget.querySelector<HTMLElement>(".arail-item-icon");
        if (icon) icon.style.color = "var(--rail-label, #9c8878)";
      }
    }}
  >
    <span
      className="arail-item-icon"
      style={{
        display: "flex",
        flexShrink: 0,
        position: "relative",
        color: muted ? "var(--rail-label, #9c8878)" : `var(--rail-accent, ${burgundy})`,
        transition: "color 0.14s",
      }}
    >
      <Icon style={{ width: muted ? 15 : 16, height: muted ? 15 : 16 }} />
      {badge && (
        <span
          style={{
            position: "absolute", top: -6, right: -7,
            background: `var(--rail-accent, ${burgundy})`, color: parchment,
            fontFamily: FONT_MONO, fontSize: 7, fontWeight: 700,
            borderRadius: 99, padding: "1px 4px", lineHeight: "10px",
          }}
        >
          {badge}
        </span>
      )}
    </span>
    <span className="arail-label">{label}</span>
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Pathname-owned active state for the grouped index (?q= never unlights Queries Hub;
  // /agents/discover lights Discover, not Agents database).
  const activeRailKey = railActiveKey(useLocation().pathname);

  // Hover-peek model (railPeek.ts): rest/peek are the unpinned pair, pinned stands alone.
  // Default PINNED; the legacy chevron key migrates once inside readRailPinned. A coarse
  // pointer (touch) is permanently pinned — no hover peek, pin button hidden.
  const [pinned, setPinned] = useState<boolean>(() => readRailPinned());
  const [peeking, setPeeking] = useState(false);
  const [coarse] = useState<boolean>(() => {
    try { return window.matchMedia("(pointer: coarse)").matches; } catch { return false; }
  });
  const [showAccount, setShowAccount] = useState(false);
  // While the account menu is open the peek must hold (the menu flies out past the panel,
  // so the pointer legitimately leaves it) — component-level hold, not part of the model.
  const peekState = { pinned, peeking: peeking || showAccount, coarse };
  const mode = railMode(peekState);
  const intent = useMemo(() => makePeekIntent(setPeeking), []);
  useEffect(() => () => intent.dispose(), [intent]);

  const togglePin = () => setPinned((p) => { writeRailPinned(!p); return !p; });

  // The dashboard and the Agents page each host their own top-bar search (DashTopBar / the
  // Agents pill, both gated on route visibility), so the rail search hides on those routes
  // (the nav list simply starts higher). ⌘K/Ctrl+K focuses the RAIL search on every other
  // route — exactly one ⌘K registration is live at a time, never both.
  const railSearchShown = activeTab !== "dashboard" && activeTab !== "agents";
  useEffect(() => {
    if (!railSearchShown) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Unpinned at rest the search is hidden — open the peek first (focus-within then
        // keeps it open), and focus once the field is interactable.
        intent.openNow();
        window.setTimeout(() => searchInputRef.current?.focus(), 30);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [railSearchShown, intent]);


  // `[` toggles the pin when no editable element has focus (recon: the key is unclaimed).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      setPinned((p) => { writeRailPinned(!p); return !p; });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeAll = () => { setShowAccount(false); };
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
      className={`arail arail-${mode}`}
      style={{
        // The WRAPPER owns the layout-flow width: full when pinned, mini otherwise — a peek
        // never reflows the content (the panel below overlays instead).
        width: railFlowWidth(peekState),
        minWidth: 0,
        flexShrink: 0,
        transition: "width 280ms cubic-bezier(.22,.8,.3,1)",
        position: "relative",
        // Above content + scrim, below the timeline drawer (45/46), modals (50), dropdowns (60).
        zIndex: 40,
        minHeight: 0,
      }}
    >
      {/* Scrim — the page falls into gentle shadow while the rail peeks; never when pinned.
          Fixed inset-0 INSIDE the themed tree (so var(--rail-scrim) resolves per theme);
          z 0 within the aside's context keeps it under the panel, pointer-events none. */}
      <div className={`arail-scrim${scrimVisible(peekState) ? " arail-scrim-on" : ""}`} aria-hidden="true" />

      <div
        className="arail-panel"
        style={{
          // The PANEL owns the visual width: overlays to full during a peek. Frame per the
          // three-themes ref (border = right edge); peek swaps to the deeper peek shadow.
          // NO overflow:hidden while open — the account menu flies out past the edge (the
          // rest state clips via CSS so the retreat never shows stray labels).
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: railPanelWidth(peekState),
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--rail-card, #fffefb)",
          borderRight: "var(--rail-bdw, 1px) solid var(--rail-bd, #e7ddd2)",
          boxShadow: mode === "peek" ? "var(--rail-peek-shadow, 0 10px 30px rgba(58,28,20,0.16))" : "var(--rail-shadow, none)",
          transition: "width 280ms cubic-bezier(.22,.8,.3,1), box-shadow 280ms ease",
        }}
        onPointerEnter={() => { if (!pinned && !coarse) intent.pointerEnter(); }}
        onPointerLeave={() => { if (!pinned && !coarse) intent.pointerLeave(); }}
        onPointerMove={() => { if (!pinned && !coarse && !peeking) intent.pointerEnter(); }}
        onFocusCapture={() => { if (!pinned && !coarse) intent.focusEnter(); }}
        onBlurCapture={() => { if (!pinned && !coarse) intent.focusLeave(); }}
      >
      <style>{`
        /* The rail's display lives here (not inline) so the mobile media query can hide it —
           an inline display:flex would beat any breakpoint utility class. */
        .arail { display: flex; }
        @media (max-width: 767.98px) {
          .arail { display: none !important; }
        }
        /* Scrim — under the panel (z), over everything in the content area. */
        .arail-scrim { position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: var(--rail-scrim, rgba(58,28,20,0.12)); opacity: 0; transition: opacity 280ms ease; }
        .arail-scrim-on { opacity: 1; }
        /* REST (unpinned, no hover): 60px icon rail. Labels/wordmark/eyebrows/theme-seg gone,
           search keeps its slot (visibility) so the peek never jumps the nav, rows centre.
           !important throughout: these elements carry inline display/padding (the
           critical-styles-inline convention), which plain descendant rules cannot override. */
        .arail-rest .arail-panel-clip, .arail-rest .arail-panel { overflow: hidden; }
        .arail-rest .arail-label,
        .arail-rest .arail-wordmark,
        .arail-rest .arail-themeseg,
        .arail-rest .arail-eyebrow,
        .arail-rest .arail-pin,
        .arail-rest .arail-acct-text { display: none !important; }
        .arail-rest .arail-search { visibility: hidden; }
        .arail-rest .arail-item { justify-content: center !important; padding: 9px 0 !important; }
        .arail-rest .arail-head { padding: 16px 8px 12px !important; }
        .arail-rest .arail-capbtn { justify-content: center !important; padding: 9px 0 !important; }
        .arail-rest .arail-cappair { flex-direction: column !important; }
        .arail-rest .arail-capmini { padding: 9px 0 !important; }
        .arail-rest .arail-acct { justify-content: center !important; padding: 6px 0 !important; }
        /* Eyebrow ↔ hairline swap (ref .eyeline): dividers group the icons at rest only. */
        .arail-eyeline { height: 1px; background: var(--rail-hair, #e7ddd2); margin: 10px 10px; }
        .arail-peek .arail-eyeline, .arail-pinned .arail-eyeline { display: none; }
        /* PEEK: labels breathe in after the panel has mostly widened (ref: ~160ms delay). */
        @keyframes railLabelIn { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: none; } }
        .arail-peek .arail-label,
        .arail-peek .arail-wordmark,
        .arail-peek .arail-acct-text,
        .arail-peek .arail-pin,
        .arail-peek .arail-eyebrow { animation: railLabelIn 200ms ease 160ms both; }
        /* PIN affordance (ref): hairline chip; filled + rotated while pinned. */
        .arail-pin { width: 24px; height: 24px; border: 1px solid var(--rail-hair, #e7ddd2); border-radius: 8px;
          display: flex; align-items: center; justify-content: center; flex: none; background: transparent; cursor: pointer; }
        .arail-pin svg { width: 12px; height: 12px; stroke: var(--rail-label, #9c8878); fill: none;
          stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; transition: transform 200ms ease; }
        .arail-pin:hover { border-color: var(--rail-bd, #ded3c2); }
        .arail-pin:hover svg { stroke: var(--rail-accent, #7c3a2a); }
        .arail-pinned .arail-pin { background: var(--sd-centre, #f6e4da); border-color: var(--rail-bd, #ded3c2); }
        .arail-pinned .arail-pin svg { stroke: var(--rail-accent, #7c3a2a); fill: var(--rail-accent, #7c3a2a); transform: rotate(-38deg); }
        @media (prefers-reduced-motion: reduce) {
          .arail, .arail-panel, .arail-scrim { transition: none !important; }
          .arail-peek .arail-label, .arail-peek .arail-wordmark, .arail-peek .arail-acct-text,
          .arail-peek .arail-pin, .arail-peek .arail-eyebrow { animation: none !important; }
          .arail-pin svg { transition: none !important; }
        }
      `}</style>

      {/* Outside-click backdrop for the rail dropdowns */}
      {showAccount && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={closeAll} />
      )}

      {/* Brand row — the centred lockup beside the pin (visible during peek + pinned only;
          hidden entirely for coarse pointers, where the rail is permanently pinned). */}
      <div className="arail-head" style={{ display: "flex", alignItems: "center", gap: 4, padding: "16px 12px 12px", minHeight: 58 }}>
        <button
          type="button"
          onClick={() => { onNavigate("dashboard"); closeAll(); }}
          aria-label="ScriptAlly — go to dashboard"
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", minWidth: 0 }}
        >
          <img src="/scriptally-logo-new.png" alt="" aria-hidden="true" width={40} height={40} style={{ width: 40, height: 40, flexShrink: 0, display: "block" }} />
          <span className="arail-wordmark" style={{ display: "flex", overflow: "hidden" }}>
            <ScriptAllyLogo heightPx={48} textColor={burgundy} iconColor={burgundy} />
          </span>
        </button>
        {!coarse && (
          <button
            type="button"
            className="arail-pin"
            onClick={togglePin}
            aria-pressed={pinned}
            title={pinned ? "Unpin the sidebar" : "Pin the sidebar open"}
            aria-label={pinned ? "Unpin the sidebar" : "Pin the sidebar open"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 7 3 3H5l3-3 1-7z" /><path d="M12 14v6" /></svg>
          </button>
        )}
      </div>

      {/* Search — the existing NavSearch typeahead, rail presentation. Hidden on the dashboard
          (its top bar is the canonical search there). */}
      {railSearchShown && (
        <div className="arail-search" style={{ margin: "2px 12px 12px" }}>
          <NavSearch variant="rail" searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNavigate={onNavigate} inputRef={searchInputRef} />
        </div>
      )}

      {/* Grouped index — flat items under purely-visual mono eyebrows (no interaction).
          Active state is PATHNAME-owned (railActiveKey): ?q= keeps Queries Hub lit; sub-routes
          light their own entry. Rejection analytics is deliberately NOT rendered (no dead
          links) — the QUERYING group is its future home. */}
      <nav style={{ padding: "2px 12px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {RAIL_GROUPS.map((group, gi) => (
          <React.Fragment key={group.eyebrow ?? "top"}>
            {group.eyebrow && (
              <div
                className="arail-eyebrow"
                style={{
                  fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "var(--rail-label, #9c8878)",
                  padding: gi === 1 ? "12px 10px 6px" : "14px 10px 6px",
                }}
              >
                {group.eyebrow}
              </div>
            )}
            {group.eyebrow && <div className="arail-eyeline" aria-hidden="true" />}
            {group.items.map((item) => (
              <RailNavItem
                key={item.key}
                label={item.label}
                Icon={RAIL_ICONS[item.key]}
                active={activeRailKey === item.key}
                onClick={() => { onNavigate(item.tab, item.sub); closeAll(); }}
              />
            ))}
          </React.Fragment>
        ))}
      </nav>

      {/* Rail foot: utility group (Settings · Help) → theme switcher → account chip. The nav above
          is flex:1, so this block sits at the rail's foot. v2: the + Record a response / + Query /
          + Agent capture cluster was REMOVED — those flows live in the masthead "Log a new query"
          CTA, the Agents page "Add agent", the per-query ribbon + the dashboard's own Record-a-
          response instance; nothing routed exclusively through the rail buttons. The rail search
          stays (its ⌘K / global-search role is unchanged; rehoming it is a separate follow-up). */}
      <div>
        {/* Utility group — hairline-topped, muted items that warm on hover,
            per grouped-v5. Notifications was removed from the rail (product call, 5 Jul):
            on desktop, task alerts now surface only via the dashboard to-do/attention flow;
            the mobile slim bar keeps its own bell trigger. The dropdown + alerts hook stay
            intact in components/TasksDropdown.tsx. */}
        <div style={{ borderTop: "1px solid var(--rail-hair, #e7ddd2)", padding: "6px 12px 8px" }}>
          <RailNavItem label="Settings" Icon={Settings} muted onClick={() => { onNavigate("account"); closeAll(); }} />
          <RailNavItem label="Help centre" Icon={HelpCircle} muted onClick={() => { onNavigate("help"); closeAll(); }} />
        </div>

        {/* Theme segmented switcher — same Firestore field as the Settings radio group */}
        <div style={{ padding: "4px 12px 0" }}>
          <div
            className="arail-themeseg"
            role="radiogroup"
            aria-label="Queries page theme"
            style={{ display: "flex", border: "var(--bdw) solid var(--bd)", borderRadius: 9, overflow: "hidden", marginBottom: 10 }}
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
        </div>

        {/* Account chip + user dropdown (the five actions from the old top-bar menu) */}
        <div style={{ position: "relative", borderTop: "1px solid var(--rail-hair, #e7ddd2)", padding: 8 }}>
          <button
            type="button"
            className="arail-acct"
            onClick={() => setShowAccount((v) => !v)}
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
              <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 7, letterSpacing: "0.08em", textTransform: "uppercase", color: labelColor }}>
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
      </div>{/* closes .arail-panel */}
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
