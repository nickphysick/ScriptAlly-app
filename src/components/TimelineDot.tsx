/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared timeline dot + label primitive — the single source for both the Dashboard "story so far"
 * feed and the QuerySlideInPanel "Tracking history". Previously this logic was copied into both.
 *
 * All STATUS glyphs route through the canonical StatusDot; the only non-status glyphs are the nudge
 * clock and the agent/manuscript open/closed/neutral marks (which only surface in the slide-in,
 * since the Dashboard feed cuts housekeeping). Family + card styling live in lib/timelineEvent.ts.
 */
import React from "react";
import { QueryStatus, ActivityType } from "../types";
import { getActivityKeyAndDefaults } from "../lib/activityUtils";
import { StatusDot } from "./StatusDot";

/**
 * Timeline mark for an activity row. Status-bearing events render the canonical StatusDot;
 * non-status events (nudges, agent/manuscript updates) keep small neutral marks.
 */
export const renderTimelineDot = (label: string, resultingStatus?: QueryStatus): React.ReactNode => {
  if (resultingStatus) {
    return <StatusDot status={resultingStatus} overrideSize={13} />;
  }

  const LABEL_TO_STATUS: Record<string, QueryStatus> = {
    "Query sent": QueryStatus.QUERIED,
    "Query letter": QueryStatus.QUERIED,
    "Partial requested": QueryStatus.PARTIAL_REQUESTED,
    "Partial sent": QueryStatus.PARTIAL_SENT,
    "Full requested": QueryStatus.FULL_REQUESTED,
    "Full sent": QueryStatus.FULL_SENT,
    "Materials sent": QueryStatus.PARTIAL_SENT,
    "Offer received": QueryStatus.OFFER,
    "Revise & resubmit": QueryStatus.REVISE_RESUBMIT,
    "Rejection": QueryStatus.REJECTED,
    "Withdrawn": QueryStatus.WITHDRAWN,
  };
  const mapped = LABEL_TO_STATUS[label];
  if (mapped) {
    return <StatusDot status={mapped} overrideSize={13} />;
  }

  if (label === "Nudge sent") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#7c3a2a]">
        <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="3.5" fill="#ffffff" />
        <path d="M 20,11 L 20,20 L 26,20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (label === "Now open" || label === "Ready to query") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#8a9e88]">
        <circle cx="20" cy="20" r="17" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (label === "Now closed" || label === "Shelved") {
    return (
      <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#cfc6bb]">
        <circle cx="20" cy="20" r="17" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  // fallback neutral mark ("Status changed", uncategorised events)
  return (
    <svg width="13" height="13" viewBox="0 0 40 40" className="shrink-0 text-[#7c3a2a]">
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="3.5" fill="#ffffff" />
    </svg>
  );
};

/**
 * Resolve an activity's default display label + its glyph + its copy key. The AI-style
 * copy-customizer (the only writer of the sc_custom_pill_* overrides) has been removed, so
 * resolution always uses the defaults: the pill always shows and the label is the default.
 * `show` is kept in the returned shape for the callers that still destructure it.
 */
export const getPillLabelAndDot = (desc: string, activityType?: ActivityType, resultingStatus?: QueryStatus) => {
  const { key, defaultLabel } = getActivityKeyAndDefaults(desc, activityType);
  const dot = renderTimelineDot(defaultLabel, resultingStatus);

  return { label: defaultLabel, dot, show: true, key };
};
