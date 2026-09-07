/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ACTIVITY FEED AS A CONVERSATION (dashboard redesign, Phase 6).
 *
 * ⚠️ HOUSEKEEPING IS DECIDED POSITIVELY, BY THE ABSENCE OF A `queryId`, AND BY NOTHING ELSE.
 * The obvious test — "no `resultingStatus`" — is wrong in a way that fails silently: that field is
 * documented ABSENT on non-status events *and on pre-migration records*, so keying off it would
 * draw every query send written before the migration as a white desk-admin bubble with no dot. A
 * query event is one that belongs to a query; whether the record remembers which rung it produced
 * is a separate question, answered below, and its answer is never "this was housekeeping".
 *
 * ⚠️ AND AN UNRECOGNISED STATUS FALLS BACK, THEN GIVES UP HONESTLY — it never guesses. The order is
 * `resultingStatus` → the `activityType` map → a NEUTRAL query bubble with no state label and no
 * fill. A neutral bubble says "this happened on this query and the record does not say what it
 * did", which is true. A guessed status would be the app inventing history.
 *
 * ⚠️ `normalizeResultingStatus` IS THE COERCION, NEVER `normalizeStatus`. The latter (StatusPill)
 * ends `return status as QueryStatus` — it CASTS an unrecognised string into the enum, so an
 * unknown value would travel on looking like a status. The former is an exact-enum membership test
 * returning `null`. Nothing here may produce a status string that could reach `recomputeQuery`.
 * (`normalizeStatus`'s cast is a standing hazard with a dozen callers; changing it is not this
 * pack's to do, and is flagged in the run report.)
 */
import { ActivityType, QueryStatus, type Activity, type Query } from "../types";
import { normalizeResultingStatus } from "./queryDerivation";
import { stateFor, type State } from "./queryCardFacts";

/** Whose message a bubble is. Alignment carries this; there is no legend for it. */
export type Side = "in" | "out";

/**
 * ⚠️ THIS IS NOT `statusDirection`, AND REUSING IT WOULD HAVE BEEN WRONG. That export classifies a
 * status for the Query DB list's SPINE COLOUR and places `OFFER` in "out" — grouped with the
 * writer's outgoing acts, which is a defensible colour choice on a list and a false statement in a
 * conversation: an offer is the agent's message and belongs on the agent's side. Two derivations
 * exist here because there are two questions, and answering the second with the first would put
 * the best news a writer ever gets on the wrong side of the thread.
 */
const AGENT_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
  QueryStatus.REJECTED,
]);

/**
 * The activity types that carry no status and are still plainly the writer's act.
 * ⚠️ AN OFFER DECISION IS THE WRITER'S, not the agent's — the offer arriving was the agent's
 * message and is a separate event with its own status.
 */
const WRITER_TYPES: ReadonlySet<string> = new Set<string>([
  ActivityType.NUDGE_SENT, ActivityType.OFFER_ACCEPTED, ActivityType.OFFER_DECLINED,
  ActivityType.QUERY_SENT, ActivityType.MATERIALS_SENT,
]);

export interface BubbleShape {
  /** ⚠️ `queryId` DECIDES THIS, and nothing else. */
  kind: "query" | "housekeeping";
  /** the v2 state whose fill the bubble takes — `null` on housekeeping and on a neutral query */
  state: State | null;
  side: Side;
  /** the exact status the rung produced, for `StatusDot`. Never a string that is not a member. */
  status: QueryStatus | null;
}

/**
 * The one classification. Takes the ACTIVITY, so a caller cannot hand it a half-resolved row.
 */
export function bubbleShape(a: Pick<Activity, "activityType" | "resultingStatus" | "queryId">): BubbleShape {
  /* ⚠️ THE TEST, AND IT IS THE FIRST LINE ON PURPOSE. */
  if (!a.queryId) return { kind: "housekeeping", state: null, side: "out", status: null };

  const status = normalizeResultingStatus(a.resultingStatus) ?? statusFromType(a.activityType);
  if (status === null) {
    /* a query event the record cannot place — neutral, never housekeeping, never a guess */
    return { kind: "query", state: null, side: sideFromType(a.activityType), status: null };
  }
  return {
    kind: "query",
    state: stateFor(status),
    side: AGENT_STATUSES.has(status) ? "in" : "out",
    status,
  };
}

/** The `activityType` fallback — only the types that unambiguously name a rung. */
function statusFromType(t: unknown): QueryStatus | null {
  switch (t) {
    case ActivityType.QUERY_SENT: return QueryStatus.QUERIED;
    /* ⚠️ `MATERIALS_SENT` IS DELIBERATELY ABSENT. It does not say WHICH materials, so it cannot
       choose between `Partial Sent` and `Full Sent` — and choosing would be exactly the guess this
       module refuses. It falls to a neutral bubble on the writer's side, which is all the record
       supports. */
    case ActivityType.STATUS_CHANGED:
    default: return null;
  }
}

/** Where an unplaceable query event sits. A type we know the writer performs goes on their side. */
function sideFromType(t: unknown): Side {
  return WRITER_TYPES.has(t as string) ? "out" : "in";
}

/**
 * ⚠️ "STILL OPEN" IS THE QUERY'S CURRENT STATUS, NOT A FLAG ON THE ACTIVITY. A request bubble
 * offers "Mark sent" only while the query is still sitting at that request — the moment it moves on
 * the control disappears, because the thing it would do has been done. Storing openness on the
 * event would be a fact that goes stale the instant the query moves and nothing to notice.
 */
const REQUESTED: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED,
]);

export function markSentOffered(
  a: Pick<Activity, "activityType" | "resultingStatus" | "queryId">,
  queries: Pick<Query, "id" | "status">[],
): boolean {
  const shape = bubbleShape(a);
  if (shape.kind !== "query" || shape.status === null) return false;
  if (!REQUESTED.has(shape.status)) return false;
  const q = queries.find((x) => x.id === a.queryId);
  return !!q && q.status === shape.status;
}

/**
 * ⚠️ A TIGHT RUN DROPS THE FURNITURE, NEVER THE BUBBLE. Consecutive bubbles from the same side, in
 * the same day group, lose their state label and their meta line so a burst reads as one burst.
 * The FIRST of a run keeps both — a run with no head is a run nobody can date or attribute.
 */
export function tightRunHeads<T extends { side: Side; dayLabel: string }>(rows: T[]): boolean[] {
  return rows.map((r, i) => {
    const prev = rows[i - 1];
    return !prev || prev.side !== r.side || prev.dayLabel !== r.dayLabel;
  });
}
