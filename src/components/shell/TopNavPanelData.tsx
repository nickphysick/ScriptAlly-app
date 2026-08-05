/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TopNavPanelData — derives the mega-menus' live figures and hands them down.
 *
 * ⚠️ EVERY FIGURE COMES FROM A SELECTOR THAT ALREADY EXISTS. No new stored field, no new query:
 * the panel is a lens on state DbProvider is already subscribed to. A render-prop rather than a
 * hook call inside the shell, so the shell stays presentational and this stays the one place the
 * derivations live.
 */
import React, { useMemo } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { sidebarBoardTiles } from "../../lib/shellSidebar";
import { agentIdleCount } from "../../lib/agentsPage";

export const TopNavPanelData: React.FC<{
  children: (input: { overdue: number; idle: number; packagelessManuscripts: number }) => React.ReactNode;
}> = ({ children }) => {
  const { tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser, packages } = useScriptAllyDb();

  const input = useMemo(() => {
    // "Past their reply window" IS the To-do board's urgent tile — the same recipe the board and
    // the column read, so the three cannot disagree about what is overdue.
    const tiles = sidebarBoardTiles({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
      now: Date.now(), mutedTaskRules: currentUser?.mutedTaskRules,
    });
    // "Saved but never queried" is agentIdleCount's own definition — the Agents pulse line's.
    const idle = agentIdleCount(agents, queries);
    // Manuscripts with no package built — packages carry their manuscriptId.
    const withPackage = new Set(packages.map((p) => p.manuscriptId));
    const packagelessManuscripts = manuscripts.filter((m) => !withPackage.has(m.id)).length;
    return { overdue: tiles.urgent, idle, packagelessManuscripts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, userTasks, queries, agents, manuscripts, taskFlags, packages, currentUser?.mutedTaskRules]);

  return <>{children(input)}</>;
};
