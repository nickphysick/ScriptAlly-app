/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — the page body (design authority: design-refs/agent-list-mockup.html).
 *
 * Phase 1 ships the chrome: header + Add button, filter chips with live counts, the search pill,
 * the three-swatch legend, the count line and the grid frame with its empty states. The cards
 * (Phase 2) and the flip editor (Phase 3+) drop into the grid; every value shown here is derived
 * in src/lib/agentList.ts, never stored.
 *
 * The page owns its own chrome and scroll — it mounts in a bare `fill`+`clip` StagePage.
 */
import React, { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import {
  AGENT_LIST_CHIPS,
  AgentListFilter,
  agentCountLine,
  agentListCounts,
  visibleAgents,
} from "../../lib/agentList";
import "./agentList.css";

interface AgentListProps {
  /** A global search landing on this route seeds the page filter. */
  searchQuery?: string;
  /** App's navigate bridge — opts.agentId preselects the Log-a-Query agent. */
  onNavigate?: (tab: string, subPageName?: string, opts?: { agentId?: string }) => void;
}

export const AgentList: React.FC<AgentListProps> = ({ searchQuery, onNavigate }) => {
  const { agents, queries } = useScriptAllyDb();

  const [filter, setFilter] = useState<AgentListFilter>("all");
  const [search, setSearch] = useState(searchQuery?.trim() || "");

  const counts = useMemo(() => agentListCounts(agents, queries), [agents, queries]);
  const visible = useMemo(
    () => visibleAgents(agents, queries, filter, search),
    [agents, queries, filter, search],
  );

  // Phase 6 wires the real draft-agent flow; the header button is a stub until then.
  const onAddAgent = () => onNavigate?.("agents", "Add an agent");

  return (
    <div className="aglist">
      <div className="agl-page">
        <div className="agl-head">
          <div>
            <div className="agl-crumb">
              Querying &nbsp;/&nbsp; <span className="cur">Agents</span>
            </div>
            <h1 className="agl-h1">Your agent list</h1>
            <p className="agl-sub">Everyone you're querying, watching, or saving for later.</p>
          </div>
          <button type="button" className="agl-btn agl-btn-dark agl-btn-add" onClick={onAddAgent}>
            <Plus width={14} height={14} aria-hidden="true" />
            Add new agent
          </button>
        </div>

        <div className="agl-controls">
          {AGENT_LIST_CHIPS.map((chip) => (
            <button
              type="button"
              key={chip.key}
              className={`agl-fchip${filter === chip.key ? " on" : ""}`}
              aria-pressed={filter === chip.key}
              onClick={() => setFilter(chip.key)}
            >
              {chip.label} <span className="n">{counts[chip.key]}</span>
            </button>
          ))}
          <div className="agl-spacer" />
          <div className="agl-search">
            <Search width={14} height={14} aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents or agencies…"
              aria-label="Search agents or agencies"
            />
          </div>
        </div>

        <div className="agl-legend">
          <span className="agl-leg">
            <span className="sw" style={{ background: "var(--agl-sage-band)" }} />
            Active queries
          </span>
          <span className="agl-leg">
            <span className="sw" style={{ background: "var(--agl-pink-band)" }} />
            No active queries
          </span>
          <span className="agl-leg dim">
            <span className="sw" style={{ background: "var(--agl-grey-band)" }} />
            Closed for submissions
          </span>
        </div>

        <div className="agl-countline">{agentCountLine(visible.length, agents.length)}</div>

        <div className="agl-grid">
          {visible.length === 0 && (
            <div className="agl-empty">
              {agents.length === 0 ? (
                <>
                  <div className="big">No agents yet.</div>
                  <div className="small">Add the first one and your list starts here.</div>
                </>
              ) : (
                <>
                  <div className="big">No agents match.</div>
                  <div className="small">Loosen the filter, or clear the search.</div>
                </>
              )}
            </div>
          )}
          {/* Cards land here in Phase 2. */}
        </div>
      </div>
    </div>
  );
};
