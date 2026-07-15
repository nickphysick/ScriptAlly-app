/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure payload builder for the Nudge flow — kept out of db.tsx so it's unit-testable in isolation.
 *
 * Smallest-blast-radius design (see BUILD 2 brief / earlier recon):
 *  - The nudge is a NON-status activity (no resultingStatus) → recomputeQuery ignores it, so
 *    status / dates / revisionRound / hasAgentResponded are untouched and it never counts as a
 *    response.
 *  - We set nudgeDate (the existing "next nudge" field, also the timeline follow-up date source)
 *    and lastNudgeSentDate (bookkeeping for future repeat-nudge handling). We do NOT touch
 *    responseDeadline or status.
 *  - The nudge_overdue task is hidden-and-resurfaced via a DismissedTask whose resurfaceDate is
 *    the chosen check-back date (dismissType "custom date"). The Tasks filter already keys on
 *    resurfaceDate, so the task leaves now and returns on the check-back date.
 *
 * The optional note rides in `details` (appended after the follow-up line): the Firestore
 * activities rule's update allowlist is a fixed set (activityType/description/date/details/
 * resultingStatus), so a dedicated `note` field would be silently denied — `details` is the
 * safe home, and the timeline renders it beneath the node.
 */
import { Activity, ActivityType, Query, Agent } from "../types";

const DESC_MAX = 512; // firestore.rules isValidActivity: description size limit
const DETAILS_MAX = 4096; // firestore.rules isValidActivity: details size limit

export interface NudgeInput {
  /** The chosen check-back date (ISO or date string). Normalised to ISO here. */
  checkBackDate: string;
  /** Optional note the writer kept on record. */
  note?: string;
}

export interface NudgeDismissalWrite {
  taskType: "nudge_overdue";
  relatedRecordId: string;
  dismissedDate: string;
  resurfaceDate: string;
  dismissType: "custom date";
}

export interface NudgeWrites {
  /** AUTHORITATIVE row for the per-query subcollection (users/{uid}/queries/{qid}/activity) — what
   *  the Tracking timeline reads. `type` is deliberately NOT a QueryStatus enum member, so
   *  recomputeQuery's normalisation ignores it (non-status by construction). */
  nested: { type: typeof NUDGE_NESTED_TYPE; createdAt: string; note: string; queryId: string; agentName: string };
  /** The global-feed PROJECTION twin (users/{uid}/activities) — what the dashboard timeline reads.
   *  Derived from the same build as `nested`; the caller writes both under ONE shared id (the
   *  saveQueryEdits same-id-twin convention), never as an independent parallel write. */
  activity: Omit<Activity, "id" | "userId">;
  /** The ONLY query fields touched — never status or responseDeadline. */
  queryUpdates: { nudgeDate: string; lastNudgeSentDate: string };
  /** The hide-and-resurface dismissal (id/userId added by the caller). */
  dismissal: NudgeDismissalWrite;
}

/** The nested row's `type` — the Tracking timeline keys its nudge node on this exact string. */
export const NUDGE_NESTED_TYPE = "Nudge sent" as const;

/** Human-readable check-back date for the timeline `details` line. */
export const formatCheckBack = (dateISO: string): string =>
  new Date(dateISO).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Build every write a "Log nudge" produces, as plain data. Side-effect-free and clock-injected
 * (`now`) so it's deterministic to test.
 */
export const buildNudgeWrites = (
  query: Query,
  agent: Agent | null | undefined,
  input: NudgeInput,
  now: Date
): NudgeWrites => {
  const agentName = agent?.name || "agent";
  const agency = agent?.agency || "agency";
  const checkBackISO = new Date(input.checkBackDate).toISOString();
  const nowISO = now.toISOString();
  const note = input.note?.trim();

  // Description MUST begin "Nudge sent to {agent} at {agency}" — the timeline keys its clock glyph
  // and "Nudge sent" pill off the word "nudge" in the description.
  let description = `Nudge sent to ${agentName} at ${agency}`;
  if (description.length > DESC_MAX) description = description.slice(0, DESC_MAX);

  let details = `Follow-up reminder set for ${formatCheckBack(checkBackISO)}`;
  if (note) details += ` · "${note}"`;
  if (details.length > DETAILS_MAX) details = details.slice(0, DETAILS_MAX);

  return {
    // ONE build feeds BOTH stores: `nested` is the authoritative row, `activity` its projection twin.
    nested: {
      type: NUDGE_NESTED_TYPE, // non-enum → recomputeQuery ignores it (never status-bearing)
      createdAt: nowISO,
      note: details, // the follow-up line (+ optional writer note) renders beneath the node
      queryId: query.id,
      agentName,
    },
    activity: {
      queryId: query.id,
      manuscriptId: query.manuscriptId,
      activityType: ActivityType.NUDGE_SENT,
      description,
      date: nowISO,
      details,
      // deliberately NO resultingStatus — non-status event
    },
    queryUpdates: { nudgeDate: checkBackISO, lastNudgeSentDate: nowISO },
    dismissal: {
      taskType: "nudge_overdue",
      relatedRecordId: query.id,
      dismissedDate: nowISO,
      resurfaceDate: checkBackISO,
      dismissType: "custom date",
    },
  };
};
