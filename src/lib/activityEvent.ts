/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Timeline event labels from TYPED activity fields only (Tier 3 · Phase 2).
 *
 * The old inline mapper (Queries.tsx) rebuilt status by substring-matching activity DESCRIPTION
 * prose ("requested a partial", "full manuscript sent"…) — a second status vocabulary that broke
 * the day any copy was reworded. The signals here are the ones the data layer validates:
 *
 *   - resultingStatus — the exact QueryStatus enum member the rung produced, normalised through
 *     the SAME normaliser recomputeQuery derives from (camelCase and ad-hoc variants are not
 *     status-bearing);
 *   - activityType — the rules-validated 12-value ActivityType enum, discriminating the
 *     non-status rows (nudges; the send itself).
 *
 * Display strings are display strings: the description is deliberately NOT in this function's
 * input type, so prose cannot carry meaning. A row with no typed signal maps to null — visibly
 * inert (not rendered), never mis-mapped.
 */
import { ActivityType, QueryStatus } from "../types";
import { normalizeResultingStatus } from "./queryDerivation";

export interface EventLabelInput {
  activityType?: unknown;
  resultingStatus?: unknown;
}

export function activityEventLabel(act: EventLabelInput): string | null {
  // The send is the timeline's own hero row above the events — never repeated as an event.
  if (act.activityType === ActivityType.QUERY_SENT) return null;
  if (act.activityType === ActivityType.NUDGE_SENT) return "Nudge sent";

  const rs = normalizeResultingStatus(act.resultingStatus);
  if (!rs) return null; // no typed status signal → inert, whatever the prose says

  switch (rs) {
    case QueryStatus.QUERIED: return null; // a send/reversion rung — the hero row covers it
    case QueryStatus.PARTIAL_REQUESTED: return "Partial requested";
    case QueryStatus.PARTIAL_SENT: return "Partial sent";
    case QueryStatus.FULL_REQUESTED: return "Full requested";
    case QueryStatus.FULL_SENT: return "Full sent";
    case QueryStatus.REVISE_RESUBMIT: return "Revise & resubmit";
    case QueryStatus.OFFER: return "Offer received";
    case QueryStatus.REJECTED: return "Rejected";
    case QueryStatus.WITHDRAWN: return "Withdrawn";
    case QueryStatus.NO_RESPONSE: return "No response";
    default: {
      const unhandled: never = rs;
      return unhandled;
    }
  }
}
