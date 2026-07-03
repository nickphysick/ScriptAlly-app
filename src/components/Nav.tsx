/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Top navigation — a single horizontal bar across the top of every page (no card, no sidebar).
 * Laid out left→right: logo · primary links · search · (ml-auto) bell · settings · user.
 * The bar is sticky and flush on the page ground (sand fill, no frame/shadow); a neutral-grey
 * divider fades in along its bottom edge only once the page is scrolled. Active link = soft-pink
 * pill. Critical fill/text colours are inline (Tailwind has silently overridden inline-critical
 * colours before); Tailwind is used for layout/spacing only.
 */

import React, { useState, useEffect } from "react";
import { useScriptAllyDb } from "../lib/db";
import { UserPlan } from "../types";
import {
  Bell,
  BookOpen,
  ChevronDown,
  HelpCircle,
  LogOut,
  Search,
  Sparkles,
  User,
  Settings,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ScriptAllyLogo } from "./ScriptAllyLogo";
import { NavSearch } from "./NavSearch";
import { TasksDropdown, useTaskAlerts } from "./TasksDropdown";
import {
  burgundy,
  bodyInk,
  parchment,
  kraft,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
  hairline,
  labelColor,
  mutedInk,
} from "../lib/designTokens";

interface NavProps {
  activeTab: string;
  activeSubPage?: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const PINK = "#f8e7dc"; // soft-pink pill fill (inline — Tailwind has overridden this before)

// Canonical primary-nav pill treatment (matches scriptally-nav-final.html): black ink throughout,
// faint-pink hover, filled-pink active. NAV_PILL_HOVER is deepened from the mockup's #faeee8 so the
// pill reads on the kraft bar (on the white mockup #faeee8 is fine; on sand it was near-invisible).
const NAV_INK = "#241c15"; // link text — stays black in all states
const NAV_PILL_HOVER = "#f3e3dc"; // faint pink hover pill
const NAV_PILL_ACTIVE = "#f5e2da"; // filled pink active pill

const PRIMARY: { tab: string; label: string }[] = [
  { tab: "dashboard", label: "Dashboard" },
  { tab: "queries", label: "Queries" },
  { tab: "agents", label: "Agents" },
  { tab: "manuscripts", label: "Manuscripts" },
];

const MenuItem: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
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

const MenuDivider: React.FC = () => <div style={{ height: 0.5, background: "#f0e6e0", margin: "4px 2px" }} />;

/** Primary nav link — black ink throughout; faint-pink pill on hover, filled-pink pill when active. */
const NavLink: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    className="cursor-pointer"
    style={{
      fontFamily: FONT_SANS,
      fontSize: 15,
      fontWeight: active ? 600 : 500,
      whiteSpace: "nowrap",
      padding: "9px 16px",
      borderRadius: 10,
      border: "none",
      background: active ? NAV_PILL_ACTIVE : "transparent",
      color: NAV_INK,
      transition: "background 0.15s",
    }}
    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = NAV_PILL_HOVER; } }}
    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; } }}
  >
    {label}
  </button>
);

// Small line-icons for the Queries dropdown, drawn inside a rose chip (stroke = currentColor).
const QM_DB = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>);
const QM_LOG = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>);
const QM_RECORD = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" /></svg>);

// The three former hub choices, now reached from the nav. "Record a response" has no context-less
// entry (the real flow is query-scoped, opened per-selected-query from the desk) so it lands on the
// database — a "pick a query to update" step would be a follow-up.
const QUERIES_MENU: { key: string; title: string; subtitle: string; sub: string; icon: React.ReactNode }[] = [
  { key: "database", title: "Query database", subtitle: "Browse and track every query.", sub: "Query database", icon: QM_DB },
  { key: "log", title: "Log a new query", subtitle: "Record one you've just sent.", sub: "Log a query", icon: QM_LOG },
  { key: "record", title: "Record a response", subtitle: "Update one already out there.", sub: "Query database", icon: QM_RECORD },
];

