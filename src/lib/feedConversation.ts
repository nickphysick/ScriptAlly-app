/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * feedConversation — HOW THE FEED CLASSIFIES AN EVENT (dashboard redesign, Phase 6).
 *
 * ⚠️ THE CONVERSATION IS RETIRED AND THE CLASSIFIER IS NOT (v16, 18 Sep). The bubbles, their sides
 * and their tight runs went with the rail; what the v16 feed still needs is exactly what this module
 * always answered — is this event about a query, which rung did it produce, and does the row earn a
 * "Send it" link. `Side`, `sideFromType` and `tightRunHeads` are deleted with the layout that read
 * them, and `bubbleShape` is `eventShape`: a name that outlives its subject is worse than no name.
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

/* ⚠️ `AGENT_STATUSES` IS RETIRED WITH THE SIDES (v16). It answered "whose message is this" for the
   conversation's alignment; the v16 row states the person in its sentence instead. It was pointedly
   NOT `statusDirection` — that export puts an OFFER on the writer's side, which is a defensible
   colour choice on a list and was a false statement in a thread. */


/* ⚠️ `WRITER_TYPES` IS RETIRED WITH `sideFromType` (v16) — it named the acts that sat on the writer's
   side of the thread, and nothing is aligned any more. */


export interface EventShape {
  /** ⚠️ `queryId` DECIDES THIS, and nothing else. */
  kind: "query" | "housekeeping";
  /** the v2 state whose token fills the row's pill — `null` on housekeeping and on a neutral query */
  state: State | null;
  /** the exact status the rung produced. Never a string that is not a member. */
  status: QueryStatus | null;
}

/**
 * The one classification. Takes the ACTIVITY, so a caller cannot hand it a half-resolved row.
 */
export function eventShape(a: Pick<Activity, "activityType" | "resultingStatus" | "queryId">): EventShape {
  /* ⚠️ THE TEST, AND IT IS THE FIRST LINE ON PURPOSE. */
  if (!a.queryId) return { kind: "housekeeping", state: null, status: null };

  const status = normalizeResultingStatus(a.resultingStatus) ?? statusFromType(a.activityType);
  if (status === null) {
    /* a query event the record cannot place — neutral, never housekeeping, never a guess */
    return { kind: "query", state: null, status: null };
  }
  return { kind: "query", state: stateFor(status), status };
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
  const shape = eventShape(a);
  if (shape.kind !== "query" || shape.status === null) return false;
  if (!REQUESTED.has(shape.status)) return false;
  const q = queries.find((x) => x.id === a.queryId);
  return !!q && q.status === shape.status;
}

/* ⚠️ `tightRunHeads` IS RETIRED WITH THE BUBBLES (v16). It dropped a run's repeated furniture; the
   v16 feed states every row's pill, time and provenance, because a row is read on its own. */
