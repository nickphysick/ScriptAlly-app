/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PURE HALF OF recomputeQuery (clean-up pass, 28 Sep): what the single writer would write for a
 * query's activity log, with no Firebase import — so a node script (the reconstructed-step dry run
 * and migration) runs exactly the derivation the app runs, never a copy of it.
 */
import { QueryStatus } from "../types";
import { deriveQueryFields, getActivityTime, normalizeResultingStatus, dropSupersededProvisional, DerivableActivity } from "./queryDerivation";

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
    ...(data.reconstructed === true ? { reconstructed: true } : {}),
  };
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
export function computeRecomputedFields(raw: RawActivityDoc[]): RecomputedFields {
  /* ⚠️ §7b — SUPERSEDED PROVISIONAL RUNGS ARE DROPPED ONCE, HERE, so `deriveQueryFields` AND the
     `stageProvisional` scan below both see the same log. Filtering only the former would leave a
     stage reporting "date needed" against a date the writer had already recorded — `stageProvisional`
     takes the LAST rung at the highest time, and an import's ordering key can tie or beat a real
     one. One filter, both consumers, no chance of them disagreeing. */
  const docs = dropSupersededProvisional(raw, (d) => ({
    status: d.data.resultingStatus ?? d.data.type,
    provisional: d.data.dateProvisional === true,
  }));
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

