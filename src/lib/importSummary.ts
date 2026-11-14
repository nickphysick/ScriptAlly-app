/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What the import summary states about a file that has just been read (onboarding v5, part 2).
 *
 * ⚠️ IT COUNTS, AND DECIDES NOTHING. What a row is and which tier it sits in are
 * `smartImportReviewModel`'s (`parseModel`, `reviewTallies`); "closed" is `courtOf`, the Query
 * Centre's one definition. This module only groups what those already say, so the summary cannot
 * disagree with the review that follows it or with the app the rows land in.
 *
 * Every grouping here partitions its population: the three agent standings sum to the agents, the
 * three courts sum to the queries, and the per-status counts in a court sum to the court. The
 * summary prints those sums beside each other, so a group that leaked a row would be visible.
 */
import { QueryStatus } from "../types";
import { courtOf, STAGE_NAME } from "./qcSummary";
import { parseModel } from "./smartImportReviewModel";
import { applyImportRules, type RulesOutcome } from "./importRules";
import type { ReviewAgent, ReviewQuery } from "./smartImportReviewModel";
import type { SmartImportResult } from "../types/smartImport";

/**
 * The working model the summary counts: the file as read, with QueryHawk's rules applied — the same
 * model the review opens on (two-door import v1: `applyImportRules` runs straight after `parseModel`,
 * on both routes). `settled` is what the rules settled, for "Sorted for you".
 */
export function ruledModel(result: SmartImportResult, today?: string): RulesOutcome {
  return applyImportRules(parseModel(result), today);
}
export function summaryModel(result: SmartImportResult): { agents: ReviewAgent[]; queries: ReviewQuery[] } {
  /* v9: the review asks about a row with no agent and no agency, where it used to set it aside by
     itself. So the summary counts it too, as an agent that needs an answer. */
  const { agents, queries } = ruledModel(result);
  return { agents, queries };
}

export type AgentStanding = "live" | "closed" | "none";

/** An agent is LIVE when any of its queries in this file is not closed, CLOSED when it has queries
 *  and all are closed, and NOT QUERIED when it has none. */
export function agentStanding(agentId: string, queries: readonly ReviewQuery[]): AgentStanding {
  const mine = queries.filter((q) => !q.removed && q.agentRef === agentId);
  if (mine.length === 0) return "none";
  return mine.some((q) => courtOf(q.status) !== "closed") ? "live" : "closed";
}

export interface AgentKey { total: number; live: number; closed: number; none: number }
export function agentKey(agents: readonly ReviewAgent[], queries: readonly ReviewQuery[]): AgentKey {
  const live = agents.filter((a) => !a.deleted);
  const key: AgentKey = { total: live.length, live: 0, closed: 0, none: 0 };
  for (const a of live) key[agentStanding(a.id, queries)] += 1;
  return key;
}

export type CourtKey = "agents" | "you" | "closed";
export interface CourtGroup { key: CourtKey; phrase: string; total: number; statuses: { status: QueryStatus; name: string; count: number }[] }

/** The order a court's statuses are drawn in: the pipeline's, then the closures. */
const STATUS_ORDER: QueryStatus[] = [
  QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER,
  QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN,
  ...(Object.values(QueryStatus) as QueryStatus[]),
].filter((s, i, a) => a.indexOf(s) === i);

/** Which of the summary's three groups a status sits in. WITH YOU takes the Query Centre's "you"
 *  and "offer" courts together (an offer's decision is the writer's); CLOSED is its "closed",
 *  which here includes Withdrawn and Signed. */
export function summaryCourt(status: QueryStatus): CourtKey {
  const c = courtOf(status);
  return c === "agent" ? "agents" : c === "closed" ? "closed" : "you";
}

/** The queries card's three groups. A group with no rows is still returned (with total 0) so the
 *  caller's sum is over all three; the card draws only those above zero. */
export function queryCourts(queries: readonly ReviewQuery[]): CourtGroup[] {
  const live = queries.filter((q) => !q.removed);
  const phrases: Record<CourtKey, string> = { agents: "with agents", you: "with you", closed: "closed" };
  return (["agents", "you", "closed"] as const).map((key) => {
    const mine = live.filter((q) => summaryCourt(q.status) === key);
    const statuses = STATUS_ORDER
      .map((status) => ({ status, name: STAGE_NAME[status] ?? status, count: mine.filter((q) => q.status === status).length }))
      .filter((s) => s.count > 0);
    return { key, phrase: phrases[key], total: mine.length, statuses };
  });
}

/** The stepper's steps, in order. `Duplicates` is a step only when the file had duplicate sets. */
export type ImportStepId = "duplicates" | "agents" | "queries" | "import";
export const IMPORT_STEP_LABEL: Record<ImportStepId, string> = { duplicates: "Duplicates", agents: "Agents", queries: "Queries", import: "Import" };
export const importSteps = (hadDuplicates: boolean): ImportStepId[] =>
  hadDuplicates ? ["duplicates", "agents", "queries", "import"] : ["agents", "queries", "import"];

/** "A possible duplicate set" count: one per leader of an unresolved cluster. */
export const duplicateSets = (agents: readonly ReviewAgent[]): number =>
  agents.filter((a) => !a.deleted && a.mergeWith.length > 0 && !a.mergeResolved).length;

export const SUMMARY_TITLE = "We've read your file";
