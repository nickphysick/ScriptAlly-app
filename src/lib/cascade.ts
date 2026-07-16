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
import { Query, QueryStatus } from "../types";

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

/** Ids of taskFlag stance docs that die with the cascade: flags keyed to the deleted queries, plus
 *  (agent deletes) flags keyed to the agent itself (data-quality stances). Previously left behind
 *  as inert junk — a cascade must take the stances with the records they were about. */
export function flagIdsForCascade(
  taskFlags: { id: string; queryId?: string; agentId?: string }[],
  args: { queryIds: string[]; agentId?: string }
): string[] {
  const qs = new Set(args.queryIds);
  return taskFlags
    .filter((f) => (f.queryId && qs.has(f.queryId)) || (args.agentId != null && f.agentId === args.agentId))
    .map((f) => f.id);
}

/** Materials currently OUT with an agent — the dialog calls these out ("M fulls/partials out"). */
export const MATERIALS_OUT_STATUSES: ReadonlySet<string> = new Set([QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);

export interface DestroyData {
  queries: Pick<Query, "id" | "manuscriptId" | "agentId" | "status">[];
  activities: { id: string; queryId: string }[];
  taskFlags: { id: string; queryId?: string; agentId?: string }[];
  versions?: { id: string; manuscriptId: string }[];
  packages?: { id: string; manuscriptId: string }[];
}

/** The "Goes with it" panel — live counts computed at dialog-open. One source with the cascade
 *  plan below, so the dialog can never promise less than the delete removes. */
export interface DestroyManifest {
  queries: number;
  materialsOut: number; // fulls/partials currently with agents
  activityRecords: number;
  packages: number;
  versions: number;
  taskFlags: number;
}

export function destroyManifest(kind: "manuscript" | "agent", id: string, data: DestroyData): DestroyManifest {
  const qIds = kind === "manuscript" ? queriesForManuscript(data.queries, id) : queriesForAgent(data.queries, id);
  const qSet = new Set(qIds);
  const materialsOut = data.queries.filter((q) => qSet.has(q.id) && MATERIALS_OUT_STATUSES.has(q.status)).length;
  return {
    queries: qIds.length,
    materialsOut,
    activityRecords: activityIdsForQueries(data.activities, qIds).length,
    packages: kind === "manuscript" ? (data.packages ?? []).filter((p) => p.manuscriptId === id).length : 0,
    versions: kind === "manuscript" ? (data.versions ?? []).filter((v) => v.manuscriptId === id).length : 0,
    taskFlags: flagIdsForCascade(data.taskFlags, { queryIds: qIds, ...(kind === "agent" ? { agentId: id } : {}) }).length,
  };
}

/** One doc the cascade deletes, by top-level collection. */
export interface CascadeDoc {
  col: "versions" | "packages" | "queries" | "activities" | "taskFlags" | "manuscripts" | "agents";
  id: string;
}

/**
 * The ordered top-level doc list for a cascade — CHILDREN FIRST, THE PARENT LAST (a partial failure
 * can strand children but never orphan them: the parent survives and a retry re-plans). db.tsx maps
 * these to refs and splices each query's live-fetched activity SUBCOLLECTION immediately before its
 * query doc; `queryIds` says which. The notes subcollections (manuscript/agent) are also live-fetched
 * by db.tsx — they have no top-level ids to plan here.
 */
export interface CascadePlan {
  queryIds: string[];
  docs: CascadeDoc[]; // ordered; docs[docs.length - 1] is ALWAYS the parent
}

export function cascadePlan(kind: "manuscript" | "agent", id: string, data: DestroyData): CascadePlan {
  const queryIds = kind === "manuscript" ? queriesForManuscript(data.queries, id) : queriesForAgent(data.queries, id);
  const docs: CascadeDoc[] = [];
  if (kind === "manuscript") {
    for (const v of (data.versions ?? []).filter((x) => x.manuscriptId === id)) docs.push({ col: "versions", id: v.id });
    for (const p of (data.packages ?? []).filter((x) => x.manuscriptId === id)) docs.push({ col: "packages", id: p.id });
  }
  for (const qid of queryIds) docs.push({ col: "queries", id: qid });
  for (const aid of activityIdsForQueries(data.activities, queryIds)) docs.push({ col: "activities", id: aid });
  for (const fid of flagIdsForCascade(data.taskFlags, { queryIds, ...(kind === "agent" ? { agentId: id } : {}) })) docs.push({ col: "taskFlags", id: fid });
  docs.push(kind === "manuscript" ? { col: "manuscripts", id } : { col: "agents", id });
  return { queryIds, docs };
}

/** The type-to-confirm gate: light mode (nothing depends on the record) always passes; otherwise
 *  the typed name must match exactly (trimmed — a stray space isn't a failed intention). */
export function canDestroy(typed: string, name: string, light: boolean): boolean {
  if (light) return true;
  return typed.trim() === name.trim() && name.trim().length > 0;
}

/** Chunk refs for Firestore batches (hard limit 500/batch; we stay under it at 450). */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
