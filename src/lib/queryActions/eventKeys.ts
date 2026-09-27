/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DRAWER'S EVENT KEYS, AND WHAT EACH IS CALLED (brief K5). The feed and the timeline read the
 * key FIRST; description text is matched only for older rows that carry none — so a new event can
 * never be misfiled by the words its sentence happens to use.
 *
 * `LEGACY_KEY` maps each onto the older description-matcher's vocabulary
 * (`activityUtils.getActivityKeyAndDefaults`), so the surfaces keyed on that vocabulary — the
 * timeline's dot and direction — read a new event exactly as they read an old one.
 */
import type { EventKey } from "../../types";

export const EVENT_LABEL: Record<EventKey, string> = {
  query_sent: "Query sent",
  requery_sent: "Requery sent",
  partial_requested: "Partial requested",
  full_requested: "Full requested",
  rr_requested: "Revise & resubmit",
  partial_sent: "Partial sent",
  full_sent: "Full sent",
  resubmitted: "Resubmitted",
  pass: "Passed",
  offer: "An offer",
  offer_call: "Offer call",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  signed: "Signed",
  nudge_sent: "Nudge sent",
  closed_no_reply: "No reply",
  withdrawn: "Withdrawn",
  withdrawn_on_offer: "Withdrawn — accepted an offer",
  closed_agent_gone: "Closed to queries",
  late_reply_reopened: "Reopened",
  entry_corrected: "Entry corrected",
};

export const LEGACY_KEY: Record<EventKey, string | null> = {
  query_sent: "queried",
  requery_sent: "queried",
  partial_requested: "partial_req",
  full_requested: "full_req",
  rr_requested: "rr",
  partial_sent: "partial_sent",
  full_sent: "full_sent",
  resubmitted: "full_sent",
  pass: "rejected",
  offer: "offer",
  offer_call: null,
  offer_accepted: "offer",
  offer_declined: "withdrawn",
  signed: "offer",
  nudge_sent: "nudge_sent",
  closed_no_reply: "no_response",
  withdrawn: "withdrawn",
  withdrawn_on_offer: "withdrawn",
  closed_agent_gone: "withdrawn",
  late_reply_reopened: null,
  entry_corrected: null,
};

export const isEventKey = (k: unknown): k is EventKey => typeof k === "string" && k in EVENT_LABEL;
