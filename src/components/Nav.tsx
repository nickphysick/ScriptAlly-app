/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Top navigation — a full-width parchment MountCard, the topmost object on every page.
 * Critical colours/borders are inline styles (Tailwind has silently overridden them
 * before); Tailwind is used for layout/spacing only.
 */

import React, { useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import {
  Bell,
  Search,
  BookOpen,
  ChevronDown,
  LogOut,
  Sparkles,
  Plus,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MountCard } from "./MountCard";
import {
  burgundy,
  bodyInk,
  parchment,
  ghostButtonText,
  sageAccent,
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
  activeSubPage: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

/** A top-level nav link; active state = burgundy, medium weight, sage underline. */
const NavLink: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  hasChevron?: boolean;
  chevronOpen?: boolean;
}> = ({ label, active, onClick, hasChevron, chevronOpen }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-[5px] cursor-pointer bg-transparent"
    style={{
      fontFamily: FONT_SANS,
      fontSize: 13,
      border: "none",
      padding: "0 0 4px",
      color: active ? burgundy : ghostButtonText,
      fontWeight: active ? 500 : 400,
      borderBottom: active ? `2px solid ${sageAccent}` : "2px solid transparent",
      transition: "color 0.15s",
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = bodyInk; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = ghostButtonText; }}
  >
    {label}
    {hasChevron && (
      <ChevronDown
        className="w-[10px] h-[10px] opacity-70"
        style={{ transform: chevronOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s" }}
      />
    )}
  </button>
);

/** Parchment dropdown menu shell under a nav link. */
const Menu: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 4 }}
    transition={{ duration: 0.12 }}
    className="absolute left-0 top-[calc(100%+14px)] min-w-[190px] p-[5px] flex flex-col gap-0.5"
    style={{
      background: parchment,
      border: "0.5px solid #e0d5c8",
      borderRadius: 10,
      boxShadow: "0 6px 20px rgba(58,28,20,0.14)",
      zIndex: 60,
    }}
  >
    {children}
  </motion.div>
);

const MenuItem: React.FC<{ onClick: () => void; children: React.ReactNode; withPlus?: boolean }> = ({
  onClick,
  children,
  withPlus,
}) => (
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
    {withPlus && <Plus className="w-3 h-3 shrink-0" style={{ color: "#c9a89e" }} />}
    <span>{children}</span>
  </button>
);

const MenuDivider: React.FC = () => <div style={{ height: 0.5, background: "#f0e6e0", margin: "4px 2px" }} />;

