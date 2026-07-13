/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskPrecedence — the ONE decision for what a waiting query owes the writer: nudge, close, or
 * nothing. Extracted pure so the state matrix is unit-provable (the db.tsx generator, the dashboard
 * "Over to you" box and the Queries Hub all read the SAME predicate — they must not contradict).
 *
 * The model (owner-specified redesign, not a patch):
 *   · No reply window recorded → NEITHER fires. The data_quality_poor "set a reply window" item
 *     fires instead (generated elsewhere) — it's the thing that unblocks this decision.
 *   · noResponseMeansNo === true → NEVER nudge (silence is a stated pass). Past window + grace → close.
 *   · noResponseMeansNo === false → past window + grace → nudge. Close SUCCEEDS the nudge — it fires
 *     only once the nudge is ignored (a sent nudge + another full window) OR the hard ceiling is hit
 *     (CLOSE_AFTER since the original send, so a never-nudged query still eventually closes).
 * Close never COMPETES with nudge — checked first, so exactly one of {nudge, close, none} is returned.
 *
 * The two constants are judgement calls, not physics — tune them here, never inline in a predicate.
 */

import { QueryStatus } from "../types";

/** Days past the reply deadline before a nudge/close is even suggested. */
export const NUDGE_GRACE_DAYS = 14;

/** How long after the ORIGINAL send a query becomes a close candidate regardless of nudging. */
export function closeAfterDays(windowWeeks: number): number {
  return Math.max(2 * windowWeeks * 7, 90);
}

const DAY = 86400000;

export type ReplyTask = "nudge" | "close" | "none";

export interface ReplyTaskInput {
  status: QueryStatus;
  dateSent?: string; // ISO
  responseDeadline?: string; // ISO — stored; else computed from dateSent + window
  responseTimeWeeks?: number; // the reply window; 0/undefined = no window recorded
  noResponseMeansNo: boolean;
  lastNudgeSentDate?: string; // ISO — when a nudge was actually sent (drives the progression)
  now: number;
}

const ms = (iso?: string): number => (iso ? new Date(iso).getTime() : NaN);

export function replyTask(inp: ReplyTaskInput): ReplyTask {
  const { status, noResponseMeansNo, responseTimeWeeks, now } = inp;

  // Only the agent's-court statuses have a reply to chase.
  const awaiting = status === QueryStatus.QUERIED || status === QueryStatus.PARTIAL_SENT || status === QueryStatus.FULL_SENT;
  if (!awaiting) return "none";

  // No reply window recorded → neither fires (data_quality_poor "set a window" does instead).
  if (!responseTimeWeeks || responseTimeWeeks <= 0) return "none";

  const sentMs = ms(inp.dateSent);
  const storedDeadline = ms(inp.responseDeadline);
  const deadlineMs = Number.isNaN(storedDeadline)
    ? Number.isNaN(sentMs) ? NaN : sentMs + responseTimeWeeks * 7 * DAY
    : storedDeadline;
  if (Number.isNaN(deadlineMs)) return "none"; // undated import — can't place it in time

  if (now < deadlineMs + NUDGE_GRACE_DAYS * DAY) return "none"; // still inside window + grace

  if (noResponseMeansNo) return "close"; // stated pass — never nudge

  // noResponseMeansNo === false: nudge, unless the nudge was ignored or the hard ceiling is hit.
  const nudgeMs = ms(inp.lastNudgeSentDate);
  const nudgeIgnored = !Number.isNaN(nudgeMs) && now >= nudgeMs + responseTimeWeeks * 7 * DAY;
  const ceilingHit = !Number.isNaN(sentMs) && now >= sentMs + closeAfterDays(responseTimeWeeks) * DAY;
  return nudgeIgnored || ceilingHit ? "close" : "nudge";
}
