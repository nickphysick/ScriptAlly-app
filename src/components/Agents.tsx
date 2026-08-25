/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The /agents route. This file keeps its name and its `Agents` export (the route wiring in
 * App.tsx is untouched); the page itself is now the AGENT LIST rebuild — a card grid with an
 * in-place flip editor, per design-refs/agent-list-mockup.html.
 *
 * The previous "F12 Contact List" implementation (filter/sort/group rail, two-pane reading
 * surface, inline link-pill editors, tasks popover) is superseded wholesale and lives in git
 * history at ed909ce — pull from there if any of its behaviour needs reviving.
 */
import React from "react";
import { AgentList } from "./agents/AgentList";

interface AgentsProps {
  searchQuery?: string;
  /** App's handleNavigate bridge — opts.agentId preselects the Log-a-Query agent. */
  onNavigate?: (tab: string, subPageName?: string, opts?: { agentId?: string }) => void;
  /**
   * ⚠️ TRUE WHILE `/agents` IS THE VISIBLE ROUTE, AND IT IS THREADED NOW (workspace round, Phase 5).
   * It was accepted here and dropped on the floor — "retained for App.tsx's call site" — and the
   * one-shot agent reveal has been silently dead ever since, because a page that never unmounts has
   * no other way to observe that it has arrived. See `AgentList`'s own note.
   */
  active?: boolean;
}

export const Agents: React.FC<AgentsProps> = ({ searchQuery, onNavigate, active }) => (
  <AgentList searchQuery={searchQuery} onNavigate={onNavigate} active={active} />
);
