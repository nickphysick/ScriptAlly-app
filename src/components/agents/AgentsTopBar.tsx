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
import { agentsCountLabel, agentsPulse } from "../../lib/agentsPage";
import { FONT_SERIF } from "../../lib/designTokens";
import { ChromeSlab } from "../shell/ChromeSlab";

interface AgentsTopBarProps {
  /** TOTAL agents on file — deliberately independent of the live filters (Nick's call). */
  count: number;
  search: string;
  onSearch: (term: string) => void;
  onAddAgent: () => void;
  /** Owned by the page so its single keyboard handler can focus the field (⌘K, /). */
  searchRef: React.RefObject<HTMLInputElement | null>;
  /** GRAND MASTHEAD: idle (unqueried) count feeds the pulse line; the CTA becomes the hub
   *  primary and the search pill fixes its width so it never fights the 54px title. */
  grand?: boolean;
  idleCount?: number;
}

// Masthead CTA — the theme's primary button (espresso Capp / pink Bold / grey Editorial via the
// hub sheet), matching the Queries masthead CTA + the command-bar primary. One grammar.
const mastCtaStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 19px",
  borderRadius: "var(--hub-btn-rad, 8px)", fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 700,
  whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0,
  background: "var(--hub-primary, #422701)", color: "var(--hub-primary-tx, #fdfaf5)",
  border: "1px solid var(--hub-primary-bd, transparent)",
};

export const AgentsTopBar: React.FC<AgentsTopBarProps> = ({ count, search, onSearch, onAddAgent, searchRef, grand, idleCount = 0 }) => (
  <ChromeSlab
    grand={grand}
    title="Agents"
    meta={grand ? agentsPulse(count, idleCount) : agentsCountLabel(count)}
    tools={
      <>
        {/* Search stays in the masthead tools (the ref relocates it into the list — a follow-up;
            the ⌘K/searchRef wiring is load-bearing, so it stays put here). Fixed width when grand
            so it never squeezes the big title. */}
        <div className="ag-searchpill" style={grand ? { flex: "none", width: 210 } : { flex: "1 1 auto", minWidth: 160 }}>
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
        {grand ? (
          <button type="button" onClick={onAddAgent} style={mastCtaStyle}>
            <Plus aria-hidden="true" style={{ width: 15, height: 15 }} />
            Add agent
          </button>
        ) : (
          <button type="button" className="ag-addbtn" onClick={onAddAgent} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
            <Plus aria-hidden="true" />
            Add agent
          </button>
        )}
      </>
    }
  />
);
