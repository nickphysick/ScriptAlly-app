/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SidebarNav — the left rail of the Queries shell. Top → bottom: logo lockup · global page nav
 * (Dashboard, Queries, Agents, Manuscripts — icon + label) · an account chip pinned to the foot.
 * The rail is collapsible (a chevron on its right edge) to a 58px icon-only strip; the collapsed
 * state persists per browser via localStorage.
 *
 * The page's own filter/sort/manuscript controls used to live here — they now live in the list card
 * header (Queries Hub redesign), so the rail is pure global nav. Active page = the pink accent pill.
 *
 * Presentational: the account node is passed in as a prop so the rail stays page-agnostic. Collapse
 * behaviour is driven by a `.qrail-collapsed` class + a scoped <style> block, so passed-in nodes
 * (e.g. the account chip) collapse via CSS without threading state through props.
 */
import React, { useState } from "react";
import { LayoutGrid, Send, Users, Book, ChevronLeft } from "lucide-react";
import { FONT_SERIF, bodyInk } from "../../lib/designTokens";
import { pinkHover, inkShell } from "./shellTokens";
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
  /** Account chip pinned to the foot (margin-top:auto), above a hairline. */
  account?: React.ReactNode;
}

const COLLAPSE_KEY = "scriptally.queriesRailCollapsed";

const NavRow: React.FC<{ item: NavItem; active: boolean; onClick: () => void }> = ({ item, active, onClick }) => {
  const { Icon, label } = item;
  return (
    <button
      type="button"
      className="qnav-row"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        fontFamily: FONT_SERIF,
        fontSize: 20,
        fontWeight: 600,
        color: active ? inkShell : "#5a5048",
        // Active = pink accent chip + ink border + soft shadow; inactive keeps a transparent border
        // of the same width so the box doesn't jump between states.
        background: active ? "#f5c7c2" : "transparent",
        border: active ? "1.5px solid #1d1712" : "1.5px solid transparent",
        boxShadow: active ? "0 2px 8px rgba(29,23,18,.10)" : "none",
        borderRadius: 11,
        padding: "9px 11px",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "background 0.14s, color 0.14s",
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = pinkHover; e.currentTarget.style.color = bodyInk; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#5a5048"; } }}
    >
      <span className="qnav-ic" style={{ display: "flex", flexShrink: 0 }}><Icon style={{ width: 21, height: 21 }} /></span>
      <span className="qnav-label">{label}</span>
    </button>
  );
};

export const SidebarNav: React.FC<SidebarNavProps> = ({ activeTab, onNavigate, account }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });
  const toggle = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* private mode — ignore */ }
    return next;
  });

  return (
    <aside
      className={`qrail${collapsed ? " qrail-collapsed" : ""}`}
      style={{
        width: collapsed ? 58 : 228, // per the Queries Hub mockup (.side)
        flexShrink: 0,
        background: "#faf5ee",
        borderRight: "1px solid #d6cfc4",
        position: "relative",
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        padding: collapsed ? "20px 8px" : "20px 15px",
        minHeight: 0,
        transition: "width .18s ease",
      }}
    >
      <style>{`
        .qrail-collapsed .qnav-label,
        .qrail-collapsed .qbrand-wm,
        .qrail-collapsed .qacct-name,
        .qrail-collapsed .qacct-chev { display: none; }
        .qrail-collapsed .qnav-row { justify-content: center; padding: 9px 0; }
        .qrail-collapsed .qbrand { justify-content: center; }
        .qrail-collapsed .qacct { justify-content: center; }
        .qrail-collapsed .qcollapse svg { transform: rotate(180deg); }
      `}</style>

      {/* Collapse toggle — a chevron straddling the rail's right edge */}
      <button
        type="button"
        className="qcollapse"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand" : "Collapse"}
        style={{
          position: "absolute", top: 18, right: -13, width: 26, height: 26, borderRadius: "50%",
          background: "#fffefb", border: "1px solid #1d1712", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#1d1712", cursor: "pointer", zIndex: 6,
          boxShadow: "0 2px 6px rgba(29,23,18,.15)",
        }}
      >
        <ChevronLeft style={{ width: 14, height: 14, transition: "transform .18s ease" }} />
      </button>

      {/* Logo + wordmark — real assets, tucked close */}
      <button
        type="button"
        className="qbrand"
        onClick={() => onNavigate("dashboard")}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "2px 4px 18px", background: "transparent", border: "none", cursor: "pointer", width: "100%" }}
        aria-label="ScriptAlly — go to dashboard"
      >
        <img src="/scriptally-logo-v2.png" alt="" style={{ height: 27, width: "auto", flexShrink: 0 }} />
        <span className="qbrand-wm" style={{ display: "flex" }}><ScriptAllyLogo size="md" /></span>
      </button>

      {/* Global page nav */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map((item) => (
          <NavRow key={item.tab} item={item} active={activeTab === item.tab} onClick={() => onNavigate(item.tab)} />
        ))}
      </div>

      {/* Account chip — pinned to the foot */}
      {account}
    </aside>
  );
};
