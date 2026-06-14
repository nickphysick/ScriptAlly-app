/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Left navigation rail — the primary links moved out of the top bar into a vertical parchment
 * MountCard pinned to the left edge (same paper-texture + inset burgundy frame as the rest of the
 * app). Settings is pinned to the bottom. Active item = pink-fill pill; idle = muted; hover = white.
 * Critical fill/text colours are inline (Tailwind has silently overridden inline-critical colours).
 *
 * On lg+ the rail is always shown; below lg it's an off-canvas drawer toggled from the top bar.
 */
import React from "react";
import { LayoutDashboard, Send, Users, Library, Settings } from "lucide-react";
import { MountCard } from "./MountCard";
import { burgundy, ghostButtonText, FONT_SANS, hairline } from "../lib/designTokens";

/** Tightest width that fits the longest label ("Manuscripts") at the app font, plus a few px.
 *  Content clears the rail by RAIL_LEFT + RAIL_WIDTH + RAIL_GAP (see AppShell). */
export const RAIL_WIDTH = 146;
export const RAIL_LEFT = 14;
export const RAIL_GAP = 12;

interface RailItemDef {
  tab: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
}

const PRIMARY: RailItemDef[] = [
  { tab: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { tab: "queries", label: "Queries", Icon: Send },
  { tab: "agents", label: "Agents", Icon: Users },
  { tab: "manuscripts", label: "Manuscripts", Icon: Library },
];

interface LeftRailProps {
  activeTab: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  open: boolean; // mobile drawer state
  onClose: () => void;
}

export const LeftRail: React.FC<LeftRailProps> = ({ activeTab, onNavigate, open, onClose }) => {
  const Item: React.FC<RailItemDef> = ({ tab, label, Icon }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => { onNavigate(tab); onClose(); }}
        aria-current={active ? "page" : undefined}
        className="cursor-pointer"
        style={{
          position: "relative",
          zIndex: 4,
          display: "flex",
          alignItems: "center",
          gap: 10, // fixed icon→label gap; label length is the only variable in a row's width
          width: "100%",
          textAlign: "left",
          fontFamily: FONT_SANS,
          fontSize: 12.5,
          fontWeight: 500,
          whiteSpace: "nowrap", // labels never wrap or truncate
          padding: "9px 11px",
          borderRadius: 9,
          border: "none",
          background: active ? "#f8e7dc" : "transparent",
          color: active ? burgundy : ghostButtonText,
          transition: "background 0.13s, color 0.13s",
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#ffffff"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
      >
        <Icon size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile backdrop — tap to dismiss the drawer. */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(40,20,14,0.35)" }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed z-[45] transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-[120%]"}`}
        style={{ top: 84, left: RAIL_LEFT, bottom: 14, width: RAIL_WIDTH }}
        aria-label="Primary navigation"
      >
        <MountCard className="flex flex-col" style={{ height: "100%", padding: "12px 9px" }}>
          <div style={{ position: "relative", zIndex: 4, display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            <nav className="flex flex-col gap-1" style={{ overflowY: "auto" }}>
              {PRIMARY.map((it) => (
                <Item key={it.tab} {...it} />
              ))}
            </nav>
            {/* Settings pinned to the bottom, separated from the main items. */}
            <div style={{ marginTop: "auto" }}>
              <div style={{ borderTop: hairline, margin: "8px 6px 6px" }} />
              <Item tab="account" label="Settings" Icon={Settings} />
            </div>
          </div>
        </MountCard>
      </aside>
    </>
  );
};
