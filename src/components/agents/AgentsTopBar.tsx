/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agents-page floating top pill (mirrors the dashboard's DashTopBar grammar): title cluster left
 * ("Agents database" · hairline · live filtered count), the composed search pill dead-centre
 * (magnifier / input / ⌘K chip), Add agent right. Unlike the dashboard pill, this search FILTERS
 * the agents list live (name + agency) — it is not the global suggestions search. The rail search
 * is hidden on this route (AppShell), so the page's ⌘K binding (owned by Agents.tsx, gated on
 * route visibility) is the only one live here — never both.
 */
import React from "react";
import { Search, Plus } from "lucide-react";
import { agentsCountLabel } from "../../lib/agentsPage";

interface AgentsTopBarProps {
  /** Live filtered count — reflects the list the user is looking at. */
  count: number;
  search: string;
  onSearch: (term: string) => void;
  onAddAgent: () => void;
  /** Owned by the page so its single keyboard handler can focus the field (⌘K, /). */
  searchRef: React.RefObject<HTMLInputElement | null>;
}

export const AgentsTopBar: React.FC<AgentsTopBarProps> = ({ count, search, onSearch, onAddAgent, searchRef }) => (
  <div className="ag-toppill ag-panel">
    <div className="ag-tleft">
      <span className="ag-ttl">
        Agents <em>database</em>
      </span>
      <span className="ag-tdiv" aria-hidden="true" />
      <span className="ag-tcount">{agentsCountLabel(count)}</span>
    </div>
    <div className="ag-searchpill">
      <Search aria-hidden="true" />
      <input
        ref={searchRef}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") (e.target as HTMLInputElement).blur();
        }}
        placeholder="Find agent or agency…"
        aria-label="Find agent or agency"
      />
      <span className="ag-kbd" aria-hidden="true">⌘K</span>
    </div>
    <div className="ag-tright">
      <button type="button" className="ag-btn" onClick={onAddAgent}>
        <Plus aria-hidden="true" />
        Add agent
      </button>
    </div>
  </div>
);
