/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1.1 (Part 4) — which icon a feed event draws. ONE icon per kind of event (ref
 * design-refs/feed-icons-v1/feed-icons-v1.json); the drawings are shared/FeedIcon's. Rows about a query's status keep
 * their StatusDot, so they map to null here.
 *
 * ⚠️ DECIDED FROM THE EVENT'S OWN TYPE AND KEY, never from its words.
 */
import { ActivityType } from "../types";
import type { FeedEntry } from "./dashFeed";
import { LEGACY_HOLDING_TYPE } from "./agentReply";

export type FeedIconKind =
  | "agent_added" | "agent_updated" | "agent_removed" | "agents_several"
  | "manuscript_added" | "manuscript_updated" | "manuscript_removed"
  | "holding_reply" | "others_told" | "call_booked" | "nudge" | "import" | "manuscript";

/** The event's icon, or null for a row that draws its StatusDot — or that has no icon of its own (reported). */
export function feedIconKind(e: Pick<FeedEntry, "activityType" | "eventKey" | "status" | "imported" | "who" | "app">): FeedIconKind | null {
  if (e.imported) return "import";
  switch (e.activityType) {
    case ActivityType.AGENT_ADDED: return "agent_added";
    /* a sweep names no one: its row's subject is empty */
    case ActivityType.AGENT_UPDATED: return e.who ? "agent_updated" : "agents_several";
    case ActivityType.AGENT_DELETED: return "agent_removed";
    case ActivityType.MANUSCRIPT_ADDED: return "manuscript_added";
    case ActivityType.MANUSCRIPT_UPDATED: return "manuscript_updated";
    case ActivityType.MANUSCRIPT_DELETED: return "manuscript_removed";
    case ActivityType.NUDGE_SENT: return "nudge";
    case LEGACY_HOLDING_TYPE: case "Agent Reply": return "holding_reply";
  }
  if (e.eventKey === "nudge_sent") return "nudge";
  if (e.eventKey === "offer_told") return "others_told";
  if (e.eventKey === "offer_call") return "call_booked";
  return null;
}
