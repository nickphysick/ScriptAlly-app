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
import { FONT_SERIF, bodyInk } from "../../lib/designTokens";
import { navBorder, pinkHover, inkShell } from "./shellTokens";
import { ScriptAllyLogo } from "../ScriptAllyLogo";

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
        fontFamily: FONT_SERIF,
        fontSize: 16,
        fontWeight: 600,
        color: active ? inkShell : "#5a5048",
        // Active = pink accent chip + ink border + soft shadow; inactive keeps a transparent border
        // of the same width so the box doesn't jump between states.
        background: active ? "#f5c7c2" : "transparent",
        border: active ? "1.5px solid #1d1712" : "1.5px solid transparent",
        boxShadow: active ? "0 2px 8px rgba(29,23,18,.10)" : "none",
        borderRadius: 11,
        padding: "9px 13px",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "background 0.14s, color 0.14s",
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = pinkHover; e.currentTarget.style.color = bodyInk; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#5a5048"; } }}
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
      background: "#faf5ee",
      // Full-height rail: cream field with a grey hairline right edge (softened from Phase C's ink
      // line so a page-tall border doesn't over-weight the chrome; inner cards keep their ink borders).
      borderRight: "1px solid #d6cfc4",
      position: "relative",
      zIndex: 2,
      display: "flex",
      flexDirection: "column",
      padding: "18px 14px 14px",
      minHeight: 0,
    }}
  >
    {/* Logo + wordmark — the real assets, centred at the top of the rail */}
    <button
      type="button"
      onClick={() => onNavigate("dashboard")}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        padding: "2px 8px 16px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        width: "100%",
      }}
      aria-label="ScriptAlly — go to dashboard"
    >
      <img src="/scriptally-logo-v2.png" alt="" style={{ height: 30, width: "auto", flexShrink: 0 }} />
      <ScriptAllyLogo size="md" />
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
