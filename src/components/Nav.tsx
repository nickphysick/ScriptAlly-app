/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useScriptAllyDb } from "../lib/db";
import { UserPlan } from "../types";
import {
  Bell,
  Search,
  BookOpen,
  ChevronDown,
  LogOut,
  FileSpreadsheet,
  Sparkles,
  Plus,
  X,
  Camera,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NavProps {
  activeTab: string;
  activeSubPage: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Nav: React.FC<NavProps> = ({
  activeTab,
  activeSubPage,
  onNavigate,
  searchQuery,
  setSearchQuery,
}) => {
  const {
    currentUser,
    tasks,
    dismissTask,
    logout,
  } = useScriptAllyDb();

  const [openDropdown, setOpenDropdown] = useState<"queries" | "agents" | "manuscripts" | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [successAnimationTaskId, setSuccessAnimationTaskId] = useState<string | null>(null);

  const [navBrandImage, setNavBrandImage] = useState<string | null>(() => {
    return localStorage.getItem("nav_brand_image") || null;
  });

  const [navImageScale, setNavImageScale] = useState<number>(() => {
    const saved = localStorage.getItem("nav_brand_image_scale");
    return saved ? parseInt(saved, 10) : 100;
  });

  const [navImageX, setNavImageX] = useState<number>(() => {
    const saved = localStorage.getItem("nav_brand_image_x");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [navImageY, setNavImageY] = useState<number>(() => {
    const saved = localStorage.getItem("nav_brand_image_y");
    return saved ? parseInt(saved, 10) : 0;
  });

  const handleNavIncreaseScale = () => {
    setNavImageScale((prev) => {
      const next = Math.min(300, prev + 10);
      localStorage.setItem("nav_brand_image_scale", next.toString());
      return next;
    });
  };

  const handleNavDecreaseScale = () => {
    setNavImageScale((prev) => {
      const next = Math.max(30, prev - 10);
      localStorage.setItem("nav_brand_image_scale", next.toString());
      return next;
    });
  };

  const handleNavMoveLeft = () => {
    setNavImageX((prev) => {
      const next = prev - 5;
      localStorage.setItem("nav_brand_image_x", next.toString());
      return next;
    });
  };

  const handleNavMoveRight = () => {
    setNavImageX((prev) => {
      const next = prev + 5;
      localStorage.setItem("nav_brand_image_x", next.toString());
      return next;
    });
  };

  const handleNavMoveUp = () => {
    setNavImageY((prev) => {
      const next = prev - 5;
      localStorage.setItem("nav_brand_image_y", next.toString());
      return next;
    });
  };

  const handleNavMoveDown = () => {
    setNavImageY((prev) => {
      const next = prev + 5;
      localStorage.setItem("nav_brand_image_y", next.toString());
      return next;
    });
  };

  const handleNavResetPosition = () => {
    setNavImageX(0);
    setNavImageY(0);
    setNavImageScale(100);
    localStorage.setItem("nav_brand_image_x", "0");
    localStorage.setItem("nav_brand_image_y", "0");
    localStorage.setItem("nav_brand_image_scale", "100");
  };

  const handleNavImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setNavBrandImage(base64String);
        localStorage.setItem("nav_brand_image", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNavRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNavBrandImage(null);
    localStorage.removeItem("nav_brand_image");
    handleNavResetPosition();
  };

  if (!currentUser) return null;

  const activeTasksCount = tasks.length;
  const badgeText = activeTasksCount > 9 ? "9+" : activeTasksCount.toString();

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
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setOpenDropdown(null);
            setShowUserDropdown(false);
            setShowBellDropdown(false);
          }}
        />
      )}

      {/* ==================== THE REDESIGNED MAIN NAVIGATION BAR (Height 64px) ==================== */}
      <header
        className="fixed top-0 left-0 right-0 h-[64px] bg-[#FFFFFF] z-50 flex items-center px-[300px] max-2xl:px-[150px] max-xl:px-[60px] max-md:px-4 select-none"
        style={{ borderBottom: "0.5px solid #e8d5cc" }}
      >
        {/* Leftmost logo brand with Uploadable / Editable logo logic */}
        <div className="relative group/nav-pic w-[165px] h-full flex items-center shrink-0">
          <input
            type="file"
            id="nav-brand-image-input"
            accept="image/*"
            className="hidden"
            onChange={handleNavImageUpload}
          />
          {navBrandImage ? (
            <div className="relative w-full h-full flex items-center">
              <label htmlFor="nav-brand-image-input" className="cursor-pointer w-full h-full block overflow-hidden">
                <img
                  src={navBrandImage}
                  alt="Brand logo"
                  className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(124,58,42,0.15)] transition-all duration-250"
                  style={{
                    transform: `translate(${navImageX}px, ${navImageY}px) scale(${navImageScale / 100})`,
                    transformOrigin: 'center center'
                  }}
                  referrerPolicy="no-referrer"
                />
              </label>
              <button
                onClick={handleNavRemoveImage}
                className="absolute -top-1.5 -right-1.5 bg-[#7c3a2a] text-[#F8F5F0] rounded-full flex items-center justify-center opacity-0 group-hover/nav-pic:opacity-100 transition-opacity shadow-xs border border-[#EBDCD3]"
                style={{ width: '13px', height: '13px', zIndex: 50 }}
                title="Reset to default brand logo"
              >
                <X className="w-2.5 h-2.5" />
              </button>

              {/* Hover controls bar for adjusting the custom brand logo */}
              <div className="absolute top-10 left-0 bg-white/95 border border-[#EBDCD3] rounded-lg px-2 py-1.5 shadow-md flex items-center gap-1.5 z-50 opacity-0 group-hover/nav-pic:opacity-100 transition-all pointer-events-auto whitespace-nowrap">
                {/* Move Left/Right */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleNavMoveLeft(); }}
                    className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                    title="Move Left (X - 5px)"
                    type="button"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[24px] text-center">
                    X:{navImageX}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleNavMoveRight(); }}
                    className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                    title="Move Right (X + 5px)"
                    type="button"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-px h-3 bg-[#EBDCD3]" />

                {/* Move Up/Down */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleNavMoveUp(); }}
                    className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                    title="Move Up (Y - 5px)"
                    type="button"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] font-mono font-bold text-stone-500 min-w-[24px] text-center">
                    Y:{navImageY}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleNavMoveDown(); }}
                    className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                    title="Move Down (Y + 5px)"
                    type="button"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-px h-3 bg-[#EBDCD3]" />

                {/* Scale */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleNavDecreaseScale(); }}
                    className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                    title="Zoom Out"
                    type="button"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] font-mono font-bold text-stone-700 min-w-[28px] text-center">
                    {navImageScale}%
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleNavIncreaseScale(); }}
                    className="p-0.5 hover:bg-[#FAF1EF] text-stone-600 hover:text-[#7c3a2a] rounded transition-colors cursor-pointer"
                    title="Zoom In"
                    type="button"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-px h-3 bg-[#EBDCD3]" />

                <button
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleNavResetPosition(); }}
                  className="px-1 hover:bg-[#FAF1EF] text-stone-500 hover:text-stone-700 rounded text-[8px] font-bold tracking-tight transition-colors cursor-pointer"
                  title="Reset positions"
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <label htmlFor="nav-brand-image-input" className="cursor-pointer relative flex items-center justify-center w-full h-full transition-colors font-serif text-[12px] text-[#7c3a2a] font-bold" title="Click to upload custom logo brand image">
                <span className="group-hover/nav-pic:opacity-0 transition-opacity">ScriptAlly</span>
                <Camera className="w-4 h-4 text-[#CD4E46] absolute opacity-0 group-hover/nav-pic:opacity-100 transition-opacity" />
              </label>
            </div>
          )}
        </div>

        {/* Separator between logo and nav links (0.5px solid #e8d5cc, 18px height, 20px margin) */}
        <div className="h-[18px] w-[0.5px] bg-[#e8d5cc] mx-[20px] shrink-0" />

        {/* Main navigation links */}
        <nav className="flex items-center gap-[10px] h-full">
          {/* 1. Dashboard Link */}
          <div className="relative h-full flex items-center">
            <button
              onClick={() => {
                onNavigate("dashboard");
                setOpenDropdown(null);
                setShowUserDropdown(false);
                setShowBellDropdown(false);
              }}
              className={`relative text-[13px] px-[12px] py-[6px] h-full flex items-center font-sans tracking-wide transition-colors focus:outline-none ${
                activeTab === "dashboard"
                  ? "text-[#3a1c14] font-medium"
                  : "text-[#a08070] hover:text-[#3a1c14]"
              }`}
            >
              Dashboard
              {activeTab === "dashboard" && (
                <div className="absolute bottom-0 left-[12px] right-[12px] h-[2px] bg-[#7c3a2a] rounded-t-[2px]" />
              )}
            </button>
          </div>

          {/* 2. Queries Link with Dropdown */}
          <div className="relative h-full flex items-center">
            <button
              onClick={() => {
                setOpenDropdown(openDropdown === "queries" ? null : "queries");
                setShowUserDropdown(false);
                setShowBellDropdown(false);
              }}
              className={`relative text-[13px] px-[12px] py-[6px] h-full flex items-center gap-[6px] font-sans tracking-wide transition-colors focus:outline-none ${
                activeTab === "queries"
                  ? "text-[#3a1c14] font-medium"
                  : "text-[#a08070] hover:text-[#3a1c14]"
              }`}
            >
              Queries
              <ChevronDown className="w-[10px] h-[10px] opacity-70" style={{ transform: openDropdown === "queries" ? "rotate(180deg)" : "rotate(0)" }} />
              {activeTab === "queries" && (
                <div className="absolute bottom-0 left-[12px] right-[12px] h-[2px] bg-[#7c3a2a] rounded-t-[2px]" />
              )}
            </button>

            {/* Queries Dropdown */}
            <AnimatePresence>
              {openDropdown === "queries" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 top-[64px] bg-[#FFFFFF] border border-[#e8d5cc] rounded-xl p-[6px] min-w-[180px] shadow-lg z-50 flex flex-col gap-0.5"
                >
                  <button
                    onClick={() => {
                      onNavigate("queries", "All queries");
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left py-[8px] px-[12px] rounded-lg text-[13px] text-[#6a5045] hover:bg-[#FAF8F5] hover:text-[#3a1c14] transition-colors cursor-pointer focus:outline-none"
                  >
                    All queries
                  </button>
                  <button
                    onClick={() => {
                      onNavigate("queries", "Queries database");
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left py-[8px] px-[12px] rounded-lg text-[13px] text-[#6a5045] hover:bg-[#FAF8F5] hover:text-[#3a1c14] transition-colors cursor-pointer focus:outline-none"
                  >
                    Query board
                  </button>
                  <button
                    onClick={() => {
                      onNavigate("queries", "Querying analytics");
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left py-[8px] px-[12px] rounded-lg text-[13px] text-[#6a5045] hover:bg-[#FAF8F5] hover:text-[#3a1c14] transition-colors cursor-pointer focus:outline-none"
                  >
                    Analytics
                  </button>
                  <div className="h-[0.5px] bg-[#f0e6e0] my-1" />
                  <button
                    onClick={() => {
                      onNavigate("queries", "Send a query");
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left py-[8px] px-[12px] rounded-lg text-[13px] text-[#6a5045] hover:bg-[#FAF8F5] hover:text-[#3a1c14] transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none"
                  >
                    <Plus className="w-3 h-3 text-[#c9a89e] shrink-0" />
                    <span>Send a query</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Agents Link with Dropdown */}
          <div className="relative h-full flex items-center">
            <button
              onClick={() => {
                setOpenDropdown(openDropdown === "agents" ? null : "agents");
                setShowUserDropdown(false);
                setShowBellDropdown(false);
              }}
              className={`relative text-[13px] px-[12px] py-[6px] h-full flex items-center gap-[6px] font-sans tracking-wide transition-colors focus:outline-none ${
                activeTab === "agents"
                  ? "text-[#3a1c14] font-medium"
                  : "text-[#a08070] hover:text-[#3a1c14]"
              }`}
            >
              Agents
              <ChevronDown className="w-[10px] h-[10px] opacity-70" style={{ transform: openDropdown === "agents" ? "rotate(180deg)" : "rotate(0)" }} />
              {activeTab === "agents" && (
                <div className="absolute bottom-0 left-[12px] right-[12px] h-[2px] bg-[#7c3a2a] rounded-t-[2px]" />
              )}
            </button>

            {/* Agents Dropdown */}
            <AnimatePresence>
              {openDropdown === "agents" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 top-[64px] bg-[#FFFFFF] border border-[#e8d5cc] rounded-xl p-[6px] min-w-[180px] shadow-lg z-50 flex flex-col gap-0.5"
                >
                  <button
                    onClick={() => {
                      onNavigate("agents", "Agents database");
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left py-[8px] px-[12px] rounded-lg text-[13px] text-[#6a5045] hover:bg-[#FAF8F5] hover:text-[#3a1c14] transition-colors cursor-pointer focus:outline-none"
                  >
                    All agents
                  </button>
                  <button
                    onClick={() => {
                      onNavigate("agents", "Discover");
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left py-[8px] px-[12px] rounded-lg text-[13px] text-[#6a5045] hover:bg-[#FAF8F5] hover:text-[#3a1c14] transition-colors cursor-pointer focus:outline-none"
                  >
                    Discover
                  </button>
                  <div className="h-[0.5px] bg-[#f0e6e0] my-1" />
                  <button
                    onClick={() => {
                      onNavigate("agents", "Add an agent");
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left py-[8px] px-[12px] rounded-lg text-[13px] text-[#6a5045] hover:bg-[#FAF8F5] hover:text-[#3a1c14] transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none"
                  >
                    <Plus className="w-3 h-3 text-[#c9a89e] shrink-0" />
                    <span>Add agent</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 4. Manuscripts Link with Dropdown */}
          <div className="relative h-full flex items-center">
            <button
              onClick={() => {
                setOpenDropdown(openDropdown === "manuscripts" ? null : "manuscripts");
                setShowUserDropdown(false);
                setShowBellDropdown(false);
              }}
              className={`relative text-[13px] px-[12px] py-[6px] h-full flex items-center gap-[6px] font-sans tracking-wide transition-colors focus:outline-none ${
                activeTab === "manuscripts"
                  ? "text-[#3a1c14] font-medium"
                  : "text-[#a08070] hover:text-[#3a1c14]"
              }`}
            >
              Manuscripts
              <ChevronDown className="w-[10px] h-[10px] opacity-70" style={{ transform: openDropdown === "manuscripts" ? "rotate(180deg)" : "rotate(0)" }} />
              {activeTab === "manuscripts" && (
                <div className="absolute bottom-0 left-[12px] right-[12px] h-[2px] bg-[#7c3a2a] rounded-t-[2px]" />
              )}
            </button>

            {/* Manuscripts Dropdown */}
            <AnimatePresence>
              {openDropdown === "manuscripts" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 top-[64px] bg-[#FFFFFF] border border-[#e8d5cc] rounded-xl p-[6px] min-w-[180px] shadow-lg z-50 flex flex-col gap-0.5"
                >
                  <button
                    onClick={() => {
                      onNavigate("manuscripts", "All manuscripts");
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left py-[8px] px-[12px] rounded-lg text-[13px] text-[#6a5045] hover:bg-[#FAF8F5] hover:text-[#3a1c14] transition-colors cursor-pointer focus:outline-none"
                  >
                    All manuscripts
                  </button>
                  <div className="h-[0.5px] bg-[#f0e6e0] my-1" />
                  <button
                    onClick={() => {
                      onNavigate("manuscripts", "Submission packages");
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left py-[8px] px-[12px] rounded-lg text-[13px] text-[#6a5045] hover:bg-[#FAF8F5] hover:text-[#3a1c14] transition-colors cursor-pointer focus:outline-none"
                  >
                    Submission packages
                  </button>
                  <div className="h-[0.5px] bg-[#f0e6e0] my-1" />
                  <button
                    onClick={() => {
                      onNavigate("manuscripts", "Add a manuscript");
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left py-[8px] px-[12px] rounded-lg text-[13px] text-[#6a5045] hover:bg-[#FAF8F5] hover:text-[#3a1c14] transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none"
                  >
                    <Plus className="w-3 h-3 text-[#c9a89e] shrink-0" />
                    <span>Add manuscript</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Pill - Moved next to Manuscripts, command shortcut removed */}
          <div className="relative h-full flex items-center ml-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#F7F2EC] border border-[#e8d5cc] rounded-full px-3 py-1.5 h-8 select-text">
              <Search className="w-[13px] h-[13px] text-[#a08070] shrink-0" />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[12px] text-[#3a1c14] placeholder-[#b09880] w-[125px] font-sans h-full min-w-0"
              />
            </div>
          </div>
        </nav>

        {/* Right side utilities (margin-left auto, gap 10px, all vertically centered) */}
        <div className="ml-auto flex items-center gap-[10px] shrink-0 h-full">
          {/* Bell Icon */}
          <div className="relative flex items-center">
            <button
              onClick={() => {
                setShowBellDropdown(!showBellDropdown);
                setOpenDropdown(null);
                setShowUserDropdown(false);
              }}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-[#FAF8F5] transition-colors cursor-pointer relative focus:outline-none"
            >
              <Bell className="w-[17px] h-[17px] text-[#a08070]" />
              {activeTasksCount > 0 && (
                <span className="absolute -top-[3px] -right-[3px] w-[14px] h-[14px] bg-[#7c3a2a] text-[#F8F5F0] rounded-full text-[8px] font-semibold flex items-center justify-center border-[1.5px] border-white">
                  {badgeText}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showBellDropdown && (
                <div className="absolute right-0 top-10 w-80 bg-white rounded-xl border border-stone-200 shadow-2xl p-1 z-50 text-left font-sans">
                  <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-stone-900">Notifications</p>
                    {activeTasksCount > 0 && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">
                        {activeTasksCount} Pending
                      </span>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1">
                    {tasks.length === 0 ? (
                      <div className="p-4 text-center text-xs text-stone-400 italic">
                        All caught up! No active tasks.
                      </div>
                    ) : (
                      tasks.map((task) => {
                        const isSnoozing = successAnimationTaskId === task.id;
                        const isUrgent = task.priority === "urgent";
                        return (
                          <div
                            key={task.id}
                            className={`p-2.5 border-b border-stone-50 last:border-0 text-xs transition-all relative ${
                              isUrgent ? "bg-[#fff0f0] hover:bg-[#ffeaea]" : "hover:bg-stone-50"
                            } ${
                              isSnoozing ? "opacity-50 scale-95" : ""
                            }`}
                          >
                            {isUrgent && (
                              <div 
                                className="absolute bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center select-none shadow-3xs" 
                                style={{ width: '15px', height: '15px', top: '8px', right: '8px', zIndex: 10 }}
                                title="Urgent"
                              >
                                !
                              </div>
                            )}
                            <div className="flex justify-between items-start gap-1">
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                  task.priority === "urgent"
                                    ? "bg-red-50 text-red-700 border border-red-100"
                                    : task.priority === "overdue"
                                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                                    : "bg-blue-50 text-blue-700 border border-blue-100"
                                }`}
                              >
                                {task.priority}
                              </span>
                              <span className="text-[10px] text-stone-400 font-mono italic shrink-0">
                                {task.manuscriptTitle}
                              </span>
                            </div>
                            <h4 className="font-bold text-stone-800 mt-1">{task.title}</h4>
                            <p className="text-stone-500 mt-0.5 text-[11px] leading-relaxed">
                              {task.description}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleActionTask(task)}
                                className="bg-[#7c3a2a] text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-[#7c3a2a]/90 transition-colors cursor-pointer"
                              >
                                {task.actionLabel || "Resolve"}
                              </button>
                              <button
                                onClick={() => handleSnooze(task, 3)}
                                className="border border-stone-200 text-stone-600 px-2 py-1 rounded text-[10px] hover:bg-stone-100 transition-colors cursor-pointer"
                              >
                                Snooze 3d
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Vertical Separator */}
          <div className="h-[20px] w-[0.5px] bg-[#e8d5cc] shrink-0" />

          {/* User Pill */}
          <div className="relative flex items-center">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setOpenDropdown(null);
                setShowBellDropdown(false);
              }}
              className="flex items-center gap-2 py-1.5 px-2 hover:bg-[#FAF8F5] transition-all cursor-pointer focus:outline-none shrink-0 rounded-md"
            >
              {/* Initials avatar - burgundy fill with bold white text */}
              <div className="w-[28px] h-[28px] rounded-full bg-[#5c1d11] text-white text-[11px] font-bold flex items-center justify-center select-none uppercase font-serif shrink-0">
                {currentUser.name[0]}
              </div>

              {/* Full Name */}
              <span className="text-[12px] text-[#3a1c14] font-sans font-medium shrink-0">
                {currentUser.name}
              </span>

              {/* Chevron Down */}
              <ChevronDown className="w-3.5 h-3.5 text-[#a08070] shrink-0" />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {showUserDropdown && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-xl border border-stone-200 shadow-2xl p-1 z-50 text-left font-sans">
                  <div className="px-3 py-2 border-b border-stone-100">
                    <p className="text-xs font-bold text-stone-900">{currentUser.name}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5 truncate">{currentUser.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onNavigate("pricing");
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-1.5 focus:outline-none cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-[#7c3a2a]" />
                      <span>My Account</span>
                    </button>

                    <button
                      onClick={() => {
                        onNavigate("pricing");
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-[#BA7517] hover:bg-[#FAF8F5] transition-colors flex items-center gap-1.5 focus:outline-none cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#BA7517] animate-pulse" />
                      <span>Upgrade to Pro</span>
                    </button>

                    <button
                      onClick={() => {
                        onNavigate("import");
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-1.5 font-semibold focus:outline-none cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#7c3a2a]" />
                      <span>Import CSV Data</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 border-t border-stone-100 focus:outline-none cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </>
  );
};
