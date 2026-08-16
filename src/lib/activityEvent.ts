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

/**
 * ⚠️ `includeSend` EXISTS BECAUSE THE SUPPRESSION BELOW IS A FACT ABOUT ONE SURFACE, NOT ABOUT THE
 * EVENT. The Query Centre draws its own "Query sent" HERO ROW above the timeline, so repeating it as
 * an entry would state the same thing twice — which is why `QUERIED` and `QUERY_SENT` return null.
 *
 * ⚠️ THE DOCK INHERITED THAT AND HAS NO HERO ROW, so the query going out was dropped from its
 * timeline entirely. Measured on the deployed page: the Query Centre renders "Query sent · via
 * Email" from a subcollection whose card in the dock showed a single later rung. Same store, two
 * surfaces, one of them silently a rung short.
 *
 * A caller says whether it draws the send itself. One vocabulary, one function — a second labeller
 * for the dock is how two surfaces come to call one event different things.
 */
export interface EventLabelOptions {
  /** The caller has NO hero row, so the send must appear as an entry. Default false. */
  includeSend?: boolean;
}

export function activityEventLabel(act: EventLabelInput, opts: EventLabelOptions = {}): string | null {
  // The send is the timeline's own hero row above the events — never repeated as an event.
  if (act.activityType === ActivityType.QUERY_SENT) return opts.includeSend ? "Query sent" : null;
  if (act.activityType === ActivityType.NUDGE_SENT) return "Nudge sent";

  const rs = normalizeResultingStatus(act.resultingStatus);
  if (!rs) return null; // no typed status signal → inert, whatever the prose says

  switch (rs) {
    case QueryStatus.QUERIED: return opts.includeSend ? "Query sent" : null;
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
