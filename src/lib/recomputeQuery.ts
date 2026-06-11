/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * recomputeQuery — THE single writer of a query's derived fields (online mode).
 *
 * Loads the query's authoritative activity log (the per-query `activity` subcollection — the
 * same store the reading-pane timeline renders), runs the pure derivation in queryDerivation.ts,
 * and writes the result to the query document:
 *
 *   status · partialRequestedDate · partialSentDate · fullRequestedDate · fullSentDate
 *   revisionRound · hasAgentResponded
 *
 * No other code writes these fields. Every mutation is "change the activity log, then
 * recomputeQuery(queryId)" — so the status can never drift from the log, duplicate/contradictory
 * states are structurally impossible, and undo is just "delete the activity, recompute".
 *
 * Idempotent: recomputing an unchanged log writes the same values.
 *
 * Offline mode has a twin in db.tsx (recomputeQueryOffline) that runs the SAME derivation over
 * the in-memory activity mirror — identical inputs, identical outputs.
 */
import { collection, doc, getDocs, updateDoc, deleteField } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { deriveQueryFields, getActivityTime, normalizeResultingStatus, DerivableActivity } from "./queryDerivation";

/**
 * Adapt a per-query subcollection doc to the derivation shape. These docs have carried their
 * produced status in `type` since the store was introduced; newer writes also stamp
 * `resultingStatus` explicitly. Either field counts; non-enum values are simply not
 * status-bearing.
 */
export function subcollectionDocToDerivable(id: string, data: Record<string, unknown>): DerivableActivity {
  return {
    id,
    resultingStatus: normalizeResultingStatus(data.resultingStatus) ?? normalizeResultingStatus(data.type),
    date: data.createdAt,
  };
}

/**
 * An event time that is BOTH the user's chosen date and monotonic with the existing log.
 *
 * Date-only inputs ("sent on 11 June") land at midnight, which would sort BEFORE a same-day
 * entry recorded at clock time — and under derivation, ordering IS the status. So a new event
 * is stamped at the chosen time, clamped to at least 1ms after the log's latest entry.
 */
export async function monotonicEventTime(userId: string, queryId: string, desiredMillis: number): Promise<number> {
  const snap = await getDocs(collection(db, "users", userId, "queries", queryId, "activity"));
  const latest = Math.max(0, ...snap.docs.map((d) => getActivityTime(d.data().createdAt)));
  return Math.max(desiredMillis, latest + 1);
}

export async function recomputeQuery(userId: string, queryId: string): Promise<void> {
  const queryRef = doc(db, "users", userId, "queries", queryId);
  try {
    const snap = await getDocs(collection(db, "users", userId, "queries", queryId, "activity"));
    const activities = snap.docs.map((d) => subcollectionDocToDerivable(d.id, d.data()));
    const fields = deriveQueryFields(activities);

    await updateDoc(queryRef, {
      status: fields.status,
      partialRequestedDate: fields.partialRequestedDate ?? deleteField(),
      partialSentDate: fields.partialSentDate ?? deleteField(),
      fullRequestedDate: fields.fullRequestedDate ?? deleteField(),
      fullSentDate: fields.fullSentDate ?? deleteField(),
      revisionRound: fields.revisionRound,
      hasAgentResponded: fields.hasAgentResponded,
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, `users/${userId}/queries/${queryId}`);
    throw e;
  }
}
