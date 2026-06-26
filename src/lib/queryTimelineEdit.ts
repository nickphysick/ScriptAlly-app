/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure logic for the Edit Query drawer's correction fork (Prompt 3) — the change-vs-correction model.
 *
 * The drawer mutates ACTIVITIES; recomputeQuery derives status / dates / round / responses from the
 * resulting log. This module never touches Firestore: it stages the would-be edits and HARD-BLOCKS
 * the ones that would contradict the sequence, so a bad correction is caught in code (Save locked +
 * a plain-English reason) before the round-trip — mirroring sanitizeAgentPatch's "validate, then
 * commit" split.
 *
 * The fork:
 *   · "Something changed"   → APPEND a new rung (advances the pipeline). The original entries stay.
 *   · "I'm fixing a mistake" → EDIT (date / classification / details) or DELETE the existing rung.
 * Undo is delete-the-record, never a compensating entry; each query counts at most one response.
 */
import { QueryStatus } from "../types";

/** Terminal statuses — a query can hold at most one, and it must be the LAST event. */
export const TERMINAL_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
]);

/** Statuses offered by "something changed" — the pipeline events you'd log onto an existing query. */
export const ADVANCE_OPTIONS: QueryStatus[] = [
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER,
  QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
];

/** Classifications a response event can be RE-classified to (fixing a mis-recorded event). */
export const RECLASSIFY_OPTIONS: QueryStatus[] = [
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED,
];

/** The "sent answers a request" pairs — a Sent can't predate the Request it answers. */
const SENT_AFTER_REQUEST: { sent: QueryStatus; request: QueryStatus }[] = [
  { sent: QueryStatus.PARTIAL_SENT, request: QueryStatus.PARTIAL_REQUESTED },
  { sent: QueryStatus.FULL_SENT, request: QueryStatus.FULL_REQUESTED },
];

/** A non-root rung in the PROJECTED log (after the staged ops are applied; deletes already removed). */
export interface ProjectedRung {
  /** Subcollection id, or a temp id for a staged append. */
  id: string;
  status: QueryStatus;
  timeMs: number;
}

export interface TimelineValidationInput {
  /** The query's send date (the locked root). Every event must be on/after it. */
  dateSentMs: number;
  /** Non-root rungs after the staged ops are applied. */
  rungs: ProjectedRung[];
  /** "Now" — injected so the rule is pure/testable. */
  nowMs: number;
}

export interface TimelineError {
  code: string;
  /** Plain-English reason naming what to fix first. */
  message: string;
}

const label = (s: QueryStatus): string => s;

/**
 * The hard-blocks. A non-empty result LOCKS Save; the UI shows the first reason + an inline
 * "Undo — keep '{original}'". Order: future dates, before-send, sent-before-request, terminal-not-last.
 */
export function validateTimeline(input: TimelineValidationInput): TimelineError[] {
  const { dateSentMs, rungs, nowMs } = input;
  const errors: TimelineError[] = [];

  // 1. The send date itself can't be in the future.
  if (dateSentMs > nowMs) {
    errors.push({ code: "future_send", message: "The send date is in the future — pick today or earlier." });
  }

  // 2. No event in the future; 3. no event before the send.
  for (const r of rungs) {
    if (r.timeMs > nowMs) {
      errors.push({ code: "future_event", message: `“${label(r.status)}” is dated in the future — pick today or earlier.` });
    }
    if (r.timeMs < dateSentMs) {
      errors.push({ code: "before_send", message: `“${label(r.status)}” can’t be dated before the query was sent.` });
    }
  }

  // 4. A Sent can't predate the Request it answers (when that request exists in the log).
  for (const { sent, request } of SENT_AFTER_REQUEST) {
    const reqTimes = rungs.filter((r) => r.status === request).map((r) => r.timeMs);
    if (reqTimes.length === 0) continue;
    const earliestReq = Math.min(...reqTimes);
    for (const s of rungs.filter((r) => r.status === sent)) {
      if (s.timeMs < earliestReq) {
        errors.push({ code: "sent_before_request", message: `A ${label(sent)} can’t be dated before the ${label(request)} it answers — fix the dates first.` });
        break;
      }
    }
  }

  // 5. A terminal status must be the LAST event (offer/rejection/withdrawn/no-response is final).
  const all = [
    { id: "__root__", status: QueryStatus.QUERIED, timeMs: dateSentMs },
    ...rungs,
  ].sort((a, b) => a.timeMs - b.timeMs || a.id.localeCompare(b.id));
  for (let i = 0; i < all.length; i++) {
    if (TERMINAL_STATUSES.has(all[i].status) && i < all.length - 1) {
      errors.push({ code: "terminal_not_last", message: `“${label(all[i].status)}” is final — it must be the last event. Remove or re-date the later events first.` });
      break;
    }
  }

  return errors;
}

/** The default note an appended rung carries (the timeline grammar recognises these phrasings). */
export function appendNoteFor(status: QueryStatus, agentName: string, agency: string): string {
  const at = agency ? `${agentName} at ${agency}` : agentName;
  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED: return `${at} requested a partial manuscript`;
    case QueryStatus.PARTIAL_SENT: return `Partial manuscript sent to ${at}`;
    case QueryStatus.FULL_REQUESTED: return `${at} requested the full manuscript`;
    case QueryStatus.FULL_SENT: return `Full manuscript sent to ${at}`;
    case QueryStatus.REVISE_RESUBMIT: return `Revise & Resubmit request received from ${at}`;
    case QueryStatus.OFFER: return `Offer of representation from ${at}`;
    case QueryStatus.REJECTED: return `Rejection received from ${at}`;
    case QueryStatus.WITHDRAWN: return `Withdrew query from ${at}`;
    case QueryStatus.NO_RESPONSE: return `No response received from ${at}`;
    default: return `${status} — ${at}`;
  }
}
