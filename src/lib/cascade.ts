/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure helpers for delete-cascade decisions. Kept side-effect-free (no Firestore) so the "what
 * gets orphaned" logic is unit-testable; db.tsx's deleteManuscript/deleteAgent use these to build
 * the batch of refs to delete. Deleting a manuscript or agent must take its dependent queries with
 * it — otherwise the queries are stranded: invisible in the UI (the list bails when the agent/MS
 * lookup fails) yet still counting toward the free-tier limit and unrecoverable.
 */
import { Query } from "../types";

/** Ids of queries that belong to a manuscript (orphaned if it is deleted). */
export function queriesForManuscript(queries: Pick<Query, "id" | "manuscriptId">[], manuscriptId: string): string[] {
  return queries.filter((q) => q.manuscriptId === manuscriptId).map((q) => q.id);
}

/** Ids of queries sent to an agent (orphaned if it is deleted). */
export function queriesForAgent(queries: Pick<Query, "id" | "agentId">[], agentId: string): string[] {
  return queries.filter((q) => q.agentId === agentId).map((q) => q.id);
}

/** Ids of global-feed activity docs whose query is in the given set (the projections to clean up). */
export function activityIdsForQueries<T extends { id: string; queryId: string }>(
  activities: T[],
  queryIds: string[]
): string[] {
  const set = new Set(queryIds);
  return activities.filter((a) => set.has(a.queryId)).map((a) => a.id);
}
