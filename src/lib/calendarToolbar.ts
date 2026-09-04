/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BOARD'S VIEW OPTIONS (v63, section C) — how the rows are grouped, ordered and filtered.
 *
 * ⚠️ THE SIDEBAR AND THE TOOLBAR ANSWER DIFFERENT QUESTIONS, and keeping them apart is the whole
 * reason both exist. The sidebar's views ask WHICH ROWS — one class of work at a time, and its
 * counts are a census of the board. The toolbar asks HOW THE ROWS ARE ARRANGED — grouped by what,
 * ordered by what, narrowed to which statuses. A control that did both would be two questions
 * wearing one label, which is the fault the retired tab strip had.
 *
 * ⚠️ AND EVERY OPTION HERE IS A PURE FUNCTION OVER THE ROW SET. Nothing fetches, nothing re-derives
 * a status, nothing knows about the board's geometry: `groupOf` buckets, `sortKey` orders,
 * `matchesStatus` filters. That is what lets a lock assert "this control changed the rendered row
 * set" without the test needing to know how a row is drawn.
 */
import { QueryStatus } from "../types";
import type { CalSection } from "./calendarSections";

/* ══ GROUPING ═══════════════════════════════════════════════════════════════════════════════ */

export type GroupBy = "urgency" | "status" | "action" | "none";

export const GROUP_BY_ORDER: readonly GroupBy[] = ["urgency", "status", "action", "none"];

export const GROUP_BY_LABEL: Record<GroupBy, string> = {
  urgency: "Urgency",
  status: "Status",
  action: "Action required",
  none: "No grouping",
};

/**
 * The `action` grouping's four buckets.
 *
 * ⚠️ IT IS NOT THE URGENCY GROUPING RENAMED. Urgency asks how late a thing is; this asks whether
 * anything is being asked of the writer at all — so a wait with a reply expected next week and one
 * with nothing scheduled are the same under urgency and different here. Four buckets, and the third
 * is the one urgency has no word for.
 */
export type ActionBucket = "required" | "upcoming" | "nothing" | "closed";

export const ACTION_ORDER: readonly ActionBucket[] = ["required", "upcoming", "nothing", "closed"];

export const ACTION_LABEL: Record<ActionBucket, string> = {
  required: "Action required",
  upcoming: "Upcoming",
  nothing: "Nothing needed yet",
  closed: "Closed",
};

/** Which action bucket a section falls in — one mapping, so the two groupings cannot disagree. */
export function actionBucketOf(sec: CalSection): ActionBucket {
  if (sec === "shut") return "closed";
  if (sec === "over" || sec === "task") return "required";
  if (sec === "need") return "upcoming";
  return "nothing";
}

/* ══ SORTING ════════════════════════════════════════════════════════════════════════════════ */

export type SortBy = "urgency" | "status" | "sent" | "recent";

export const SORT_BY_ORDER: readonly SortBy[] = ["urgency", "status", "sent", "recent"];

export const SORT_BY_LABEL: Record<SortBy, string> = {
  urgency: "Urgency",
  status: "Status",
  sent: "Queried date",
  recent: "Most recent activity",
};

/**
 * The status ladder, for the `status` sort and grouping.
 *
 * ⚠️ IT IS THE PIPELINE'S OWN ORDER, NOT ALPHABETICAL. "Full Requested" before "Full Sent" before
 * "Offer" is the shape of the journey; sorting those three by their first letter would put an offer
 * between a query and a partial and tell a reader nothing.
 */
export const STATUS_LADDER: readonly QueryStatus[] = [
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER,
  QueryStatus.REJECTED,
  QueryStatus.WITHDRAWN,
  QueryStatus.NO_RESPONSE,
];

export function statusRank(s: QueryStatus | string | null | undefined): number {
  const i = STATUS_LADDER.indexOf(s as QueryStatus);
  /* ⚠️ AN UNRECOGNISED STATUS SINKS RATHER THAN LEADS. `indexOf` returns −1, and −1 sorted as a
     rank would put every status the app has not been told about at the top of a board whose whole
     claim is that the top is what needs you. */
  return i < 0 ? STATUS_LADDER.length : i;
}

/* ══ STATUS FILTER ══════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ AN EMPTY SET MEANS "EVERYTHING", NOT "NOTHING". Nine unticked boxes is the state a reader
 * starts in, and reading it as a filter that excludes every status would empty the board on load.
 * The tick is what narrows; the absence of ticks narrows nothing.
 */
export function matchesStatus(picked: readonly QueryStatus[], s: QueryStatus | null): boolean {
  if (!picked.length) return true;
  return s != null && picked.includes(s);
}

/**
 * Is any view option away from its default?
 *
 * ⚠️ THE `Clear all` LINK APPEARS ONLY WHEN IT HAS SOMETHING TO CLEAR — the same rule the window's
 * `Back to today` follows, and for the same reason: a control that is always present and usually
 * does nothing teaches a reader to ignore it for the one moment it matters.
 */
export function anythingApplied(o: {
  view: CalSection | null;
  statuses: readonly QueryStatus[];
}): boolean {
  return o.view !== null || o.statuses.length > 0;
}
