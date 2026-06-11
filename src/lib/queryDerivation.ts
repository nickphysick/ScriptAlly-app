/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query derivation — the SINGLE source of truth for turning a query's activity log into its
 * status, response flag, revision round, and cached pipeline dates.
 *
 * Everything here is PURE and deterministic: same activities in → same fields out. No Firestore,
 * no timers, no side effects — which is what lets the same functions run over the online
 * per-query activity subcollection and the offline in-memory mirror identically.
 *
 * An activity participates in derivation only if it carries a `resultingStatus` (the status the
 * event produced). Derivation NEVER parses description strings — that was the old self-healing
 * scripts' approach and the source of the drift this module exists to end.
 *
 * The only writer of the derived fields is `recomputeQuery` (src/lib/recomputeQuery.ts online,
 * db.tsx's offline twin). No other code may set `status`.
 */
import { QueryStatus } from "../types";

/**
 * The minimal shape derivation needs. Both stores adapt to it:
 *  - per-query subcollection docs: { type/resultingStatus, createdAt }
 *  - global Activity records:      { resultingStatus, date }
 * `date` accepts an ISO string, a Firestore Timestamp (live or JSON-cloned), a Date, or millis.
 */
export interface DerivableActivity {
  id?: string;
  resultingStatus?: QueryStatus | string | null;
  date: unknown;
}

/** Statuses that mean the agent acted — receiving any of these is "a response" (max one per query). */
export const AGENT_RESPONSE_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
  QueryStatus.REJECTED,
]);

const VALID_STATUSES = new Set<string>(Object.values(QueryStatus));

/** Exact-enum normalisation. Anything that isn't a precise QueryStatus member is not status-bearing. */
export function normalizeResultingStatus(value: unknown): QueryStatus | null {
  if (typeof value !== "string") return null;
  return VALID_STATUSES.has(value) ? (value as QueryStatus) : null;
}

/** Millis from any of the date shapes the two stores use. Unparseable → 0 (sorts first, never wins "latest"). */
export function getActivityTime(date: unknown): number {
  if (!date) return 0;
  if (typeof date === "number") return date;
  if (typeof date === "string") {
    const t = new Date(date).getTime();
    return isNaN(t) ? 0 : t;
  }
  if (date instanceof Date) return date.getTime();
  if (typeof date === "object") {
    const o = date as any;
    if (typeof o.toDate === "function") return o.toDate().getTime();
    if (typeof o.seconds === "number") return o.seconds * 1000;
    if (typeof o._seconds === "number") return o._seconds * 1000;
  }
  return 0;
}

/**
 * Status-bearing activities in chronological order. Tiebreak on id (then original index) so the
 * order — and therefore the derived status — is stable regardless of fetch order.
 */
export function orderedStatusBearing(activities: DerivableActivity[]): {
  status: QueryStatus;
  time: number;
}[] {
  return activities
    .map((a, i) => ({ status: normalizeResultingStatus(a.resultingStatus), time: getActivityTime(a.date), id: a.id ?? "", i }))
    .filter((a): a is { status: QueryStatus; time: number; id: string; i: number } => a.status !== null)
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id) || a.i - b.i)
    .map(({ status, time }) => ({ status, time }));
}

/** The status the log produces: the most recent status-bearing activity's resultingStatus, else QUERIED. */
export function deriveStatus(activities: DerivableActivity[]): QueryStatus {
  const ordered = orderedStatusBearing(activities);
  return ordered.length > 0 ? ordered[ordered.length - 1].status : QueryStatus.QUERIED;
}

/** Has the agent ever acted on this query? Boolean — structurally capped at one response per query. */
export function deriveResponseFlags(activities: DerivableActivity[]): { hasAgentResponded: boolean } {
  return {
    hasAgentResponded: orderedStatusBearing(activities).some((a) => AGENT_RESPONSE_STATUSES.has(a.status)),
  };
}

/**
 * Revision round = 1 + the number of resubmission sends. A resubmission is a FULL_SENT whose
 * nearest preceding status-bearing activity is REVISE_RESUBMIT — derived from log shape, never
 * a stored counter, so editing/deleting an R&R recomputes the round correctly.
 */
export function deriveRevisionRound(activities: DerivableActivity[]): number {
  const ordered = orderedStatusBearing(activities);
  let round = 1;
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].status === QueryStatus.FULL_SENT && ordered[i - 1].status === QueryStatus.REVISE_RESUBMIT) {
      round++;
    }
  }
  return round;
}

export interface DerivedPipelineDates {
  partialRequestedDate: string | null;
  partialSentDate: string | null;
  fullRequestedDate: string | null;
  fullSentDate: string | null;
}

/** Cached stage dates from the log (latest occurrence per stage), so they can't drift either. */
export function derivePipelineDates(activities: DerivableActivity[]): DerivedPipelineDates {
  const ordered = orderedStatusBearing(activities);
  const latest = (status: QueryStatus): string | null => {
    for (let i = ordered.length - 1; i >= 0; i--) {
      if (ordered[i].status === status) return new Date(ordered[i].time).toISOString();
    }
    return null;
  };
  return {
    partialRequestedDate: latest(QueryStatus.PARTIAL_REQUESTED),
    partialSentDate: latest(QueryStatus.PARTIAL_SENT),
    fullRequestedDate: latest(QueryStatus.FULL_REQUESTED),
    fullSentDate: latest(QueryStatus.FULL_SENT),
  };
}

export interface DerivedQueryFields extends DerivedPipelineDates {
  status: QueryStatus;
  hasAgentResponded: boolean;
  revisionRound: number;
}

/** One call for everything recomputeQuery writes. */
export function deriveQueryFields(activities: DerivableActivity[]): DerivedQueryFields {
  return {
    status: deriveStatus(activities),
    ...deriveResponseFlags(activities),
    revisionRound: deriveRevisionRound(activities),
    ...derivePipelineDates(activities),
  };
}
