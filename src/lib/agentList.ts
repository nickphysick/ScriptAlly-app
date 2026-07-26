/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — the pure derivations behind the card grid (design authority:
 * design-refs/agent-list-mockup.html). Everything here is derived at read time from the agent
 * plus the live query set; nothing in this module is ever stored on the agent.
 *
 * Two vocabularies the whole page shares:
 *   · RELATIONSHIP (your history with them) — active / prev / never, worded exactly once in
 *     `relationshipLabel` so the card pill, the filter chips and the empty-history line agree.
 *   · DOOR (their submission status) — open or closed. `SubmissionStatus.UNKNOWN` is retired at
 *     the UI layer: it READS as open (no stamp, no fade, no closed-chip membership) and is only
 *     ever written as "Open"/"Closed", so an agent migrates off Unknown on its first saved edit.
 */
import { Agent, Query, QueryStatus, SubmissionStatus } from "../types";

/** Terminal query statuses — everything else, INCLUDING Offer, counts as an active query. */
export const TERMINAL_STATUSES: readonly QueryStatus[] = [
  QueryStatus.REJECTED,
  QueryStatus.WITHDRAWN,
  QueryStatus.NO_RESPONSE,
];

/** The statuses where the agent has asked for something and the writer owes it — "your pages". */
export const AWAITING_PAGES_STATUSES: readonly QueryStatus[] = [
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.REVISE_RESUBMIT,
];

export const isTerminalStatus = (s: QueryStatus | string): boolean =>
  TERMINAL_STATUSES.includes(s as QueryStatus);

/** Every query on record for this agent, oldest first (the card's history strip order). */
export const queriesForAgent = (agentId: string, queries: Query[]): Query[] =>
  queries
    .filter((q) => q.agentId === agentId)
    .slice()
    .sort((a, b) => Date.parse(a.dateSent || "0") - Date.parse(b.dateSent || "0"));

export type AgentRelationship = "active" | "prev" | "never";

/** Your history with this agent: any live query → active; only terminal ones → prev; none → never. */
export function agentRelationship(agentId: string, queries: Query[]): AgentRelationship {
  const mine = queries.filter((q) => q.agentId === agentId);
  if (!mine.length) return "never";
  return mine.some((q) => !isTerminalStatus(q.status)) ? "active" : "prev";
}

/** The one place the relationship is worded — pill, chips and empty line all read from here. */
export function relationshipLabel(rel: AgentRelationship): string {
  switch (rel) {
    case "active": return "Active queries";
    case "prev": return "No active queries";
    default: return "Never queried";
  }
}

/** Does the agent have a request outstanding that the writer still owes materials for? */
export const awaitingYourPages = (agentId: string, queries: Query[]): boolean =>
  queries.some((q) => q.agentId === agentId && AWAITING_PAGES_STATUSES.includes(q.status));

/**
 * Their door. UNKNOWN reads as OPEN (decision 3) — the ONLY closed state is an explicit
 * `SubmissionStatus.CLOSED`, so door state, card fade, stamp and chip counts can never disagree.
 */
export const isDoorOpen = (agent: Pick<Agent, "submissionStatus">): boolean =>
  agent.submissionStatus !== SubmissionStatus.CLOSED;

/** Card state class: closed overrides everything, else active → sage, no-active/never → pink. */
export function agentStateClass(agent: Agent, queries: Query[]): "s-sage" | "s-pink" | "s-grey" {
  if (!isDoorOpen(agent)) return "s-grey";
  return agentRelationship(agent.id, queries) === "active" ? "s-sage" : "s-pink";
}

export type AgentListFilter = "all" | "active" | "waiting" | "prev" | "notq" | "closed";

export interface AgentListChip {
  key: AgentListFilter;
  label: string;
}

/** Chip order + wording, straight from the mockup's control row. */
export const AGENT_LIST_CHIPS: readonly AgentListChip[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active queries" },
  { key: "waiting", label: "Awaiting your pages" },
  { key: "prev", label: "No active queries" },
  { key: "notq", label: "Never queried" },
  { key: "closed", label: "Closed for submissions" },
];

export function matchesAgentFilter(agent: Agent, queries: Query[], filter: AgentListFilter): boolean {
  switch (filter) {
    case "active": return agentRelationship(agent.id, queries) === "active";
    case "waiting": return awaitingYourPages(agent.id, queries);
    case "prev": return agentRelationship(agent.id, queries) === "prev";
    case "notq": return agentRelationship(agent.id, queries) === "never";
    case "closed": return !isDoorOpen(agent);
    default: return true;
  }
}

/** Search is name OR agency, case-insensitive (the mockup's exact reach). */
export function matchesAgentSearch(agent: Agent, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (agent.name || "").toLowerCase().includes(q) || (agent.agency || "").toLowerCase().includes(q);
}

export const visibleAgents = (agents: Agent[], queries: Query[], filter: AgentListFilter, search: string): Agent[] =>
  agents.filter((a) => matchesAgentFilter(a, queries, filter) && matchesAgentSearch(a, search));

export type AgentListCounts = Record<AgentListFilter, number>;

/**
 * Live chip counts over the WHOLE list (never the filtered view — a chip must show what it would
 * reveal). The relationship buckets partition the list; waiting and closed cut across them.
 */
export function agentListCounts(agents: Agent[], queries: Query[]): AgentListCounts {
  const c: AgentListCounts = { all: agents.length, active: 0, waiting: 0, prev: 0, notq: 0, closed: 0 };
  for (const a of agents) {
    const rel = agentRelationship(a.id, queries);
    if (rel === "active") c.active += 1;
    else if (rel === "prev") c.prev += 1;
    else c.notq += 1;
    if (awaitingYourPages(a.id, queries)) c.waiting += 1;
    if (!isDoorOpen(a)) c.closed += 1;
  }
  return c;
}

/** "12 of 20 agents" — singular-safe. */
export const agentCountLine = (visible: number, total: number): string =>
  `${visible} of ${total} ${total === 1 ? "agent" : "agents"}`;

/** The meta line's method token: Form / the free-text Other / Email. */
export function methodShort(agent: Pick<Agent, "submissionMethod" | "agentNotes">): string {
  const m = agent.submissionMethod as string;
  if (m === "Online Form") return "Form";
  if (m === "Other") return (agent.agentNotes || "").trim() || "Other";
  return m || "Email";
}

/**
 * The card's mono meta line. Absence is a first-class state (amendment A): an agent with no
 * stated response time reads "response unknown" rather than inventing a number, and the
 * no-reply token appears only once the writer has actually set it true.
 */
export function metaTokens(agent: Agent): string[] {
  const weeks = agent.responseTimeWeeks;
  const tokens = [weeks && weeks > 0 ? `~${weeks} wks` : "response unknown", methodShort(agent)];
  if (agent.noResponseMeansNo === true) tokens.push("No reply = no");
  return tokens;
}
