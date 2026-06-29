/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SidebarShell — the left-sidebar chrome that wraps a migrated page. A full-height flex row: the
 * SidebarNav rail (global page nav + a page-context slot + account foot) on the left, and a main
 * column on the right = a 48px TopStrip (breadcrumb + utility cluster) above a cream content well.
 * Both rail and strip are white, so the chrome reads as one continuous frame around the cream well.
 *
 * This is the new shell the Queries page adopts first (Agents/Manuscripts migrate in follow-ups).
 * It is intentionally separate from the legacy top-bar `AppShell` (which still wraps the Dashboard
 * and the not-yet-migrated tabs); the global top <Nav> is suppressed for any tab rendered here.
 */
import React from "react";
import { SidebarNav } from "./SidebarNav";
import { TopStrip } from "./TopStrip";

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
  utility,
  children,
}) => (
  <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#ffffff" }}>
    <SidebarNav activeTab={activeTab} onNavigate={onNavigate} context={context} account={account} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
      <TopStrip breadcrumb={breadcrumb} onCrumbClick={onCrumbClick} utility={utility} />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", background: "#ffffff" }}>{children}</div>
    </div>
  </div>
);
