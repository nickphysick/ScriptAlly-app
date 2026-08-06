/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TopNavHost — TopNavShell plus the command palette (shell-rebuild pack, Phase 5).
 *
 * ⚠️ THIS EXISTS BECAUSE A HOOK CANNOT BE CALLED IN A BRANCH. App.tsx returns early for top-nav
 * routes, so `usePalette` cannot be called beside that branch without breaking the rules of
 * hooks. A component is the seam that lets BOTH shells mount the same palette.
 *
 * ⚠️ WITHOUT THIS, ⌘K AND THE SEARCH PILL DID NOTHING ON THE DASHBOARD. The palette was hosted
 * inside AppShell — the workspace shell — so the second shell simply had no search.
 */
import React from "react";
import { TopNavShell } from "./TopNavShell";
import { usePalette } from "./usePalette";

export interface TopNavHostProps {
  onNavigate: (tab: string, subPageName?: string) => void;
  onNavigatePath: (path: string) => void;
  setSearchQuery: (v: string) => void;
  panelInput: { overdue: number; idle: number; packagelessManuscripts: number };
  children: React.ReactNode;
}

export const TopNavHost: React.FC<TopNavHostProps> = ({
  onNavigate, onNavigatePath, setSearchQuery, panelInput, children,
}) => {
  const { openPalette, searchOpenerRef, palette } = usePalette({
    onNavigate, onNavigatePath, setSearchQuery,
  });

  return (
    <>
      <TopNavShell
        onNavigate={onNavigate}
        onNavigatePath={onNavigatePath}
        onOpenSearch={openPalette}
        searchOpenerRef={searchOpenerRef}
        panelInput={panelInput}
      >
        {children}
      </TopNavShell>
      {palette}
    </>
  );
};
