/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskPrecedence — the ONE decision for what a waiting query owes the writer: nudge, close, or
 * nothing. Extracted pure so the state matrix is unit-provable (the db.tsx generator, the dashboard
 * urgent task panel and the Queries Hub all read the SAME predicate — they must not contradict).
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
  /**
   * ⚠️ THE WRITER'S OWN REMINDER (reminder round, Phase 2) — `Query.nudgeDate`, the date they asked
   * to be reminded on. It is NOT `reminderScheduled`, which is a different thing pointing the other
   * way: that says a chase has already been BOOKED AS A TASK and suppresses the suggestion. This is
   * a stored date that RAISES one when it arrives.
   */
  writerNudgeDate?: string;
  lastNudgeSentDate?: string; // ISO — when a nudge was actually sent (drives the progression)
  /**
   * §3 (policy pack) — a FUTURE nudge reminder the writer has scheduled on this query.
   *
   * ⚠️ IT SUPERSEDES BOTH ANSWERS, AND THAT IS A STATEMENT ABOUT THE WRITER, NOT THE DATES. A
   * writer who has set a reminder to chase has decided not to close; suggesting closure beside
   * their own scheduled nudge second-guesses a decision they have already made and recorded.
   *
   * ⚠️ AND IT LIVES HERE RATHER THAN AT EACH DISPLAY SITE. This function is the one place the app
   * decides what a waiting query needs next; filtering the answer out at the tasks popover, the
   * to-do list and the tracker's offer would be three chances for two of them to disagree.
   */
  reminderScheduled?: boolean;
  /**
   * ⚠️ PHASE 5 (D6) · WHEN THE AGENT LAST GOT IN TOUCH WITHOUT DECIDING ANYTHING.
   *
   * It clears the CLOSE suggestion and nothing else. "No response for two years — consider
   * closing?" beside a reply from last week is the app failing to notice what the writer just
   * recorded; the agent has engaged, so the inference closure rests on no longer holds.
   *
   * ⚠️ IT DOES NOT SUPPRESS THE NUDGE, AND THAT IS DELIBERATE. Chasing an agent who acknowledged
   * you a month ago and then went quiet again is a perfectly reasonable thing to want, and the
   * grace arithmetic below already re-bases on it. A reply ends the case for CLOSING, not the case
   * for asking again.
   */
  repliedSinceMs?: number | null;
  now: number;
}

const ms = (iso?: string): number => (iso ? new Date(iso).getTime() : NaN);

/**
 * ══ THE ONE DEADLINE — extracted so nothing computes it twice ═════════════════════════════════
 *
 * `NaN` when there is nothing to place in time: a status with no reply owed, an agent with no
 * stated window, or an undated import with no stored override. Each of those is a genuine absence
 * and none of them gets a default — a guessed window would put a query in a chase list on the
 * strength of a number nobody typed.
 *
 * ⚠️ IT IS EXPORTED BECAUSE THE LIST'S FIGURE READS IT TOO. Query Centre's rows count down to this
 * instant and up from it; if that countdown came from the STAGE windows (8/12/12 weeks) while the
 * OVERDUE group came from here, a row could sit under OVERDUE reading "27 DAYS LEFT" — two clocks,
 * both defensible, contradicting each other three pixels apart.
 */
export function replyDeadlineMs(inp: ReplyTaskInput): number {
  const { status, responseTimeWeeks } = inp;
  const awaiting = status === QueryStatus.QUERIED || status === QueryStatus.PARTIAL_SENT || status === QueryStatus.FULL_SENT;
  if (!awaiting) return NaN;
  if (!responseTimeWeeks || responseTimeWeeks <= 0) return NaN;
  const stored = ms(inp.responseDeadline);
  if (!Number.isNaN(stored)) return stored;
  const sentMs = ms(inp.dateSent);
  return Number.isNaN(sentMs) ? NaN : sentMs + responseTimeWeeks * 7 * DAY;
}

/**
 * ══ PAST THE AGENT'S STATED WINDOW, WITH NO REPLY ═════════════════════════════════════════════
 *
 * Query Centre §5's OVERDUE group. Reads `replyDeadlineMs`, so it cannot disagree with `replyTask`
 * about WHEN a query lapsed — only about what to do next.
 *
 * ⚠️ THIS IS DELIBERATELY WIDER THAN `replyTask !== "none"`, AND THE 14-DAY GRACE IS THE
 * DIFFERENCE. The grace exists so the APP does not nag on day one; it is not a claim that the query
 * is still inside its window. A list whose job is "who do I chase" must show a query the moment it
 * is late, and the row's own figure turns burgundy at the same instant — one boundary, not two.
 *
 * ⚠️ AND NUDGE IS NARROWER STILL (`replyTask === "nudge"`). Every nudgeable query is overdue; not
 * every overdue one may be chased — an agency whose silence IS its answer (`noResponseMeansNo`)
 * belongs in the group and must never be nudged. Three predicates, one deadline, no second clock.
 */
export function replyOverdue(inp: ReplyTaskInput): boolean {
  const deadline = replyDeadlineMs(inp);
  return !Number.isNaN(deadline) && inp.now >= deadline;
}