export const Nav: React.FC<NavProps> = ({
  activeTab,
  onNavigate,
  searchQuery,
  setSearchQuery,
}) => {
  const { currentUser, tasks, dismissTask, logout } = useScriptAllyDb();

  const [openDropdown, setOpenDropdown] = useState<"queries" | "agents" | "manuscripts" | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [successAnimationTaskId, setSuccessAnimationTaskId] = useState<string | null>(null);

  if (!currentUser) return null;

  const activeTasksCount = tasks.length;
  const badgeText = activeTasksCount > 9 ? "9+" : activeTasksCount.toString();

  const closeAll = () => {
    setOpenDropdown(null);
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

  return (
    <>
      {/* Invisible backdrop to dismiss any open dropdown when clicking outside */}
      {(openDropdown || showUserDropdown || showBellDropdown) && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={closeAll} />
      )}

      {/* Floating parchment mount, pinned above the page */}
      <div className="fixed z-50" style={{ top: 10, left: 14, right: 14 }}>
        {/* MountCard still spans the page width; its inner content is inset up to 300px
            each side (clamped so it never crushes the two clusters on narrow viewports). */}
        <MountCard
          className="flex items-center"
          style={{ paddingBlock: 13, paddingInline: "clamp(22px, calc((100% - 1100px) / 2 + 22px), 300px)" }}
        >
          {/* Wordmark */}
          <button
            onClick={() => { onNavigate("dashboard"); closeAll(); }}
            className="cursor-pointer select-none"
            style={{
              position: "relative",
              zIndex: 4,
              fontFamily: FONT_SERIF,
              fontSize: 19,
              fontWeight: 500,
              color: burgundy,
              background: "transparent",
              border: "none",
              padding: 0,
            }}
          >
            ScriptAlly
          </button>

          {/* Links */}
          <nav className="flex items-center gap-[26px] ml-10" style={{ position: "relative", zIndex: 4 }}>
            <NavLink
              label="Dashboard"
              active={activeTab === "dashboard"}
              onClick={() => { onNavigate("dashboard"); closeAll(); }}
            />

            <div className="relative">
              <NavLink
                label="Queries"
                active={activeTab === "queries"}
                hasChevron
                chevronOpen={openDropdown === "queries"}
                onClick={() => { setOpenDropdown(openDropdown === "queries" ? null : "queries"); setShowUserDropdown(false); setShowBellDropdown(false); }}
              />
              <AnimatePresence>
                {openDropdown === "queries" && (
                  <Menu>
                    <MenuItem onClick={() => { onNavigate("queries", "All queries"); setOpenDropdown(null); }}>All queries</MenuItem>
                    <MenuItem onClick={() => { onNavigate("queries", "Queries database"); setOpenDropdown(null); }}>Query board</MenuItem>
                    <MenuItem onClick={() => { onNavigate("queries", "Querying analytics"); setOpenDropdown(null); }}>Analytics</MenuItem>
                    <MenuDivider />
                    <MenuItem withPlus onClick={() => { onNavigate("queries", "Send a query"); setOpenDropdown(null); }}>Send a query</MenuItem>
                  </Menu>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <NavLink
                label="Agents"
                active={activeTab === "agents"}
                hasChevron
                chevronOpen={openDropdown === "agents"}
                onClick={() => { setOpenDropdown(openDropdown === "agents" ? null : "agents"); setShowUserDropdown(false); setShowBellDropdown(false); }}
              />
              <AnimatePresence>
                {openDropdown === "agents" && (
                  <Menu>
                    <MenuItem onClick={() => { onNavigate("agents", "Agents database"); setOpenDropdown(null); }}>All agents</MenuItem>
                    <MenuItem onClick={() => { onNavigate("agents", "Discover"); setOpenDropdown(null); }}>Discover</MenuItem>
                    <MenuDivider />
                    <MenuItem withPlus onClick={() => { onNavigate("agents", "Add an agent"); setOpenDropdown(null); }}>Add agent</MenuItem>
                  </Menu>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <NavLink
                label="Manuscripts"
                active={activeTab === "manuscripts"}
                hasChevron
                chevronOpen={openDropdown === "manuscripts"}
                onClick={() => { setOpenDropdown(openDropdown === "manuscripts" ? null : "manuscripts"); setShowUserDropdown(false); setShowBellDropdown(false); }}
              />
              <AnimatePresence>
                {openDropdown === "manuscripts" && (
                  <Menu>
                    <MenuItem onClick={() => { onNavigate("manuscripts", "All manuscripts"); setOpenDropdown(null); }}>All manuscripts</MenuItem>
                    <MenuItem onClick={() => { onNavigate("manuscripts", "Submission packages"); setOpenDropdown(null); }}>Submission packages</MenuItem>
                    <MenuDivider />
                    <MenuItem withPlus onClick={() => { onNavigate("manuscripts", "Add a manuscript"); setOpenDropdown(null); }}>Add manuscript</MenuItem>
                  </Menu>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right-side utilities */}
          <div className="ml-auto flex items-center gap-4" style={{ position: "relative", zIndex: 4 }}>
            {/* Search */}
            <div
              className="flex items-center gap-2"
              style={{
                background: "#ffffff",
                border: "0.5px solid #e0d5c8",
                borderRadius: 9,
                padding: "8px 12px",
                width: 190,
              }}
            >
              <Search className="w-[13px] h-[13px] shrink-0" style={{ color: labelColor }} />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full min-w-0 placeholder-[#c8b8a8]"
                style={{ fontFamily: FONT_SANS, fontSize: 12, color: bodyInk }}
              />
            </div>

            {/* Bell */}
            <div className="relative flex items-center">
              <button
                onClick={() => { setShowBellDropdown(!showBellDropdown); setOpenDropdown(null); setShowUserDropdown(false); }}
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
                    className="absolute right-0 top-[calc(100%+16px)] w-80 p-1 text-left"
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

            {/* User chip */}
            <div className="relative flex items-center">
              <button
                onClick={() => { setShowUserDropdown(!showUserDropdown); setOpenDropdown(null); setShowBellDropdown(false); }}
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
                <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: bodyInk }} className="shrink-0">
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
                    className="absolute right-0 top-[calc(100%+16px)] w-52 p-1 text-left"
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
                      <MenuItem onClick={() => { onNavigate("pricing"); setShowUserDropdown(false); }}>
                        <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" style={{ color: burgundy }} /> Upgrade to Pro</span>
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
        </MountCard>
      </div>
    </>
  );
};
