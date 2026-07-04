/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure core of the shared smart-search machinery — grouping/ranking/caps and the keyboard-wrap
 * step, with NO React/Firebase imports so the unit suite can load it in the node environment.
 * The stateful hook + dropdown live in components/searchSuggestions.tsx and re-export these.
 */
import { Agent, Query, Manuscript } from "../types";

export const SEARCH_CAP = 4;

/** "Eva Vance" → "EV", "Arthur Conan Doyle" → "ACD" (max 3). */
export const initialsOf = (name: string) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 3)
    .toUpperCase() || "?";

export type SearchHit =
  | { kind: "agent"; agent: Agent }
  | { kind: "query"; query: Query; agent?: Agent; manuscriptTitle: string };

export interface SearchSuggestionGroups {
  agentResults: Agent[];
  queryResults: SearchHit[];
  flat: SearchHit[];
}

/** Pure grouping/ranking — agents (name/agency) then queries (agent/manuscript/status), CAP each. */
export const buildSearchSuggestions = (
  term: string,
  agents: Agent[],
  queries: Query[],
  manuscripts: Manuscript[],
): SearchSuggestionGroups => {
  if (!term) return { agentResults: [], queryResults: [], flat: [] };

  const agentResults = agents
    .filter((a) => a.name.toLowerCase().includes(term) || (a.agency || "").toLowerCase().includes(term))
    .slice(0, SEARCH_CAP);

  const queryResults: SearchHit[] = queries
    .map((q) => {
      const agent = agents.find((a) => a.id === q.agentId);
      const manuscriptTitle = manuscripts.find((m) => m.id === q.manuscriptId)?.title || "Untitled manuscript";
      return { kind: "query" as const, query: q, agent, manuscriptTitle };
    })
    .filter(
      (r) =>
        (r.agent?.name || "").toLowerCase().includes(term) ||
        r.manuscriptTitle.toLowerCase().includes(term) ||
        String(r.query.status).toLowerCase().includes(term),
    )
    .slice(0, SEARCH_CAP);

  const flat: SearchHit[] = [...agentResults.map((agent) => ({ kind: "agent" as const, agent })), ...queryResults];
  return { agentResults, queryResults, flat };
};

/** Pure ↑/↓ wrap step; any other key returns the highlight unchanged. */
export const stepHighlight = (key: string, highlight: number, count: number): number => {
  if (count <= 0) return 0;
  if (key === "ArrowDown") return (highlight + 1) % count;
  if (key === "ArrowUp") return (highlight - 1 + count) % count;
  return highlight;
};
