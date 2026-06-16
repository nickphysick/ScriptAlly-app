/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App shell — the shared layout that wraps every routed page: a single horizontal top bar (Nav)
 * across the top and the routed page beneath it, full width. The top bar is sticky and sits in
 * normal flow, so content simply follows it (no left rail, no content margin). Active-section
 * wayfinding is the highlighted top-bar link.
 */
import React from "react";
import { Nav } from "./Nav";

interface AppShellProps {
  activeTab: string;
  activeSubPage: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onNavigate,
  searchQuery,
  setSearchQuery,
  children,
}) => (
  <>
    <Nav
      activeTab={activeTab}
      onNavigate={onNavigate}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
    <main>{children}</main>
  </>
);
