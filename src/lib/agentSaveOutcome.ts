/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What happens to a card after it is saved — computed BEFORE the motion runs, so the choreography
 * and the notice always describe the same outcome.
 *
 * Three outcomes, and the third is the one that matters. A saved agent may not survive the filters
 * that are currently applied — a never-queried agent saved while the list is filtered to "Active
 * queries" has no slot to travel to. It must not silently disappear: the card leaves with the
 * discard motion and says where it went. An interface that quietly swallows something you just
 * created teaches you not to trust it.
 *
 * Sort position is knowable here because sorting is applied to the DATA (a pure function over the
 * agent array), not to the rendered list — so the destination index can be computed before
 * anything moves.
 */

import { Agent, Query } from "../types";
import { matchesAgentSearch } from "./agentList";
import { AgentFilters, SortDir, SortKey, matchesFilters, sortAgents, sortSpec } from "./agentFilters";

export type SaveOutcome =
  /** The card stays in the list and travels to its sorted place. */
  | { kind: "travel"; index: number; total: number; sortLabel: string }
  /** The card no longer matches the active filters: it leaves, and the notice says so. */
  | { kind: "filtered-out" };

export interface SaveContext {
  agents: Agent[];
  queries: Query[];
  filters: AgentFilters;
  search: string;
  sort: SortKey;
  sortDir: SortDir;
}

/** The list as it will be rendered once the save lands. */
const listAfter = (saved: Agent, ctx: SaveContext): Agent[] =>
  sortAgents(
    ctx.agents.filter((a) => matchesFilters(a, ctx.queries, ctx.filters) && matchesAgentSearch(a, ctx.search)),
    ctx.sort,
    ctx.sortDir,
  );

/* ⚠️ `sectionFor` AND `sectionChanged` ARE RETIRED (Phase 7). They existed for the GRID's section
   grouping, which is retired with them — grouping arranges the BOARD now, and the board is not a
   place a saved card "travels" to a position in. The travel notice keeps its position and its
   sort; what it loses is a clause that could only ever have been false. */

/**
 * Where the saved agent ends up, and how it should get there.
 *
 * `sectionChanged` decides the MOVE, not just the wording: a card travelling within one list is a
 * shuffle, and sliding is the honest depiction — but a card that has changed section has changed
 * CATEGORY, and flying it across a heading implies a continuity that isn't real. Those fall at the
 * old home and rise at the new one. Same vocabulary, different move.
 */
export function saveOutcome(saved: Agent, ctx: SaveContext): SaveOutcome {
  const survives =
    matchesFilters(saved, ctx.queries, ctx.filters) && matchesAgentSearch(saved, ctx.search);
  if (!survives) return { kind: "filtered-out" };

  const after = listAfter(saved, ctx);
  const index = after.findIndex((a) => a.id === saved.id);
  const sortLabel = sortSpec(ctx.sort).label;
  return {
    kind: "travel",
    // 1-based: the notice is read by a person counting cards, not by an array
    index: index < 0 ? 0 : index + 1,
    total: after.length,
    sortLabel,
  };
}

/**
 * The notice. It exists because a card that travels off-screen otherwise just vanishes — the
 * motion answers "did it save?" only for a destination you can see, and the sentence answers it
 * for one you can't.
 */
export function saveNotice(name: string, outcome: SaveOutcome): string {
  const who = name.trim() || "That agent";
  if (outcome.kind === "filtered-out") return `${who} saved. Not shown under your current filters.`;
  return `${who} saved. Moved to position ${outcome.index} under ${outcome.sortLabel}.`;
}
