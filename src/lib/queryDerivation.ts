/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query derivation — the SINGLE source of truth for turning a query's activity log into its
 * status, response flag, response-received date, revision round, and cached pipeline dates.
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
import { STATUS_ORDER } from "./statusOrder";

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
  /** Import flag: the date is only an ordering key, not a real date (smart/email-import rungs). */
  dateProvisional?: boolean;
}

/**
 * INCOMING rungs — the agent's own acts. This is the set a response DATE may be taken from, and it
 * deliberately excludes the writer's outgoing sends: the day you posted a partial is not the day
 * the agent replied to you.
 */
export const AGENT_RESPONSE_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
  QueryStatus.REJECTED,
]);

/**
 * Statuses that mean the agent HAS responded, by position in the journey — Partial Requested
 * onward. Wider than the incoming set on purpose, and this is the fix for a real undercount.
 *
 * ⚠️ "PARTIAL SENT" MEANS THE AGENT ASKED. You cannot have sent a partial unless one was requested,
 * so a query sitting at Partial Sent or Full Sent is a query the agent has replied to — but neither
 * status was in the incoming set, so `hasAgentResponded` derived FALSE for every one of them. An
 * imported history is mostly made of exactly those rows, because an import records where a query
 * got to rather than every step it took, and "Responses received" undercounted the writer's own
 * history from their first day in the app.
 *
 * ⚠️ IT IS DERIVED FROM `STATUS_ORDER`, NOT LISTED. Listing it would be a fourth hand-written copy
 * of the pipeline (`packageMetrics.REQUEST_OR_BEYOND` and `dashboardStats.LEGACY_RESPONSE_STATUSES`
 * are the other two), and the whole fault here was two sets that disagreed about the same question.
 *
 * ⚠️ SILENCE AND WITHDRAWAL ARE NOT REPLIES. `NO_RESPONSE` is absent because closing a query
 * yourself after months of quiet is the opposite of hearing back, and `WITHDRAWN` is the writer's
 * act, not the agent's. Both are terminal and neither belongs to the agent.
 */
