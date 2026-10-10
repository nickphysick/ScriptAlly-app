/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Feed drawer v2 — which FAMILY a feed entry belongs to. Seven families, one colour each; the family
 * dresses the row (its disc, its tag, its tint) and decides nothing else.
 *
 * It reads the entry's own fields and nothing derived here: `app`, `activityType` and `status`. The
 * feed (`lib/dashFeed`) is untouched; the All · From agents · By you control and the summary read
 * `dir`, which the family does not.
 *
 * ⚠️ THE ACTIVITY IS ASKED BEFORE THE STATUS. A declined offer carries the status Withdrawn and an
 * accepted one carries none, so either would be right by luck or wrong in silence if the status went
 * first. A nudge carries no status at all.
 *
 * ⚠️ ANYTHING THAT FITS NO ROW OF THE TABLE IS `closed`, the quietest dress that is still a full
 * row. `FELL_TO_CLOSED` names what reaches it that way, for the report.
 */
import { ActivityType, QueryStatus } from "../../../types";
import type { FeedEntry } from "../../../lib/dashFeed";

export type FeedFamily = "offer" | "request" | "queried" | "sent" | "nudge" | "closed" | "housekeeping";

export const FEED_FAMILIES: readonly FeedFamily[] = ["offer", "request", "queried", "sent", "nudge", "closed", "housekeeping"];

const BY_STATUS: Partial<Record<QueryStatus, FeedFamily>> = {
  [QueryStatus.OFFER]: "offer",
  [QueryStatus.SIGNED]: "offer",
  [QueryStatus.PARTIAL_REQUESTED]: "request",
  [QueryStatus.FULL_REQUESTED]: "request",
  [QueryStatus.REVISE_RESUBMIT]: "request",
  [QueryStatus.QUERIED]: "queried",
  [QueryStatus.PARTIAL_SENT]: "sent",
  [QueryStatus.FULL_SENT]: "sent",
  [QueryStatus.RESUBMITTED]: "sent",
  [QueryStatus.REJECTED]: "closed",
  [QueryStatus.WITHDRAWN]: "closed",
  [QueryStatus.NO_RESPONSE]: "closed",
};

type Fields = Pick<FeedEntry, "app" | "activityType" | "status">;

/** True when the entry matches no row of the table and takes `closed` by default. */
export const fellToClosed = (e: Fields): boolean =>
  !e.app && e.activityType !== ActivityType.NUDGE_SENT && e.activityType !== ActivityType.OFFER_ACCEPTED
  && e.activityType !== ActivityType.OFFER_DECLINED && !(e.status && BY_STATUS[e.status]);

export function feedFamily(e: Fields): FeedFamily {
  if (e.app) return "housekeeping";
  if (e.activityType === ActivityType.NUDGE_SENT) return "nudge";
  if (e.activityType === ActivityType.OFFER_ACCEPTED) return "offer";
  if (e.activityType === ActivityType.OFFER_DECLINED) return "closed";
  return (e.status && BY_STATUS[e.status]) || "closed";
}

/** The two families whose row is tinted and carries the action. */
export const isTinted = (f: FeedFamily): boolean => f === "offer" || f === "request";

/** The journey an open offer or request's button opens: the offer's own, else the send. As built in v58. */
export const actModeFor = (status: QueryStatus | null): "offer" | "sent" => (status === QueryStatus.OFFER ? "offer" : "sent");
