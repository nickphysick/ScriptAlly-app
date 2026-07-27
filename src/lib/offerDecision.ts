/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * offerDecision — the interim offer journey's ONE completion write (journey-logic pass Phase 3;
 * ref design-refs/todo-offer-send-journeys.html §1). Pure builder, logNudge's twin pattern: one
 * build feeds the authoritative per-query row AND its global-feed projection under one id.
 *
 * The invariant this exists to honour: the OFFER activity is the AGENT'S event, already on the
 * timeline — completing the task records the WRITER'S decision, never a re-log.
 *  · ACCEPTED — a non-status activity (no resultingStatus anywhere): the query keeps its
 *    historically-true OFFER status; the parked full Offer Decision Flow owns any closing
 *    ceremony later. The offer task dies via hasOfferDecision (the engine clause).
 *  · DECLINED — the decision activity CARRIES `resultingStatus: WITHDRAWN` (mechanism (ii),
 *    Nick's delegated call): recomputeQuery honours resultingStatus on any activity, so the
 *    single deriver closes the query from this one honest node — no second STATUS_CHANGED
 *    activity, no parallel status write. The querying continues; other queries untouched.
 *
 * Decisions are logged AT THE MOMENT OF RECORDING (the ref's decide step) — no back-dating, so
 * the P1 noon rule never applies here.
 */
import { Activity, ActivityType, Agent, Query, QueryStatus } from "../types";

export type OfferDecision = "accepted" | "declined";

/** The nested rows' `type` strings — free-form per the nested rules (≤128), non-enum so
 *  recompute keys ONLY on the explicit resultingStatus we set (or don't). */
export const OFFER_ACCEPTED_NESTED_TYPE = "Offer accepted" as const;
export const OFFER_DECLINED_NESTED_TYPE = "Offer declined" as const;

export interface OfferDecisionWrites {
  /** AUTHORITATIVE per-query row (users/{uid}/queries/{qid}/activity). */
  nested: { type: string; createdAt: string; note: string; queryId: string; agentName: string; resultingStatus?: QueryStatus };
  /** The global-feed projection twin — same build, same id (the logNudge convention). */
  activity: Omit<Activity, "id" | "userId">;
}

export function buildOfferDecisionWrites(
  query: Query,
  agent: Agent | null | undefined,
  decision: OfferDecision,
  now: Date,
): OfferDecisionWrites {
  const agentName = agent?.name || "the agent";
  const agency = agent?.agency ? ` at ${agent.agency}` : "";
  const nowISO = now.toISOString();
  if (decision === "accepted") {
    const description = `Offer accepted — ${agentName}${agency} now represents this manuscript`;
    return {
      nested: { type: OFFER_ACCEPTED_NESTED_TYPE, createdAt: nowISO, note: description, queryId: query.id, agentName },
      activity: {
        queryId: query.id,
        manuscriptId: query.manuscriptId,
        activityType: ActivityType.OFFER_ACCEPTED,
        description,
        date: nowISO,
        details: "Recorded from the To-do board. Other open queries are unchanged — closing them is a later guided step.",
        // deliberately NO resultingStatus — non-status by construction; the OFFER status stays
        // historically true and recompute derives nothing new from this node.
      },
    };
  }
  const description = `Offer declined — ${agentName}${agency}; the querying continues`;
  return {
    nested: { type: OFFER_DECLINED_NESTED_TYPE, createdAt: nowISO, note: description, queryId: query.id, agentName, resultingStatus: QueryStatus.WITHDRAWN },
    activity: {
      queryId: query.id,
      manuscriptId: query.manuscriptId,
      activityType: ActivityType.OFFER_DECLINED,
      description,
      date: nowISO,
      details: "Other queries untouched.",
      resultingStatus: QueryStatus.WITHDRAWN, // recompute — the single deriver — closes the query from this node
    },
  };
}

/** Does a recorded decision exist for this query? The offer task's death condition (the approved
 *  engine clause) — accepted keeps status OFFER, so status alone can never clear the task. */
export function hasOfferDecision(queryId: string, activities: Pick<Activity, "queryId" | "activityType">[]): boolean {
  return activities.some(
    (a) => a.queryId === queryId && (a.activityType === ActivityType.OFFER_ACCEPTED || a.activityType === ActivityType.OFFER_DECLINED),
  );
}
