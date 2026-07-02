/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SidebarShell — the left-sidebar chrome that wraps a migrated page. A full-height flex row: the
 * SidebarNav rail (global page nav + a page-context slot + a foot carrying the utility icons and the
 * account chip) on the left, and the page's content column on the right, filling the height.
 *
 * The old top strip (breadcrumb + utility cluster) has been retired for the Queries Hub — the page
 * owns its own header inside the working area, and the utilities + account live at the rail foot.
 *
 * This is the new shell the Queries page adopts first (Agents/Manuscripts migrate in follow-ups).
 * It is intentionally separate from the legacy top-bar `AppShell` (which still wraps the Dashboard
 * and the not-yet-migrated tabs); the global top <Nav> is suppressed for any tab rendered here.
 */
import React from "react";
import { HelpCircle } from "lucide-react";
import { SidebarNav } from "./SidebarNav";

interface SidebarShellProps {
  activeTab: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  breadcrumb: string[];
  onCrumbClick?: (index: number) => void;
  /** Page-context node for the rail (filter / sort). */
  context?: React.ReactNode;
  /** Account chip for the rail foot. */
  account?: React.ReactNode;
  /** Utility cluster for the top strip (help / notifications / settings / avatar). */
  utility?: React.ReactNode;
  children: React.ReactNode;
}

export const SidebarShell: React.FC<SidebarShellProps> = ({
  activeTab,
  onNavigate,
  breadcrumb,
  onCrumbClick,
  context,
  account,
  children,
}) => (
  <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#ffffff" }}>
    <SidebarNav activeTab={activeTab} onNavigate={onNavigate} account={account} />
    {/* Content column fills the full height (no top strip) — the page owns its own header. */}
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", background: "#ffffff" }}>{children}</div>
    {/* Floating help — fixed bottom-right of the viewport */}
    <button
      type="button"
      onClick={() => onNavigate("help")}
      title="Help"
      aria-label="Help"
      style={{
        position: "fixed", bottom: 22, right: 22, width: 48, height: 48, borderRadius: "50%",
        background: "#fffefb", border: "1.5px solid #1d1712", boxShadow: "0 6px 18px rgba(29,23,18,.22)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3a2a", cursor: "pointer", zIndex: 60,
      }}
    >
      <HelpCircle style={{ width: 22, height: 22 }} />
    </button>
  </div>
);
