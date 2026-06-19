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
  Sparkles,
  User,
  Settings,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ScriptAllyLogo } from "./ScriptAllyLogo";
import { NavSearch } from "./NavSearch";
import {
  burgundy,
  bodyInk,
  parchment,
  kraft,
  ghostButtonText,
  labelStyle,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
  buttonPinkBg,
  buttonPinkBorder,
  hairline,
  labelColor,
  mutedInk,
} from "../lib/designTokens";

interface NavProps {
  activeTab: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const PINK = "#f8e7dc"; // soft-pink pill fill (inline — Tailwind has overridden this before)

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

/** Primary nav link — active gets a soft-pink pill; idle highlights the same pink on hover. */
const NavLink: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    className="cursor-pointer"
    style={{
      fontFamily: FONT_SANS,
      fontSize: 13,
      fontWeight: active ? 500 : 400,
      whiteSpace: "nowrap",
      padding: "7px 14px",
      borderRadius: 20,
      border: "none",
      background: active ? PINK : "transparent",
      color: active ? burgundy : ghostButtonText,
      transition: "background 0.15s, color 0.15s",
    }}
    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = PINK; e.currentTarget.style.color = burgundy; } }}
    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ghostButtonText; } }}
  >
    {label}
  </button>
);

export const Nav: React.FC<NavProps> = ({ activeTab, onNavigate, searchQuery, setSearchQuery }) => {
  const { currentUser, tasks, dismissTask, logout } = useScriptAllyDb();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [successAnimationTaskId, setSuccessAnimationTaskId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Divider fades in once the page leaves the very top; clean at rest.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!currentUser) return null;

  const activeTasksCount = tasks.length;
  const badgeText = activeTasksCount > 9 ? "9+" : activeTasksCount.toString();

  const closeAll = () => {
    setShowUserDropdown(false);
    setShowBellDropdown(false);
  };

  const handleActionTask = (task: any) => {
    onNavigate(task.actionPath);
    setSuccessAnimationTaskId(task.id);
    setTimeout(() => {
      dismissTask(task.taskType, task.relatedRecordId, "permanent");
      setSuccessAnimationTaskId(null);
    }, 450);
  };

  const handleSnooze = (task: any, days: number) => {
    setSuccessAnimationTaskId(task.id);
    setTimeout(() => {
      dismissTask(task.taskType, task.relatedRecordId, "fixed snooze", days);
      setSuccessAnimationTaskId(null);
    }, 450);
  };

  // On the Queries route the sidebar (z-51) covers the full left side, so the top bar
  // slims to 36px and shows only the right cluster — logo / links / search are in the sidebar.
  if (activeTab === "queries") {
    return (
      <>
        {(showUserDropdown || showBellDropdown) && (
          <div className="fixed inset-0 z-40 bg-transparent" onClick={closeAll} />
        )}
        <header
          className="sticky top-0 z-50"
          style={{
            background: kraft,
            borderBottom: `1.5px solid ${scrolled ? "#b8b2a8" : "transparent"}`,
            transition: "border-color 0.25s ease",
          }}
        >
          <div className="flex items-center justify-end gap-3 px-4 md:px-10 lg:px-14 xl:px-16" style={{ height: 36 }}>
            {/* Help */}
            <button
              onClick={() => onNavigate("help")}
              className="flex items-center justify-center cursor-pointer"
              style={{ background: "transparent", border: "none", padding: 4, color: burgundy }}
              title="Help Centre"
              aria-label="Help Centre"
            >
              <HelpCircle className="w-[16px] h-[16px]" />
            </button>

            {/* Settings */}
            <button
              onClick={() => { onNavigate("account"); closeAll(); }}
              className="flex items-center justify-center cursor-pointer"
              style={{ background: "transparent", border: "none", padding: 4, color: burgundy }}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-[16px] h-[16px]" />
            </button>

            {/* User chip */}
            <div className="relative flex items-center">
              <button
                onClick={() => { setShowUserDropdown(!showUserDropdown); setShowBellDropdown(false); }}
                className="flex items-center gap-1.5 cursor-pointer"
                style={{ background: "transparent", border: "none", padding: 2 }}
              >
                <span
                  className="flex items-center justify-center select-none shrink-0"
                  style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: parchment, border: "1px solid rgba(124,58,42,0.25)",
                    fontFamily: FONT_SERIF, fontSize: 11, fontWeight: 500, color: burgundy,
                  }}
                >
                  {currentUser.name[0]?.toUpperCase()}
                </span>
                <ChevronDown className="w-3 h-3 shrink-0" style={{ color: labelColor }} />
              </button>

              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-[calc(100%+8px)] w-52 p-1 text-left"
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
                      <MenuItem onClick={() => { onNavigate("account"); setShowUserDropdown(false); }}>
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" style={{ color: burgundy }} /> My Account</span>
                      </MenuItem>
                      <MenuItem onClick={() => { onNavigate("plans"); setShowUserDropdown(false); }}>
                        <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" style={{ color: burgundy }} /> {currentUser.plan === UserPlan.PRO ? "Plans" : "Upgrade to Pro"}</span>
                      </MenuItem>
                      <MenuItem onClick={() => { onNavigate("import"); setShowUserDropdown(false); }}>
                        <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" style={{ color: burgundy }} /> Import CSV Data</span>
                      </MenuItem>
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
        </header>
      </>
    );
  }

  return (
    <>
      {/* Invisible backdrop to dismiss any open dropdown when clicking outside */}
      {(showUserDropdown || showBellDropdown) && (
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
        <div className="flex items-center gap-4 px-4 md:px-10 lg:px-14 xl:px-16" style={{ height: 64 }}>
          {/* Logo — a touch larger and nudged down so it sits on the baseline */}
          <button
            onClick={() => { onNavigate("dashboard"); closeAll(); }}
            className="cursor-pointer select-none shrink-0"
            style={{ background: "transparent", border: "none", padding: 0, marginTop: 3, lineHeight: 0 }}
            aria-label="ScriptAlly — go to dashboard"
          >
            <ScriptAllyLogo size="md" className="!h-[46px] [&>svg]:!h-[46px]" textColor={burgundy} iconColor={burgundy} />
          </button>

          {/* Primary links */}
          <nav className="flex items-center gap-1 ml-2 max-md:hidden">
            {PRIMARY.map((l) => (
              <NavLink key={l.tab} label={l.label} active={activeTab === l.tab} onClick={() => { onNavigate(l.tab); closeAll(); }} />
            ))}
          </nav>

          {/* Search — live typeahead, immediately after the links */}
          <div className="ml-1">
            <NavSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNavigate={onNavigate} />
          </div>

          {/* Right cluster — bell, settings, user */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {/* Bell */}
            <div className="relative flex items-center">
              <button
                onClick={() => { setShowBellDropdown(!showBellDropdown); setShowUserDropdown(false); }}
                className="relative flex items-center justify-center cursor-pointer"
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
                {showBellDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-[calc(100%+12px)] w-80 p-1 text-left"
                    style={{
                      background: parchment,
                      border: "0.5px solid #e0d5c8",
                      borderRadius: 12,
                      boxShadow: "0 8px 24px rgba(58,28,20,0.16)",
                      zIndex: 60,
                      fontFamily: FONT_SANS,
                    }}
                  >
                    <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: hairline }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: bodyInk }}>Notifications</p>
                      {activeTasksCount > 0 && (
                        <span
                          style={{
                            fontFamily: FONT_MONO,
                            fontSize: 9,
                            background: buttonPinkBg,
                            color: burgundy,
                            border: `0.5px solid ${buttonPinkBorder}`,
                            borderRadius: 14,
                            padding: "2px 8px",
                            fontWeight: 500,
                          }}
                        >
                          {activeTasksCount} pending
                        </span>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto py-1">
                      {tasks.length === 0 ? (
                        <div className="p-4 text-center" style={{ fontSize: 12, color: mutedInk, fontStyle: "italic" }}>
                          All caught up! No active tasks.
                        </div>
                      ) : (
                        tasks.map((task) => {
                          const isSnoozing = successAnimationTaskId === task.id;
                          return (
                            <div
                              key={task.id}
                              className={`p-2.5 transition-all ${isSnoozing ? "opacity-50 scale-95" : ""}`}
                              style={{ borderBottom: hairline, fontSize: 12 }}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span
                                  style={{
                                    ...labelStyle,
                                    letterSpacing: "0.08em",
                                    color: task.priority === "urgent" ? burgundy : labelColor,
                                  }}
                                >
                                  {task.priority}
                                </span>
                                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: labelColor, fontStyle: "italic" }} className="shrink-0">
                                  {task.manuscriptTitle}
                                </span>
                              </div>
                              <h4 style={{ fontWeight: 600, color: bodyInk, marginTop: 4 }}>{task.title}</h4>
                              <p style={{ color: mutedInk, marginTop: 2, fontSize: 11, lineHeight: 1.5 }}>
                                {task.description}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleActionTask(task)}
                                  className="cursor-pointer"
                                  style={{
                                    fontFamily: FONT_MONO,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    letterSpacing: "0.05em",
                                    background: buttonPinkBg,
                                    color: burgundy,
                                    border: `0.5px solid ${buttonPinkBorder}`,
                                    borderRadius: 8,
                                    padding: "5px 10px",
                                  }}
                                >
                                  {task.actionLabel || "Resolve"}
                                </button>
                                <button
                                  onClick={() => handleSnooze(task, 3)}
                                  className="cursor-pointer"
                                  style={{
                                    fontFamily: FONT_MONO,
                                    fontSize: 10,
                                    background: "#ffffff",
                                    color: ghostButtonText,
                                    border: "0.5px solid #e0d5c8",
                                    borderRadius: 8,
                                    padding: "5px 10px",
                                  }}
                                >
                                  Snooze 3d
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Settings gear — moved here from the old sidebar bottom */}
            <button
              onClick={() => { onNavigate("account"); closeAll(); }}
              className="flex items-center justify-center cursor-pointer"
              style={{ background: "transparent", border: "none", padding: 4, color: burgundy }}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>

            {/* User chip */}
            <div className="relative flex items-center">
              <button
                onClick={() => { setShowUserDropdown(!showUserDropdown); setShowBellDropdown(false); }}
                className="flex items-center gap-2 cursor-pointer"
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
                <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: bodyInk }} className="shrink-0 max-sm:hidden">
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
                      {/* TEMP (Prompt 2): reach the email-import dev preview. Remove with the route in App.tsx next prompt. */}
                      <MenuItem onClick={() => { onNavigate("email-import-dev"); setShowUserDropdown(false); }}>
                        <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" style={{ color: burgundy }} /> Email import (dev)</span>
                      </MenuItem>
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
      </header>
    </>
  );
};
