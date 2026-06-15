/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Timeline event family resolution — the shared classifier the Dashboard "story so far" card
 * grammar consumes (and the housekeeping cut keys on). Pure logic, no JSX (the glyph lives in
 * components/TimelineDot.tsx).
 *
 * Family derives primarily from the stamped resultingStatus, then activityType, then a desc-based
 * fallback — so it never depends on display copy.
 */
import { ActivityType, QueryStatus } from "../types";
import { getActivityKeyAndDefaults } from "./activityUtils";

export type TimelineFamily = "incoming" | "outgoing" | "closed" | "offer" | "nudge" | "housekeeping";

export interface TimelineActivityLike {
  activityType?: ActivityType;
  description?: string;
  resultingStatus?: QueryStatus;
}

const HOUSEKEEPING_TYPES = new Set<ActivityType>([
  ActivityType.AGENT_ADDED,
  ActivityType.AGENT_UPDATED,
  ActivityType.AGENT_DELETED,
  ActivityType.MANUSCRIPT_ADDED,
  ActivityType.MANUSCRIPT_UPDATED,
  ActivityType.MANUSCRIPT_DELETED,
]);

export const getTimelineFamily = (act: TimelineActivityLike): TimelineFamily => {
  if (act.activityType && HOUSEKEEPING_TYPES.has(act.activityType)) return "housekeeping";
  if (act.activityType === ActivityType.NUDGE_SENT) return "nudge";

  // Status-bearing events: the stamped resultingStatus is the authority.
  switch (act.resultingStatus) {
    case QueryStatus.OFFER:
      return "offer";
    case QueryStatus.PARTIAL_REQUESTED:
    case QueryStatus.FULL_REQUESTED:
    case QueryStatus.REVISE_RESUBMIT:
      return "incoming";
    case QueryStatus.QUERIED:
    case QueryStatus.PARTIAL_SENT:
    case QueryStatus.FULL_SENT:
      return "outgoing";
    case QueryStatus.REJECTED:
    case QueryStatus.WITHDRAWN:
    case QueryStatus.NO_RESPONSE:
      return "closed";
  }

  // Pre-migration / unstamped events: fall back to the desc-based key.
  const { key } = getActivityKeyAndDefaults(act.description || "", act.activityType);
  switch (key) {
    case "offer":
      return "offer";
    case "partial_req":
    case "full_req":
    case "rr":
      return "incoming";
    case "queried":
    case "partial_sent":
    case "full_sent":
      return "outgoing";
    case "rejected":
    case "withdrawn":
    case "no_response":
      return "closed";
    case "nudge_sent":
      return "nudge";
    case "agent_added":
    case "agent_updated":
    case "ms_added":
    case "ms_updated":
      return "housekeeping";
    default:
      return "outgoing"; // bare "Status changed" / uncategorised — neutral, no consequence tag
  }
};

export const isHousekeeping = (act: TimelineActivityLike): boolean => getTimelineFamily(act) === "housekeeping";

/** Card styling per family (Dashboard "story so far"). Nudge reuses the outgoing palette; offer is
 *  rendered as a bespoke hero, so it has no entry here. */
export const FAMILY_CARD_STYLE: Record<"incoming" | "outgoing" | "closed", { accent: string; chipBg: string; chipText: string }> = {
  incoming: { accent: "#8a9e88", chipBg: "#e9ede6", chipText: "#5a6e58" },
  outgoing: { accent: "#7c3a2a", chipBg: "#f8e7dc", chipText: "#7c3a2a" },
  closed: { accent: "#cdbfb2", chipBg: "#f1ede7", chipText: "#8a7a6c" },
};
