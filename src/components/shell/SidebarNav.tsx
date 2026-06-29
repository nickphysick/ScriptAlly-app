/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SidebarNav — the left rail of the shell. Top → bottom: wordmark · global page nav (Dashboard,
 * Queries, Agents, Manuscripts) · divider · a page-context slot (filter/sort for the current page) ·
 * an account chip pinned to the foot. Sized to fit one screen with no scroll. Active page = the
 * soft-pink pill (#f5e2da), burgundy text, weight 500 — no underline variant.
 *
 * Presentational: the page-context and account nodes are passed in as props so the rail stays
 * page-agnostic (Queries feeds its filter/sort; later pages feed their own).
 */
import React from "react";
import { LayoutGrid, Send, Users, Book } from "lucide-react";
import { FONT_SERIF, FONT_SANS, burgundy, bodyInk } from "../../lib/designTokens";
import { chromeWhite, navBorder, linkRest, pinkActive, pinkHover, inkShell } from "./shellTokens";

interface NavItem {
  tab: string;
  label: string;
  Icon: React.ComponentType<{ style?: React.CSSProperties }>;
}

const NAV_ITEMS: NavItem[] = [
  { tab: "dashboard", label: "Dashboard", Icon: LayoutGrid },
  { tab: "queries", label: "Queries", Icon: Send },
  { tab: "agents", label: "Agents", Icon: Users },
  { tab: "manuscripts", label: "Manuscripts", Icon: Book },
];

interface SidebarNavProps {
  activeTab: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Page-context slot — filter/sort for the current page. Rendered below the divider. */
  context?: React.ReactNode;
  /** Account chip pinned to the foot (margin-top:auto), above a hairline. */
  account?: React.ReactNode;
}

const NavRow: React.FC<{ item: NavItem; active: boolean; onClick: () => void }> = ({ item, active, onClick }) => {
  const { Icon, label } = item;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        fontFamily: FONT_SANS,
        fontSize: 15,
        fontWeight: active ? 700 : 600,
        color: active ? burgundy : linkRest,
        background: active ? pinkActive : "transparent",
        border: "none",
        borderRadius: 9,
        padding: "9px 11px",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "background 0.14s, color 0.14s",
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = pinkHover; e.currentTarget.style.color = bodyInk; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = linkRest; } }}
    >
      <Icon style={{ width: 17, height: 17, flexShrink: 0 }} />
      {label}
    </button>
  );
};

export const SidebarNav: React.FC<SidebarNavProps> = ({ activeTab, onNavigate, context, account }) => (
  <aside
    style={{
      width: 300, // +33% from the prior 226 (mockup widened the rail); content reflows, no restyle
      flexShrink: 0,
      background: chromeWhite,
      // Thin grey right edge, matching the top strip's bottom border (desk-scoped: rail renders here).
      borderRight: "1px solid #d6cfc4",
      display: "flex",
      flexDirection: "column",
      padding: "18px 14px 14px",
      minHeight: 0,
    }}
  >
    {/* Wordmark */}
    <button
      type="button"
      onClick={() => onNavigate("dashboard")}
      style={{
        fontFamily: FONT_SERIF,
        fontWeight: 600,
        fontSize: 22,
        color: inkShell,
        letterSpacing: "-0.01em",
        padding: "2px 8px 16px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
      }}
      aria-label="ScriptAlly — go to dashboard"
    >
      Script<span style={{ color: burgundy }}>Ally</span>
    </button>

    {/* Global page nav */}
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {NAV_ITEMS.map((item) => (
        <NavRow key={item.tab} item={item} active={activeTab === item.tab} onClick={() => onNavigate(item.tab)} />
      ))}
    </div>

    {/* Divider */}
    <div style={{ height: 0.5, background: navBorder, margin: "14px 6px" }} />

    {/* Page-context slot (filter / sort) */}
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, overflowY: "auto" }}>
      {context}
    </div>

    {/* Account chip — pinned to the foot */}
    {account}
  </aside>
);