export function replyTask(inp: ReplyTaskInput): ReplyTask {
  const { noResponseMeansNo, responseTimeWeeks, now } = inp;

  /* ⚠️ §3 · ONE SUGGESTION AT A TIME, AND THE SCHEDULED NUDGE WINS. Checked before anything else,
     because none of the arithmetic below can produce an answer worth showing beside a chase the
     writer has already booked. Derived every time, never stored: completing or deleting the
     reminder removes it from the store the caller reads, and the close suggestion may then
     legitimately appear. */
  if (inp.reminderScheduled) return "none";

  const deadlineMs = replyDeadlineMs(inp);
  // Not an awaiting status, no window recorded, or undated — nothing to place in time.
  if (Number.isNaN(deadlineMs)) return "none";

  /**
   * ⚠️ THE WRITER'S OWN REMINDER IS CHECKED BEFORE THE WINDOW, AND THAT IS THE WHOLE POINT
   * (reminder round, Phase 2). A reminder exists precisely to fire EARLIER than the agency's stated
   * window — "chase them a week before the six weeks are up" — so consulting it after the
   * still-inside-the-window return meant it could never fire at all. Measured: a reminder a day
   * past its date against a 52-week window returned "none".
   *
   * ⚠️ IT RAISES THE SAME NUDGE, not a new kind. A third route into a decision this function
   * already makes, so the deed, the pill, the bucket and the group are the nudge derivation's own —
   * and it counts once because there is still exactly one push site downstream.
   *
   * ⚠️ AND IT MUST NOT FIRE INTO A WORLD THAT HAS MOVED ON. Three cancellations, each a fact already
   * in hand: a REPLY since the reminder date, a SEND since, or a CHASE already sent since. A writer
   * who has acted has answered the reminder by doing the thing. A status that is no longer the
   * agent's turn returned "none" above, at the `NaN`.
   */
  const nudgeDueMs = ms(inp.writerNudgeDate);
  if (!Number.isNaN(nudgeDueMs) && now >= nudgeDueMs) {
    const sentAt = ms(inp.dateSent);
    const chasedAt = ms(inp.lastNudgeSentDate);
    const moved = (inp.repliedSinceMs != null && inp.repliedSinceMs > nudgeDueMs)
      || (!Number.isNaN(sentAt) && sentAt > nudgeDueMs)
      || (!Number.isNaN(chasedAt) && chasedAt > nudgeDueMs);
    if (!moved) return "nudge";
  }

  if (now < deadlineMs + NUDGE_GRACE_DAYS * DAY) return "none"; // still inside window + grace

  const sentMs = ms(inp.dateSent);

  /* ⚠️ PHASE 5 (D6) · A REPLY SINCE THE WINDOW EXPIRED ENDS THE CASE FOR CLOSING. Computed once
     here and applied to BOTH close routes below, so the stated-pass branch cannot reach past a
     reply either: `noResponseMeansNo` says what SILENCE means, and this is not silence. */
  const repliedSince = inp.repliedSinceMs != null && inp.repliedSinceMs > deadlineMs;

  if (noResponseMeansNo) return repliedSince ? "none" : "close"; // stated pass — never nudge

  // noResponseMeansNo === false: nudge, unless the nudge was ignored or the hard ceiling is hit.
  const nudgeMs = ms(inp.lastNudgeSentDate);
  const nudgeIgnored = !Number.isNaN(nudgeMs) && now >= nudgeMs + responseTimeWeeks * 7 * DAY;
  const ceilingHit = !Number.isNaN(sentMs) && now >= sentMs + closeAfterDays(responseTimeWeeks) * DAY;
  /* ⚠️ THE NUDGE SURVIVES A REPLY, THE CLOSE DOES NOT (D6). Chasing an agent who acknowledged you
     a month ago and then went quiet again is reasonable; closing on the strength of a silence that
     demonstrably ended is not. */
  if (nudgeIgnored || ceilingHit) return repliedSince ? "nudge" : "close";
  return "nudge";
}

/**
 * The adapter every UI caller uses: a query and its agent in, the decision out.
 *
 * ⚠️ THE INPUT ASSEMBLY IS THE SECOND PLACE THIS COULD DRIFT, and it is the one nobody watches.
 * Two callers each spreading a `ReplyTaskInput` by hand read the same predicate and can still
 * disagree — one forgets `responseDeadline`, another passes the query's own window instead of the
 * agent's — and the result is two surfaces citing one rule and giving two answers. The window and
 * the stated-pass flag belong to the AGENT; the dates belong to the QUERY; that split is stated
 * once, here.
 *
 * ⚠️ NO AGENT MEANS NO DECISION. An unresolved agent has no stated window, which is "none" for the
 * same reason an unstated one is — never a default window, which would invent a deadline.
 */
export function replyTaskFor(
  query: { status: QueryStatus; dateSent?: string; responseDeadline?: string; lastNudgeSentDate?: string; nudgeDate?: string },
  agent: { responseTimeWeeks?: number; noResponseMeansNo?: boolean } | null | undefined,
  now: number,
  /* §3 — a future reminder on this query, from the caller's own task store. Optional so the
     existing call sites keep their exact behaviour; the feed that builds the suggestion passes it. */
  reminderScheduled?: boolean,
): ReplyTask {
  if (!agent) return "none";
  return replyTask({
    reminderScheduled,
    status: query.status,
    dateSent: query.dateSent,
    responseDeadline: query.responseDeadline,
    responseTimeWeeks: agent.responseTimeWeeks,
    noResponseMeansNo: !!agent.noResponseMeansNo,
    lastNudgeSentDate: query.lastNudgeSentDate,
    /* the writer's own reminder, from the field it is stored in — one name, one place */
    writerNudgeDate: query.nudgeDate,
    now,
  });
}
