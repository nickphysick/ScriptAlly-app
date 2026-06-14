/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App shell — the shared layout that wraps every routed page: a full-width top bar (Nav) across
 * the top, a left navigation rail down the left edge, and the routed page in the content region.
 * The active nav item derives from the current route (activeTab). Below lg the rail is an
 * off-canvas drawer toggled from the top bar's hamburger; content goes full width.
 */
import React, { useState, useEffect } from "react";
import { Nav } from "./Nav";
import { LeftRail, RAIL_WIDTH, RAIL_LEFT, RAIL_GAP } from "./LeftRail";

interface AppShellProps {
  activeTab: string;
  activeSubPage: string;
  onNavigate: (tab: string, subPageName?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  children: React.ReactNode;
}

// Content clears the fixed rail on lg+ (rail's right edge + a gap). Single source of truth — the
// margin is applied inline from these constants, so tuning RAIL_WIDTH needs no second edit.
const CONTENT_ML = RAIL_LEFT + RAIL_WIDTH + RAIL_GAP;
const DESKTOP_QUERY = "(min-width: 1024px)"; // matches the app's lg breakpoint

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
};

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  activeSubPage,
  onNavigate,
  searchQuery,
  setSearchQuery,
  children,
}) => {
  const [railOpen, setRailOpen] = useState(false);
  const isDesktop = useIsDesktop();

  return (
    <>
      <Nav
        activeTab={activeTab}
        activeSubPage={activeSubPage}
        onNavigate={onNavigate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onToggleRail={() => setRailOpen((o) => !o)}
      />
      <LeftRail activeTab={activeTab} onNavigate={onNavigate} open={railOpen} onClose={() => setRailOpen(false)} />
      <main
        className="transition-all duration-300 pt-[84px]"
        style={{ marginLeft: isDesktop ? CONTENT_ML : 0 }}
      >
        {children}
      </main>
    </>
  );
};
