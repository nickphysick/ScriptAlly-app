/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App shell — the shared layout that wraps every routed page: a single horizontal top bar (Nav)
 * across the top and the routed page beneath it, full width. The top bar is sticky and sits in
 * normal flow, so content simply follows it (no left rail, no content margin). Active-section
 * wayfinding is the highlighted top-bar link.
 *
 * Agents sub-nav: when the Agents section is active, a 44px sticky strip below the top bar offers
 * "Agents database" | "Discover new agents" (same soft-pink active pill as the primary nav). It
 * occupies 44px of layout height, so the Agents-database page reserves it via calc(100vh - 108px)
 * (64 nav + 44 sub-nav); the Discover page does the same.
 */
import React from "react";
import { Nav } from "./Nav";
import { kraft, burgundy, ghostButtonText, FONT_SANS } from "../lib/designTokens";

const PINK = "#f8e7dc"; // soft-pink pill fill — mirrors the primary NavLink (inline, not Tailwind)

interface AppShellProps {
  activeTab: string;
  activeSubPage: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  children: React.ReactNode;
}

/** Agents sub-tab — soft-pink pill when active, consistent with the primary nav links. */
const SubTab: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    className="cursor-pointer"
    style={{
      fontFamily: FONT_SANS,
      fontSize: 12.5,
      fontWeight: active ? 500 : 400,
      whiteSpace: "nowrap",
      padding: "5px 13px",
      borderRadius: 16,
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

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  activeSubPage,
  onNavigate,
  searchQuery,
  setSearchQuery,
  children,
}) => (
  <>
    <Nav
      activeTab={activeTab}
      activeSubPage={activeSubPage}
      onNavigate={onNavigate}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
    {activeTab === "agents" && (
      <div
        className="sticky z-40 flex items-center gap-1 px-4 md:px-10 lg:px-14 xl:px-16"
        style={{ top: 64, height: 44, background: kraft, borderBottom: "1px solid rgba(124,58,42,0.10)" }}
      >
        <SubTab
          label="Agents database"
          active={activeSubPage !== "Discover new agents"}
          onClick={() => onNavigate("agents", "Agents database")}
        />
        <SubTab
          label="Discover new agents"
          active={activeSubPage === "Discover new agents"}
          onClick={() => onNavigate("agents", "Discover new agents")}
        />
      </div>
    )}
    <main>{children}</main>
  </>
);
