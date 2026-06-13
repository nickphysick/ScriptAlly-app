/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure lifecycle logic shared by the Log-a-Query picker, the "who to query next" suggestions, and the
 * idle/Agents-stat-card. Side-effect-free so the exclusion rules are unit-testable in one place.
 *
 * Three INDEPENDENT dimensions (never one "inactive"):
 *   - availability  → the agent's own `submissionStatus` ('Open' | 'Closed' | 'Unknown'). Unknown
 *                     counts as open/suggestable (don't hide uncategorised agents).
 *   - set aside     → `agent.setAside` — YOU'RE not pursuing them. Reversible.
 *   - shelved       → `manuscript.shelved` — a book you've parked. Reversible.
 * Queries + history are always kept; these only filter the picker / suggestions / idle bucket.
 */
import { Agent, Query, Manuscript, SubmissionStatus } from "../types";

export type SuggestionReason = "already_queried" | "set_aside" | "closed";

type AgentLike = Pick<Agent, "id" | "submissionStatus" | "setAside">;
type QueryLike = Pick<Query, "agentId" | "manuscriptId">;

/** Closed = availability is explicitly Closed. Unknown is treated as open/suggestable. */
export function agentIsClosed(agent: AgentLike): boolean {
  return agent.submissionStatus === SubmissionStatus.CLOSED;
}

/** Has this agent been queried — scoped to a manuscript when given, else across all books. */
export function agentAlreadyQueried(agentId: string, queries: QueryLike[], manuscriptId?: string): boolean {
  return queries.some((q) => q.agentId === agentId && (!manuscriptId || q.manuscriptId === manuscriptId));
}

export interface SuggestionSplit<A> {
  suggested: A[];
  excluded: { agent: A; reason: SuggestionReason }[];
}

/**
 * "Who to query next" for a manuscript. Suggested = not already queried (this book), not set aside,
 * not closed. Everything else is excluded with ONE labelled reason, priority:
 * already_queried > set_aside > closed (matches the sketch).
 */
export function splitSuggestions<A extends AgentLike>(
  agents: A[],
  queries: QueryLike[],
  manuscriptId?: string
): SuggestionSplit<A> {
  const suggested: A[] = [];
  const excluded: { agent: A; reason: SuggestionReason }[] = [];
  for (const agent of agents) {
    if (agentAlreadyQueried(agent.id, queries, manuscriptId)) excluded.push({ agent, reason: "already_queried" });
    else if (agent.setAside) excluded.push({ agent, reason: "set_aside" });
    else if (agentIsClosed(agent)) excluded.push({ agent, reason: "closed" });
    else suggested.push(agent);
  }
  return { suggested, excluded };
}

export interface AgentBuckets<A> {
  queried: A[]; // ≥1 query — ALWAYS counts as queried, regardless of availability/set-aside
  idle: A[]; // 0 queries AND open/unknown AND not set aside — the suggestable idle bucket
  excludedFromIdle: A[]; // 0 queries but closed or set aside — drop from idle count + Agents card
}

/** Buckets for the Agents stat card / idle count. Closed + set-aside leave the IDLE bucket only. */
export function agentBuckets<A extends AgentLike>(agents: A[], queries: QueryLike[]): AgentBuckets<A> {
  const queried: A[] = [];
  const idle: A[] = [];
  const excludedFromIdle: A[] = [];
  for (const agent of agents) {
    if (agentAlreadyQueried(agent.id, queries)) queried.push(agent);
    else if (agent.setAside || agentIsClosed(agent)) excludedFromIdle.push(agent);
    else idle.push(agent);
  }
  return { queried, idle, excludedFromIdle };
}

/** Manuscripts offered in the Log-a-Query picker / as suggestion targets — shelved ones hidden. */
export function pickableManuscripts<M extends Pick<Manuscript, "shelved">>(manuscripts: M[]): M[] {
  return manuscripts.filter((m) => !m.shelved);
}
