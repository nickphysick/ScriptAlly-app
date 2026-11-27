/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The phone's four-node track (queried · partial · full · offer), moved from Phone app v4's query page (retired by Phone
 * query sheet v1) with the sheet that now draws it.
 */
import { QueryStatus } from "../../../types";

/** the four-node track: queried, partial, full, offer (−1 for a query closed short of an offer) */
export function trackStage(status: string): number {
  if (status === QueryStatus.SIGNED || status === QueryStatus.OFFER) return 3;
  if ([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN].includes(status as QueryStatus)) return -1;
  if ([QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED].includes(status as QueryStatus)) return 2;
  if ([QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT].includes(status as QueryStatus)) return 1;
  return 0;
}
