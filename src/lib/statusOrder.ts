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
