/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * STATUS_ORDER — the canonical querying-journey order (exact QueryStatus enum strings).
 * One source of truth so divergent lists can't drift apart. Consumers:
 *  - the reading-pane timeline's stage comparison (QuerySlideInPanel),
 *  - the Active-queries stat-card composition popup (iterate this, omit zero counts — Offer is
 *    never "active" so it naturally drops out),
 *  - the dashboard pipeline columns follow the same journey (queried → … → offer).
 */
import { QueryStatus } from "../types";

export const STATUS_ORDER: QueryStatus[] = [
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
];

/**
 * EXPECTED_NEXT_STEPS — for a query AWAITING a response (an outgoing state), the incoming outcomes
 * that ordinarily follow. Single source of truth for the Record-a-response screen's "pulse the
 * likely outcomes" cue: an offered outcome NOT in this list is a step out of the usual order and
 * triggers a gentle confirm. A status absent here pulses nothing (every choice confirms) — a safe
 * default. Keyed by exact QueryStatus strings so it can't drift from the pipeline order above.
 */
export const EXPECTED_NEXT_STEPS: Partial<Record<QueryStatus, QueryStatus[]>> = {
  [QueryStatus.QUERIED]: [QueryStatus.PARTIAL_REQUESTED, QueryStatus.REJECTED],
  [QueryStatus.PARTIAL_SENT]: [QueryStatus.FULL_REQUESTED, QueryStatus.REJECTED],
  [QueryStatus.FULL_SENT]: [QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED],
};