export const AGENT_HAS_RESPONDED_STATUSES: ReadonlySet<QueryStatus> = new Set<QueryStatus>([
  ...STATUS_ORDER.slice(STATUS_ORDER.indexOf(QueryStatus.PARTIAL_REQUESTED)),
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
 * ══ THE EVENT ORDER — ONE RULE, THREE SURFACES ═══════════════════════════════════════════════
 *
 * ⚠️ THREE ORDERINGS FOR ONE CONCEPT IS THE THREE-ACTIVITY-STORES FAULT ONE LAYER DOWN, and that
 * is what this export exists to end. The rule was stated here and NOWHERE ELSE: the Query Centre's
 * timeline sorted on time alone and was correct only by accident — its input arrives from
 * `onSnapshot(..., orderBy('createdAt','asc'))`, which Firestore completes with `__name__`, and
 * `Array#sort` is stable — while the To-do focus sheet ran that same tiebreak-free sort over the
 * UNSORTED global feed and could already order two same-day events differently for one query.
 *
 * ⚠️ AND IT IS LOAD-BEARING FOR THE CORRECTION PREVIEW. That preview sorts a PROPOSED array which
 * never came from Firestore, so without a stated rule it would compare its own order against
 * `orderBy`'s — and diverge on exactly the case a correction most often creates: moving an event
 * onto a day that already has one.
 *
 * Time, then document id, then original index. The id is the tiebreak that makes it deterministic;
 * the index is the last resort for rows that have no id yet (a synthesised root, a preview row).
 */
export interface EventOrderKey {
  time: number;
  /** The document id. `""` for a row with no document behind it — falls through to `i`. */
  id: string;
  /** Position in the caller's own input, so an id-less pair is still stable. */
  i: number;
}

export const byEventOrder = (a: EventOrderKey, b: EventOrderKey): number =>
  a.time - b.time || a.id.localeCompare(b.id) || a.i - b.i;

/**
 * Status-bearing activities in chronological order, by `byEventOrder` — so the order, and therefore
 * the derived status, is stable regardless of fetch order.
 */
export function orderedStatusBearing(activities: DerivableActivity[]): {
  status: QueryStatus;
  time: number;
  provisional: boolean;
}[] {
  return activities
    .map((a, i) => ({ status: normalizeResultingStatus(a.resultingStatus), time: getActivityTime(a.date), provisional: a.dateProvisional === true, id: a.id ?? "", i }))
    .filter((a): a is { status: QueryStatus; time: number; provisional: boolean; id: string; i: number } => a.status !== null)
    .sort(byEventOrder)
    .map(({ status, time, provisional }) => ({ status, time, provisional }));
}

/** The status the log produces: the most recent status-bearing activity's resultingStatus, else QUERIED. */
export function deriveStatus(activities: DerivableActivity[]): QueryStatus {
  const ordered = orderedStatusBearing(activities);
  return ordered.length > 0 ? ordered[ordered.length - 1].status : QueryStatus.QUERIED;
}

/**
 * Has the agent ever acted on this query? Boolean — structurally capped at one response per query.
 *
 * ⚠️ IT READS THE WIDER SET, AND THE DATE DERIVATION BELOW READS THE NARROWER ONE. The two questions
 * are different: "did they reply" is answered by where the query GOT TO, while "when did they
 * reply" can only be answered by a rung the agent actually sent. Using one set for both is what
 * either undercounts the boolean or mints a response date out of the writer's own postmark.
 */
export function deriveResponseFlags(activities: DerivableActivity[]): { hasAgentResponded: boolean } {
  return {
    hasAgentResponded: orderedStatusBearing(activities).some((a) => AGENT_HAS_RESPONDED_STATUSES.has(a.status)),
  };
}

/**
 * When the agent FIRST acted — the earliest incoming-direction rung (AGENT_RESPONSE_STATUSES),
 * as an ISO string. `null` (recomputeQuery writes deleteField()) when the agent has never acted,
 * and when that earliest rung is date-PROVISIONAL: an imported rung's createdAt is only an
 * ordering key, so writing it out would mint a fabricated response date. hasAgentResponded still
 * derives true from the rung's existence — "responded, date unknown" is the honest pair.
 */
export function deriveResponseReceivedAt(activities: DerivableActivity[]): string | null {
  const first = orderedStatusBearing(activities).find((a) => AGENT_RESPONSE_STATUSES.has(a.status));
  if (!first) return null;
  return first.provisional ? null : new Date(first.time).toISOString();
}

/**
 * When the query CLOSED BY REJECTION — the final status-bearing rung's time as ISO, only when
 * that final rung is REJECTED. `null` otherwise, and when the closing rung is date-provisional
 * (the Tier 1 import guard — never a fabricated date). Unblocks the package reply-time maths,
 * whose first-move candidate list reads rejectedDate: with the field never written, straight
 * rejections (no prior request) were silently excluded from the averages (Tier 3 · Phase 3).
 */
export function deriveRejectedDate(activities: DerivableActivity[]): string | null {
  const ordered = orderedStatusBearing(activities);
  const last = ordered[ordered.length - 1];
  if (!last || last.status !== QueryStatus.REJECTED) return null;
  return last.provisional ? null : new Date(last.time).toISOString();
}

/**
 * "When the status last changed" — the most recent status-bearing rung's time as ISO: the
 * event's OWN time, not the old wall-clock recording stamp (contrast deriveResponseReceivedAt,
 * the EARLIEST incoming rung). `null` when the log is empty or the latest rung is
 * date-provisional (Tier 3 · Phase 4 — the last inconsistently-stamped field joins the
 * derived set, so no close path can disagree about it).
 */
export function deriveLastStatusChange(activities: DerivableActivity[]): string | null {
  const ordered = orderedStatusBearing(activities);
  const last = ordered[ordered.length - 1];
  if (!last) return null;
  return last.provisional ? null : new Date(last.time).toISOString();
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
  responseReceivedAt: string | null;
  rejectedDate: string | null;
  lastStatusChange: string | null;
}

/** One call for everything recomputeQuery writes. */
/**
 * ⚠️ §7b — A PROVISIONAL RUNG IS SUPERSEDED BY A REAL ONE OF THE SAME STATUS, and this is the ONE
 * place that is decided.
 *
 * The shape it answers: an import writes an `OFFER` rung (provisional, its `createdAt` only an
 * ordering key, labelled "(imported — date needed)"); the writer later records the real offer; and
 * `recordResponse` APPENDS a second `OFFER` beside it rather than superseding it. Both documents
 * exist. The dock's timeline drew both; the Query Centre's `buildTimelineRows` dedupes by status
 * keeping the EARLIEST, which is the provisional one — so it drew a single row and drew the wrong
 * one. Two different symptoms, one cause.
 *
 * ⚠️ THIS IS A REMEDY, NOT THE FIX, AND THE DISTINCTION MATTERS. The true fix is
 * supersede-on-write: `recordResponse` reading the subcollection before appending and replacing the
 * provisional rung in place. That leaves the RECORD true, which nothing here does — after this,
 * both documents are still in Firestore and every future consumer meets the pair again. What
 * stopped supersede-on-write being done tonight is its undo: the existing undo deletes what the
 * write created, and it has no way to restore a provisional rung the write also removed, so undo
 * would have to carry the deleted document rather than its id. That is a write-path change with a
 * data-loss failure mode of its own.
 *
 * ⚠️ SO IT IS DELIBERATELY ONE FUNCTION WITH THREE CALLERS, not three filters that agree today. The
 * derivation and both display surfaces ask the same question, so they cannot come to differ about
 * which rung is the real one — and when supersede-on-write lands, this becomes inert in one place
 * rather than needing to be found in three.
 *
 * The accessor is the seam: the three callers hold their rows in three shapes (a subcollection doc
 * with a `data` bag, a loose display event, a `DerivableActivity`), and each states how ITS rows
 * expose the two fields rather than being converted into a fourth shape first.
 */
export function dropSupersededProvisional<T>(
  rows: readonly T[],
  read: (row: T) => { status: unknown; provisional: boolean },
): T[] {
  const real = new Set<QueryStatus>();
  for (const row of rows) {
    const { status, provisional } = read(row);
    if (provisional) continue;
    const s = normalizeResultingStatus(status);
    if (s) real.add(s);
  }
  /* ⚠️ NOTHING REAL MEANS NOTHING TO SUPERSEDE — an all-provisional log is an import nobody has
     touched yet, and dropping its rungs would empty the timeline of the only history there is. */
  if (real.size === 0) return [...rows];
  return rows.filter((row) => {
    const { status, provisional } = read(row);
    if (!provisional) return true;
    const s = normalizeResultingStatus(status);
    return !(s !== null && real.has(s));
  });
}

export function deriveQueryFields(activities: DerivableActivity[]): DerivedQueryFields {
  return {
    status: deriveStatus(activities),
    ...deriveResponseFlags(activities),
    revisionRound: deriveRevisionRound(activities),
    responseReceivedAt: deriveResponseReceivedAt(activities),
    rejectedDate: deriveRejectedDate(activities),
    lastStatusChange: deriveLastStatusChange(activities),
    ...derivePipelineDates(activities),
  };
}