/**
 * Queries nav item — a dropdown (replaces the old "What would you like to do?" hub). The label opens
 * the menu (it doesn't shortcut to the database — that variant is a one-line change if wanted). Full
 * menu semantics: aria roles, arrow-key navigation, Esc/outside-click close, focus returns to trigger.
 */
const QueriesNavMenu: React.FC<{
  active: boolean;
  open: boolean;
  setOpen: (next: boolean) => void;
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ active, open, setOpen, onNavigate }) => {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Move focus into the menu when it opens.
  React.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => itemRefs.current[0]?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const closeToTrigger = () => { setOpen(false); triggerRef.current?.focus(); };
  const activate = (item: typeof QUERIES_MENU[number]) => { setOpen(false); onNavigate("queries", item.sub); };

  const onItemKey = (e: React.KeyboardEvent, idx: number) => {
    const n = QUERIES_MENU.length;
    if (e.key === "ArrowDown") { e.preventDefault(); itemRefs.current[(idx + 1) % n]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); itemRefs.current[(idx - 1 + n) % n]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); itemRefs.current[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); itemRefs.current[n - 1]?.focus(); }
    else if (e.key === "Escape") { e.preventDefault(); closeToTrigger(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(QUERIES_MENU[idx]); }
    else if (e.key === "Tab") { setOpen(false); }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(true); }
          else if (open && e.key === "Escape") { e.preventDefault(); closeToTrigger(); }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-current={active ? "page" : undefined}
        className="cursor-pointer"
        style={{
          fontFamily: FONT_SANS, fontSize: 15, fontWeight: active ? 600 : 500, whiteSpace: "nowrap",
          padding: "9px 16px", borderRadius: 10, border: "none",
          background: active || open ? NAV_PILL_ACTIVE : "transparent", color: NAV_INK,
          transition: "background 0.15s", display: "inline-flex", alignItems: "center", gap: 5,
        }}
        onMouseEnter={(e) => { if (!active && !open) { e.currentTarget.style.background = NAV_PILL_HOVER; } }}
        onMouseLeave={(e) => { if (!active && !open) { e.currentTarget.style.background = "transparent"; } }}
      >
        Queries
        <ChevronDown style={{ width: 13, height: 13, opacity: 0.7 }} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Queries"
          style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 60,
            background: "#ffffff", border: "1px solid #e7ddcf", borderRadius: 12,
            boxShadow: "0 8px 26px rgba(40,28,20,.16)", padding: 7, minWidth: 248,
          }}
        >
          {QUERIES_MENU.map((item, idx) => (
            <button
              key={item.key}
              ref={(el) => { itemRefs.current[idx] = el; }}
              role="menuitem"
              tabIndex={-1}
              onClick={() => activate(item)}
              onKeyDown={(e) => onItemKey(e, idx)}
              className="w-full text-left cursor-pointer"
              style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "9px 11px", borderRadius: 9, background: "transparent", border: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f7f1ea"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: PINK, display: "flex", alignItems: "center", justifyContent: "center", color: burgundy }}>
                {item.icon}
              </span>
              <span style={{ display: "block" }}>
                <span style={{ display: "block", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: "#2c2017" }}>{item.title}</span>
                <span style={{ display: "block", fontFamily: FONT_SANS, fontSize: 11, color: "#9a8e80", marginTop: 1 }}>{item.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Nav: React.FC<NavProps> = ({ activeTab, activeSubPage, onNavigate, searchQuery, setSearchQuery }) => {
  const { currentUser, logout } = useScriptAllyDb();
  const { activeTasksCount, badgeText } = useTaskAlerts();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [showQueriesMenu, setShowQueriesMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Divider fades in once the page leaves the very top; clean at rest.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!currentUser) return null;

  const closeAll = () => {
    setShowUserDropdown(false);
    setShowBellDropdown(false);
    setShowQueriesMenu(false);
  };

  // (The old 45px "Query database" mini-bar branch lived here — it became unreachable once the
  // Queries desk moved onto the sidebar shell, and was deleted in the AppShell migration. Nav now
  // only serves as the below-md slim bar; desktop chrome is the AppShell rail.)

  return (
    <>
      {/* Invisible backdrop to dismiss any open dropdown when clicking outside */}
      {(showUserDropdown || showBellDropdown || showQueriesMenu) && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={closeAll} />
      )}

      {/* Single flush sticky bar — sits on the sand ground; grey divider appears on scroll. */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: kraft,
          borderBottom: `1.5px solid ${scrolled ? "#b8b2a8" : "transparent"}`,
          transition: "border-color 0.25s ease",
        }}
      >
        <div className="flex items-center gap-4 max-w-[var(--content-max)] mx-auto w-full px-4 md:px-8" style={{ height: 77 }}>
          {/* Logo — a touch larger and nudged down so it sits on the baseline */}
          <button
            onClick={() => { onNavigate("dashboard"); closeAll(); }}
            className="cursor-pointer select-none shrink-0"
            style={{ background: "transparent", border: "none", padding: 0, marginTop: 3, lineHeight: 0, display: "flex", alignItems: "center", gap: 2 }}
            aria-label="ScriptAlly — go to dashboard"
          >
            <img
              src="/scriptally-logo-v2.png"
              alt=""
              aria-hidden="true"
              width={45}
              height={45}
              style={{ width: 45, height: 45, maxWidth: "none", flexShrink: 0, display: "block" }}
            />
            <ScriptAllyLogo size="md" className="!h-[46px] [&>svg]:!h-[46px]" textColor={burgundy} iconColor={burgundy} />
          </button>

          {/* Primary links — "Queries" is a dropdown (the former hub's three choices) */}
          <nav className="flex items-center gap-1 ml-2 max-md:hidden">
            {PRIMARY.map((l) => (
              l.tab === "queries" ? (
                <QueriesNavMenu
                  key={l.tab}
                  active={activeTab === "queries"}
                  open={showQueriesMenu}
                  setOpen={(next) => { setShowQueriesMenu(next); if (next) { setShowUserDropdown(false); setShowBellDropdown(false); } }}
                  onNavigate={(tab, sub) => { onNavigate(tab, sub); closeAll(); }}
                />
              ) : (
                <NavLink key={l.tab} label={l.label} active={activeTab === l.tab} onClick={() => { onNavigate(l.tab); closeAll(); }} />
              )
            ))}
          </nav>

          {/* Search — live typeahead, immediately after the links (desktop only; below md the
              inline field is hidden and the slim bar uses the search icon-toggle on the right). */}
          <div className="ml-1 max-md:hidden">
            <NavSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNavigate={onNavigate} />
          </div>

          {/* Right cluster — (mobile search) · bell · settings · user */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {/* Mobile search toggle — below md, reveals the full-width search row beneath the bar. */}
            <button
              onClick={() => { setMobileSearchOpen((v) => !v); closeAll(); }}
              className="md:hidden flex items-center justify-center cursor-pointer"
              style={{ minWidth: 44, minHeight: 44, background: "transparent", border: "none", padding: 4, color: burgundy }}
              aria-label="Search"
              aria-expanded={mobileSearchOpen}
            >
              <Search className="w-[18px] h-[18px]" />
            </button>

            {/* Bell */}
            <div className="relative flex items-center">
              <button
                onClick={() => { setShowBellDropdown(!showBellDropdown); setShowUserDropdown(false); setShowQueriesMenu(false); }}
                className="relative flex items-center justify-center cursor-pointer max-md:min-w-[44px] max-md:min-h-[44px]"
                style={{ background: "transparent", border: "none", padding: 4, color: burgundy }}
                title="Notifications"
              >
                <Bell className="w-[18px] h-[18px]" />
                {activeTasksCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      background: burgundy,
                      color: parchment,
                      fontFamily: FONT_MONO,
                      fontSize: 7.5,
                      fontWeight: 500,
                      borderRadius: 8,
                      padding: "1px 4px",
                      lineHeight: "10px",
                    }}
                  >
                    {badgeText}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showBellDropdown && <TasksDropdown onNavigate={onNavigate} />}
              </AnimatePresence>
            </div>

            {/* Settings gear — moved here from the old sidebar bottom. Below md it is hidden; the
                "you" menu carries Account settings, so the slim bar stays wordmark·search·bell·you. */}
            <button
              onClick={() => { onNavigate("account"); closeAll(); }}
              className="flex items-center justify-center cursor-pointer max-md:hidden"
              style={{ background: "transparent", border: "none", padding: 4, color: burgundy }}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>

            {/* User chip */}
            <div className="relative flex items-center">
              <button
                onClick={() => { setShowUserDropdown(!showUserDropdown); setShowBellDropdown(false); setShowQueriesMenu(false); }}
                className="flex items-center gap-2 cursor-pointer max-md:min-h-[44px]"
                style={{ background: "transparent", border: "none", padding: 2 }}
              >
                <span
                  className="flex items-center justify-center select-none shrink-0"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: parchment,
                    border: "1px solid rgba(124,58,42,0.25)",
                    fontFamily: FONT_SERIF,
                    fontSize: 13,
                    fontWeight: 500,
                    color: burgundy,
                  }}
                >
                  {currentUser.name[0]?.toUpperCase()}
                </span>
                <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: bodyInk }} className="shrink-0 max-sm:hidden">
                  {currentUser.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: labelColor }} />
              </button>

              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-[calc(100%+12px)] w-52 p-1 text-left"
                    style={{
                      background: parchment,
                      border: "0.5px solid #e0d5c8",
                      borderRadius: 12,
                      boxShadow: "0 8px 24px rgba(58,28,20,0.16)",
                      zIndex: 60,
                      fontFamily: FONT_SANS,
                    }}
                  >
                    <div className="px-3 py-2" style={{ borderBottom: hairline }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: bodyInk }}>{currentUser.name}</p>
                      <p className="truncate" style={{ fontSize: 10, color: mutedInk, marginTop: 2 }}>{currentUser.email}</p>
                    </div>

                    <div className="py-1">
                      <MenuItem onClick={() => { onNavigate("account"); setShowUserDropdown(false); }}>
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" style={{ color: burgundy }} /> My Account</span>
                      </MenuItem>
                      {/* Single entitlement source: Free users get nudged to upgrade; Pro users see a neutral "Plans". Both route to the presentational PlansPage. */}
                      <MenuItem onClick={() => { onNavigate("plans"); setShowUserDropdown(false); }}>
                        <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" style={{ color: burgundy }} /> {currentUser.plan === UserPlan.PRO ? "Plans" : "Upgrade to Pro"}</span>
                      </MenuItem>
                      <MenuItem onClick={() => { onNavigate("import"); setShowUserDropdown(false); }}>
                        <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" style={{ color: burgundy }} /> Import CSV Data</span>
                      </MenuItem>
                      {/* Help Centre — mobile-only: the slim bar drops the desktop gear/help affordances,
                          so the "you" menu carries Help below md. Desktop menu stays identical. */}
                      <div className="md:hidden">
                        <MenuItem onClick={() => { onNavigate("help"); setShowUserDropdown(false); }}>
                          <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" style={{ color: burgundy }} /> Help Centre</span>
                        </MenuItem>
                      </div>
                      <MenuDivider />
                      <MenuItem onClick={() => { logout(); setShowUserDropdown(false); }}>
                        <span className="flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Log Out</span>
                      </MenuItem>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile search row — full-width field revealed below the slim bar by the search toggle.
            Reuses the existing NavSearch (one search system), just presented full-width on mobile. */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pb-3 pt-0.5">
            <NavSearch variant="mobile" searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNavigate={onNavigate} />
          </div>
        )}
      </header>
    </>
  );
};
