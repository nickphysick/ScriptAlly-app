/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The single, atomic write path for the Edit Query drawer — the analogue of saveAgentEdits, but where
 * "commit" means ACTIVITY append/edit/delete + recompute, never a flat patch of derived state.
 *
 * The one rule: status / responses / revisionRound / pipeline dates are DERIVED from the activity log
 * by recomputeQuery (the single writer). So this never writes those. It mutates the AUTHORITATIVE
 * per-query `activity` subcollection (what recompute + the reading pane read) inside one writeBatch,
 * lets the global-feed projection follow (best-effort, same-id twin — the projection is cosmetic for
 * the Dashboard), updates the genuinely-stored inputs it's handed (dateSent), then recomputes.
 *
 * Undo is delete-the-record (a `delete` op), never a compensating entry — so the corrected log derives
 * the corrected status. Exact QueryStatus enum strings throughout (in lockstep with emailImportCommit).
 */
import { Firestore, collection, doc, writeBatch, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { QueryStatus, ActivityType, QueryMaterial } from "../types";
import { recomputeQuery } from "./recomputeQuery";

export interface QueryEditAppend {
  /** Local temp id (display only); the real subcollection id is minted at commit. */
  tempId: string;
  status: QueryStatus;
  timeMs: number;
  note: string;
}
export interface QueryEditEdit {
  id: string;
  status?: QueryStatus;
  timeMs?: number;
  note?: string;
}
export interface QueryEditOps {
  appends: QueryEditAppend[];
  edits: QueryEditEdit[];
  deletes: string[];
  /** When set, updates the query's stored `dateSent` (the locked root's date). */
  dateSentMs?: number;
  /** Stored, NON-derived query inputs to patch in the same atomic batch. Never status/round/
   *  responses — those stay derived. (responseDeadline is a denormalised snapshot, not log-derived,
   *  so it is editable here, matching the retired inline editor.) */
  queryFields?: {
    sendMethod?: string;
    materialsWanted?: (string | QueryMaterial)[];
    personalisationNotes?: string;
    agentId?: string;
    manuscriptId?: string;
    responseDeadline?: string;
    ifNoResponse?: string;
    packageId?: string;
    rejectionType?: string;
    agentComments?: string;
  };
}
export interface QueryEditMeta {
  agentName: string;
  manuscriptId: string;
  manuscriptTitle: string;
}
export type SaveQueryResult = { ok: true } | { ok: false; error: string };

/** The activity FAMILY for a status — the global-feed projection's `activityType`. */
export function activityTypeForStatus(status: QueryStatus): ActivityType {
  if (status === QueryStatus.QUERIED) return ActivityType.QUERY_SENT;
  if (status === QueryStatus.PARTIAL_SENT || status === QueryStatus.FULL_SENT) return ActivityType.MATERIALS_SENT;
  return ActivityType.STATUS_CHANGED;
}

export function hasQueryEdits(ops: QueryEditOps): boolean {
  return ops.appends.length > 0 || ops.edits.length > 0 || ops.deletes.length > 0
    || ops.dateSentMs !== undefined
    || (ops.queryFields !== undefined && Object.keys(ops.queryFields).length > 0);
}

/**
 * Apply the staged ops atomically, then recompute. The subcollection writes (+ dateSent, + new
 * global-feed rows for appends) ride in ONE writeBatch; the best-effort same-id global twin
 * patches/deletes for existing rungs run after (a missing twin must never fail the correction —
 * recompute reads only the subcollection). Returns a typed result; never throws to the caller.
 */
export async function commitQueryEdits(
  db: Firestore,
  userId: string,
  queryId: string,
  ops: QueryEditOps,
  meta: QueryEditMeta,
): Promise<SaveQueryResult> {
  if (!userId) return { ok: false, error: "Not signed in." };
  if (!hasQueryEdits(ops)) return { ok: true };

  const actCol = collection(db, "users", userId, "queries", queryId, "activity");
  const feedCol = collection(db, "users", userId, "activities");
  const queryRef = doc(db, "users", userId, "queries", queryId);

  // Best-effort global-twin work, run after the authoritative batch commits.
  const twinEdits: { id: string; patch: Record<string, unknown> }[] = [];
  const twinDeletes: string[] = [];

  try {
    const batch = writeBatch(db);

    // Appends → authoritative subcollection rung + a same-id global-feed projection row.
    for (const a of ops.appends) {
      const ref = doc(actCol);
      batch.set(ref, {
        type: a.status,
        resultingStatus: a.status,
        createdAt: Timestamp.fromMillis(a.timeMs),
        note: a.note,
        queryId,
        agentName: meta.agentName,
        manuscriptTitle: meta.manuscriptTitle,
      });
      batch.set(doc(feedCol, ref.id), {
        id: ref.id,
        userId,
        queryId,
        manuscriptId: meta.manuscriptId,
        activityType: activityTypeForStatus(a.status),
        description: a.note,
        date: new Date(a.timeMs).toISOString(),
        details: "",
        resultingStatus: a.status,
      });
    }

    // Edits → patch the authoritative subcollection doc; queue the same-id global twin.
    for (const e of ops.edits) {
      const sub: Record<string, unknown> = {};
      const twin: Record<string, unknown> = {};
      if (e.status !== undefined) {
        sub.type = e.status; sub.resultingStatus = e.status;
        twin.resultingStatus = e.status; twin.activityType = activityTypeForStatus(e.status);
      }
      if (e.timeMs !== undefined) {
        sub.createdAt = Timestamp.fromMillis(e.timeMs);
        // A user-supplied date is real — clear the import-time "date needed" flag so recompute
        // surfaces this stage's date (dateProvisional is an existing field, within the allowlist).
        sub.dateProvisional = false;
        twin.date = new Date(e.timeMs).toISOString();
      }
      if (e.note !== undefined) { sub.note = e.note; twin.description = e.note; }
      if (Object.keys(sub).length > 0) batch.update(doc(actCol, e.id), sub);
      if (Object.keys(twin).length > 0) twinEdits.push({ id: e.id, patch: twin });
    }

    // Deletes (undo-by-deletion) → remove the authoritative rung; queue the global twin delete.
    for (const id of ops.deletes) {
      batch.delete(doc(actCol, id));
      twinDeletes.push(id);
    }

    // Stored inputs — the send date (root), plus the Prompt-4 query fields (method / materials /
    // personalisation / reassignment). All non-derived; recompute still owns status/dates/round.
    const queryPatch: Record<string, unknown> = {};
    if (ops.dateSentMs !== undefined) queryPatch.dateSent = new Date(ops.dateSentMs).toISOString();
    if (ops.queryFields) {
      const f = ops.queryFields;
      if (f.sendMethod !== undefined) queryPatch.sendMethod = f.sendMethod;
      if (f.materialsWanted !== undefined) queryPatch.materialsWanted = f.materialsWanted;
      if (f.personalisationNotes !== undefined) queryPatch.personalisationNotes = f.personalisationNotes;
      if (f.agentId !== undefined) queryPatch.agentId = f.agentId;
      if (f.manuscriptId !== undefined) queryPatch.manuscriptId = f.manuscriptId;
      if (f.responseDeadline !== undefined) queryPatch.responseDeadline = f.responseDeadline;
      if (f.ifNoResponse !== undefined) queryPatch.ifNoResponse = f.ifNoResponse;
      if (f.packageId !== undefined) queryPatch.packageId = f.packageId;
      if (f.rejectionType !== undefined) queryPatch.rejectionType = f.rejectionType;
      if (f.agentComments !== undefined) queryPatch.agentComments = f.agentComments;
    }
    if (Object.keys(queryPatch).length > 0) batch.update(queryRef, queryPatch);

    await batch.commit();

    // Best-effort projection upkeep (never fails the correction — recompute ignores this store).
    for (const t of twinEdits) {
      try { await updateDoc(doc(feedCol, t.id), t.patch); } catch { /* no same-id twin — cosmetic */ }
    }
    for (const id of twinDeletes) {
      try { await deleteDoc(doc(feedCol, id)); } catch { /* no same-id twin — cosmetic */ }
    }

    // Single writer of derived state.
    await recomputeQuery(userId, queryId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn’t save the query." };
  }
}
