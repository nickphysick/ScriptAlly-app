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
import {
  AgentFilterSet,
  AgentGrouping,
  AgentListSort,
  AGENT_SORT_OPTIONS,
  groupAgents,
  matchesAgentSearch,
  matchesFilterSet,
  sortAgentList,
} from "./agentList";

export type SaveOutcome =
  /** The card stays in the list and travels to its sorted place. */
  | { kind: "travel"; index: number; total: number; sortLabel: string; sectionChanged: boolean }
  /** The card no longer matches the active filters: it leaves, and the notice says so. */
  | { kind: "filtered-out" };

export interface SaveContext {
  agents: Agent[];
  queries: Query[];
  filters: AgentFilterSet;
  search: string;
  sort: AgentListSort;
  grouping: AgentGrouping;
  /** The section the card sat in before the save — only meaningful while grouping is on. */
  sectionBefore?: string | null;
}

/** The list as it will be rendered once the save lands. */
const listAfter = (saved: Agent, ctx: SaveContext): Agent[] =>
  sortAgentList(
    ctx.agents.filter((a) => matchesFilterSet(a, ctx.queries, ctx.filters) && matchesAgentSearch(a, ctx.search)),
    ctx.sort,
    ctx.queries,
  );

/** Which group section an agent lands in — null when grouping is off. */
export function sectionFor(agent: Agent, ctx: SaveContext): string | null {
  if (ctx.grouping === "none") return null;
  const secs = groupAgents([agent], ctx.grouping, ctx.queries);
  return secs[0]?.key ?? null;
}

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
    matchesFilterSet(saved, ctx.queries, ctx.filters) && matchesAgentSearch(saved, ctx.search);
  if (!survives) return { kind: "filtered-out" };

  const after = listAfter(saved, ctx);
  const index = after.findIndex((a) => a.id === saved.id);
  const sortLabel = AGENT_SORT_OPTIONS.find((o) => o.key === ctx.sort)?.label ?? String(ctx.sort);
  const sectionAfter = sectionFor(saved, ctx);
  return {
    kind: "travel",
    // 1-based: the notice is read by a person counting cards, not by an array
    index: index < 0 ? 0 : index + 1,
    total: after.length,
    sortLabel,
    sectionChanged: ctx.grouping !== "none" && (ctx.sectionBefore ?? null) !== sectionAfter,
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
