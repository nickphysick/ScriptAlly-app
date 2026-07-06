/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agents-page editorial masthead (option A of the approved redesign — supersedes the floating
 * top pill): mono muted kicker "Your database" · big Playfair "Agents" with the search field +
 * solid Add-agent button aligned right of the title · a hairline rule · the live count beneath.
 * The search stays the LIST FILTER (name+agency, not the suggestions search) and keeps its ⌘K
 * chip — the page's single keyboard handler owns the binding via searchRef; the rail search is
 * hidden on /agents so this remains the only ⌘K registration live here.
 */
import React from "react";
import { Search, Plus } from "lucide-react";
import { agentsCountLabel } from "../../lib/agentsPage";

interface AgentsTopBarProps {
  /** TOTAL agents on file — deliberately independent of the live filters (Nick's call). */
  count: number;
  search: string;
  onSearch: (term: string) => void;
  onAddAgent: () => void;
  /** Owned by the page so its single keyboard handler can focus the field (⌘K, /). */
  searchRef: React.RefObject<HTMLInputElement | null>;
}

export const AgentsTopBar: React.FC<AgentsTopBarProps> = ({ count, search, onSearch, onAddAgent, searchRef }) => (
  <header className="ag-masthead">
    <div className="ag-mh-kicker">Your database</div>
    <div className="ag-mh-titlerow">
      <h1 className="ag-mh-title">Agents</h1>
      <div className="ag-mh-actions">
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
        <button type="button" className="ag-addbtn" onClick={onAddAgent}>
          <Plus aria-hidden="true" />
          Add agent
        </button>
      </div>
    </div>
    <div className="ag-mh-rule" aria-hidden="true" />
    <div className="ag-mh-count">{agentsCountLabel(count)}</div>
  </header>
);
