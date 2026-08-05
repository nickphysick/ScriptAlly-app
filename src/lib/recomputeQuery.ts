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
    // Carried only when set: an import rung whose createdAt is an ordering key, not a real date.
    ...(data.dateProvisional === true ? { dateProvisional: true } : {}),
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

/** One raw activity-subcollection document, as the derivation sees it. */
export interface RawActivityDoc {
  id: string;
  data: Record<string, unknown>;
}

/**
 * Exactly the ten fields recomputeQuery writes, with `null` where it writes `deleteField()`.
 * This is the ONE place the payload shape lives — recomputeQuery maps it to the Firestore write,
 * and the DEV sweep's dry run reads it to preview a write without performing one.
 */
export interface RecomputedFields {
  status: QueryStatus;
  partialRequestedDate: string | null;
  partialSentDate: string | null;
  fullRequestedDate: string | null;
  fullSentDate: string | null;
  revisionRound: number;
  hasAgentResponded: boolean;
  responseReceivedAt: string | null;
  rejectedDate: string | null;
  lastStatusChange: string | null;
}

/**
 * PURE: what recomputeQuery would write for this activity log, computed without touching
 * Firestore. `null` === the field is cleared. No I/O, no side effects — so a caller can preview
 * a recompute (the sweep's dry run) without duplicating a line of derivation.
 */
export function computeRecomputedFields(docs: RawActivityDoc[]): RecomputedFields {
  const fields = deriveQueryFields(docs.map((d) => subcollectionDocToDerivable(d.id, d.data)));

  // A pipeline-stage date whose latest rung is PROVISIONAL (an imported, date-unknown rung) must
  // never be written — its createdAt is only an ordering key, not a real date. Status/responses/
  // revisionRound still derive from rung existence, so they stay correct; the date is simply
  // left unset ("date needed"). Non-imported queries carry no provisional rungs, so this is inert.
  const stageProvisional = (status: QueryStatus): boolean => {
    let bestTime = -Infinity;
    let provisional = false;
    for (const d of docs) {
      const s = normalizeResultingStatus(d.data.resultingStatus) ?? normalizeResultingStatus(d.data.type);
      if (s !== status) continue;
      const t = getActivityTime(d.data.createdAt);
      if (t >= bestTime) {
        bestTime = t;
        provisional = d.data.dateProvisional === true;
      }
    }
    return provisional;
  };
  const stageDate = (status: QueryStatus, derived: string | null) =>
    stageProvisional(status) || !derived ? null : derived;

  return {
    status: fields.status,
    partialRequestedDate: stageDate(QueryStatus.PARTIAL_REQUESTED, fields.partialRequestedDate),
    partialSentDate: stageDate(QueryStatus.PARTIAL_SENT, fields.partialSentDate),
    fullRequestedDate: stageDate(QueryStatus.FULL_REQUESTED, fields.fullRequestedDate),
    fullSentDate: stageDate(QueryStatus.FULL_SENT, fields.fullSentDate),
    revisionRound: fields.revisionRound,
    hasAgentResponded: fields.hasAgentResponded,
    // "When the agent first acted" (earliest incoming rung, as ISO). Absent — never fabricated —
    // when no incoming rung exists or the earliest one is date-provisional.
    responseReceivedAt: fields.responseReceivedAt,
    // "When the query closed by rejection" (the final rung, only when REJECTED; same provisional
    // guard). Feeds the package reply-time maths' first-move candidates.
    rejectedDate: fields.rejectedDate,
    // "When the status last changed" — the latest rung's own time, not a recording stamp.
    lastStatusChange: fields.lastStatusChange,
  };
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
