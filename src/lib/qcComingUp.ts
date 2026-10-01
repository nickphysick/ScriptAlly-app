/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcComingUp — §3's "Coming up" column: the one line that says what is next on a query, and the
 * tray's primary verb, which is the same act in the imperative.
 *
 * ⚠️ IT WRITES NO DERIVATION. The act comes from the To-do list's own: a query reaches its board
 * card by `relatedRecordId`, the card's bucket is `cardBucket` (`lib/todoBuckets.ts`), and that
 * bucket is what this file turns into words. A second rule for "what is next on this query" is
 * exactly how a row and a to-do come to disagree, which is the fault §3 names.
 *
 * ⚠️ THE *WORDS* ARE THIS COLUMN'S, AND THAT IS NOT THE SAME COMPROMISE. The To-do list says
 * "Send your full manuscript" (`taskDeed`); the column is 160px of 13.5px typewriter and cannot
 * hold it. So the BUCKET is shared and the strings are shortened here, in one table, and the lock
 * reconciles the two **by bucket** rather than by string — which is the stronger claim in any case:
 * a string comparison passes on two surfaces that agree about words while disagreeing about which
 * query needs what, and the bucket is the thing that must not disagree.
 *
 * ⚠️ AND A QUERY WITH NO BOARD CARD HAS NOTHING COMING UP. A task can be snoozed, dismissed or
 * muted by a `taskFlag`, and a query sitting inside its agency's window raises none at all — so
 * `comingUp` returns null and the column is empty. Inventing a line there would be the app telling
 * a writer to do something nobody asked of them.
 */
import { cardBucket, type Bucket } from "./todoBuckets";
import type { BoardCard } from "./todoBoard";
import { elapsedPhrase } from "./elapsed";
import type { QcRow } from "./qcSummary";

const DAY = 86_400_000;

/**
 * The column's verb per bucket — the shortened form of `taskDeed`'s sentence for the same act.
 *
 * ⚠️ `send` IS A PAIR, because a partial and a full are different things to send and the column has
 * room to say which. Every other bucket is one act.
 */
export const COMING_VERB: Record<Exclude<Bucket, "send" | "note">, string> = {
  decide: "Decide on offer",
  chase: "Nudge",
  close: "Consider closing",
  /* ⚠️ "Record what you sent", NOT `taskDeed`'s "Fill in what you sent": measured, the deed is 21
     characters of 13.5px typewriter — about 164px in a 160px column — so it ellipsised on every
     row that had one. Same act, same bucket, the app's own verb for it (`recordMaterialsSent`). */
  fix: "Record what you sent",
};
export const SEND_VERB = { partial: "Send partial", full: "Send full" } as const;

/** The tray's primary, the same act in the imperative — "Log the send", not "Send full". */
export const COMING_ACTION: Record<Exclude<Bucket, "note">, string> = {
  send: "Log the send",
  decide: "Decide on the offer",
  chase: "Nudge now",
  close: "Close it",
  fix: "Fill it in",
};

export interface ComingUp {
  /** which act — shared with the To-do list, and what a lock reconciles on */
  bucket: Exclude<Bucket, "note">;
  /** the line's verb, e.g. "Send full" */
  verb: string;
  /**
   * The timing, already written. `lead` sits outside the emphasis and `figure` inside it, so the
   * NUMBER is what takes the rust — "Send full **in** `7 days`". Null where the act has no date.
   */
  tail: { lead: string; figure: string } | null;
  /** past its date: an ink dot before the verb, and the figure in ink rather than rust */
  over: boolean;
  /** the tray's primary label */
  action: string;
}

/**
 * ⚠️ THE DATE IS THE QUERY'S OWN EXPECTED DATE, not the card's due chip. `row.expectedMs` is what
 * the desk, the rail and the expanded view all count from; a second date here would put two
 * answers to "when" three inches apart on one page.
 */
export function comingUp(card: BoardCard | undefined | null, row: QcRow, nowMs: number): ComingUp | null {
  if (!card) return null;
  const b = cardBucket(card);
  if (b === "note") return null;
  const verb = b === "send"
    ? (card.taskType === "partial_requested" ? SEND_VERB.partial : SEND_VERB.full)
    : COMING_VERB[b];

  /**
   * ⚠️ ONLY A SEND AND A NUDGE CARRY A COUNTDOWN, which is the reference's own split and not a
   * length compromise: those two are things you DO by a date. A close is a judgement, an offer
   * wants an answer rather than a countdown to one, and an unrecorded send has no deadline at all —
   * the reference draws all three bare, and a countdown on a judgement reads as a deadline nobody
   * set. It also keeps the line inside a 160px column: "Decide on offer in 2 weeks" is 26
   * characters of typewriter and ellipsised on the page.
   */
  const counts = b === "send" || b === "chase";
  const dated = counts && row.expectedMs != null;
  const days = dated ? Math.round((row.expectedMs! - nowMs) / DAY) : 0;
  /* ⚠️ AN OFFER INSIDE ITS DEADLINE IS NOT OVERDUE. The reference's one offer is drawn with the ink
     dot, which is true of ITS example and not of the state: a decision due in a fortnight has not
     gone past anything. A close always is — `no_response_close` is raised only once the window has
     long gone. */
  const over = b === "close" || (row.expectedMs != null && row.expectedMs < nowMs);
  const tail = !dated ? null
    : days >= 0
      ? { lead: "in", figure: elapsedPhrase(days) }
      : { lead: "", figure: `${elapsedPhrase(-days)} over` };

  return { bucket: b, verb, tail, over, action: COMING_ACTION[b] };
}

/**
 * Index the board's cards by the query they belong to.
 *
 * ⚠️ `relatedRecordId`, THE SAME KEY `queryTaskBadge` USES on this page, so the row's verb and the
 * page's own task count cannot be looking at different cards. First card wins: the board has
 * already collapsed an agent's cards for one manuscript into one piece of work, and taking a later
 * one would reverse that decision quietly.
 */
export function cardsByQuery(cards: readonly BoardCard[]): Map<string, BoardCard> {
  const out = new Map<string, BoardCard>();
  for (const c of cards) {
    const id = c.relatedRecordId;
    if (!id || out.has(id)) continue;
    out.set(id, c);
  }
  return out;
}
