/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bottom tab bar — the mobile-only primary navigation (rendered `md:hidden`, fixed to the viewport
 * bottom). Below the Tailwind `md` breakpoint the four primary destinations leave the top bar and
 * live here as four equal tabs: Dashboard · Queries · Agents · Scripts (Manuscripts). The active tab
 * gets a soft-pink pill behind the icon with burgundy ink; inactive tabs are muted.
 *
 * Critical fill/border colours are inline (Tailwind has silently overridden inline-critical colours
 * in this codebase before); Tailwind is used only for layout/breakpoint. Z-index sits at z-40 —
 * above page content, below the z-50 top bar and z-60 dropdowns, and well below the z-[70]+ band
 * reserved for the bottom-sheet layer a later mobile prompt will add.
 */
import React from "react";
import { LayoutDashboard, Send, Users, BookOpen, LucideIcon } from "lucide-react";
import { burgundy, FONT_MONO } from "../lib/designTokens";

interface BottomTabBarProps {
  activeTab: string;
  onNavigate: (tab: string, subPageName?: string) => void;
}

const PILL = "#f5e2da"; // active-tab pill fill (inline — Tailwind has overridden this before)
const INACTIVE = "#a08070"; // muted icon + label

const TABS: { tab: string; label: string; Icon: LucideIcon }[] = [
  { tab: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { tab: "queries", label: "Queries", Icon: Send },
  { tab: "agents", label: "Agents", Icon: Users },
  { tab: "manuscripts", label: "Scripts", Icon: BookOpen },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onNavigate }) => (
  <nav
    className="md:hidden flex items-stretch"
    aria-label="Primary"
    style={{
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 40,
      background: "#fdfaf5",
      borderTop: "0.5px solid rgba(124,58,42,0.16)",
      boxShadow: "0 -2px 14px rgba(58,28,20,0.06)",
      padding: "7px 6px",
      paddingBottom: "calc(7px + env(safe-area-inset-bottom))",
    }}
  >
    {TABS.map(({ tab, label, Icon }) => {
      const active = activeTab === tab;
      return (
        <button
          key={tab}
          onClick={() => onNavigate(tab)}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className="flex flex-col items-center justify-center gap-1 cursor-pointer"
          style={{
            flex: 1,
            minHeight: 54,
            background: "transparent",
            border: "none",
            padding: 0,
          }}
        >
          <span
            className="flex items-center justify-center"
            style={{
              width: 46,
              height: 28,
              borderRadius: 11,
              background: active ? PILL : "transparent",
              transition: "background 0.15s",
            }}
          >
            <Icon size={22} style={{ color: active ? burgundy : INACTIVE }} strokeWidth={active ? 2.1 : 1.8} />
          </span>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 8.5,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: active ? burgundy : INACTIVE,
              fontWeight: active ? 600 : 500,
            }}
          >
            {label}
          </span>
        </button>
      );
    })}
  </nav>
);
