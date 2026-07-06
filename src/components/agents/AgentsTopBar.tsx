/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agents-page header — now a ChromeSlab composition (Option A, ref
 * design-refs/header-ground-fullpage-v1.html): the crumb strip + "Agents" title + live count
 * share the unified slab surface, with the page's REAL tools (the list-filter search + its ⌘K
 * chip, and Add agent) on the slab's right. The old editorial masthead's "Your database"
 * kicker is superseded by the crumb; its rule and count line fold into the slab meta. The
 * search stays the LIST FILTER (name+agency, not the suggestions search); the page's single
 * keyboard handler owns the binding via searchRef. The slab bleeds out of the .agv2 desk
 * padding (14px 22px) via negative margins — agentsV2.css is untouched.
 */
import React from "react";
import { Search, Plus } from "lucide-react";
import { agentsCountLabel } from "../../lib/agentsPage";
import { ChromeSlab } from "../shell/ChromeSlab";

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
  <ChromeSlab
    title="Agents"
    meta={agentsCountLabel(count)}
    style={{ margin: "-14px -22px 14px" }}
    tools={
      <>
        <div className="ag-searchpill" style={{ flex: "1 1 auto", minWidth: 160 }}>
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
        <button type="button" className="ag-addbtn" onClick={onAddAgent} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          <Plus aria-hidden="true" />
          Add agent
        </button>
      </>
    }
  />
);
