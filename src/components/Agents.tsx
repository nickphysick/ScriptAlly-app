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
  /** True while /agents is the visible route. Retained for App.tsx's call site; the rebuilt page
   *  has no global key bindings yet (the flip editor owns Escape locally, from Phase 3). */
  active?: boolean;
}

export const Agents: React.FC<AgentsProps> = ({ searchQuery, onNavigate }) => (
  <AgentList searchQuery={searchQuery} onNavigate={onNavigate} />
);
