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
 *   revisionRound · hasAgentResponded · responseReceivedAt · rejectedDate · lastStatusChange
 *
 * No other code writes these fields. Every mutation is "change the activity log, then
 * recomputeQuery(queryId)" — so the status can never drift from the log, duplicate/contradictory
 * states are structurally impossible, and undo is just "delete the activity, recompute".
 *
 * Idempotent: recomputing an unchanged log writes the same values.
 */
import { collection, doc, getDocs, updateDoc, deleteField } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { QueryStatus } from "../types";
import { getActivityTime } from "./queryDerivation";
import { computeRecomputedFields } from "./recomputeFields";
/* The pure half lives in recomputeFields.ts (no Firebase), so node scripts and migrations run the
   same derivation; re-exported here so every existing import keeps working. */
export { subcollectionDocToDerivable, computeRecomputedFields, type RawActivityDoc, type RecomputedFields } from "./recomputeFields";

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
    const fields = computeRecomputedFields(snap.docs.map((d) => ({ id: d.id, data: d.data() })));

    await updateDoc(queryRef, {
      status: fields.status,
      partialRequestedDate: fields.partialRequestedDate ?? deleteField(),
      partialSentDate: fields.partialSentDate ?? deleteField(),
      fullRequestedDate: fields.fullRequestedDate ?? deleteField(),
      fullSentDate: fields.fullSentDate ?? deleteField(),
      revisionRound: fields.revisionRound,
      hasAgentResponded: fields.hasAgentResponded,
      responseReceivedAt: fields.responseReceivedAt ?? deleteField(),
      rejectedDate: fields.rejectedDate ?? deleteField(),
      lastStatusChange: fields.lastStatusChange ?? deleteField(),
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, `users/${userId}/queries/${queryId}`);
    throw e;
  }
}
