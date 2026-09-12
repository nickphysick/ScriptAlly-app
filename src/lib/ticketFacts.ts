/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TICKET'S TWO FACT CELLS — the ref's `dueBlock`, one shape per category (QC-chassis round,
 * Phase 3; ref `todo-qc-style.html`).
 *
 * ⚠️ THE LABELS ARE THE POINT, NOT THE FIGURES. Every category shows a date and an elapsed span,
 * and a single pair of labels for all five would make them read as the same fact — "Asked on 2
 * April · 7 weeks waiting" and "Quiet since March 2024 · 2½ years" are different claims about
 * different clocks, and only the label says which. The ref draws six label pairs; this is that
 * table, keyed on `cardBucket`'s six and exhaustive over them, so a seventh bucket cannot arrive
 * unlabelled.
 *
 * ⚠️ AND AN ABSENT DATE IS AN EM DASH, NEVER A ZERO OR TODAY. `waitAnchorMs` returns nothing for a
 * request whose date was never recorded — that is UNKNOWN, and the app has a standing rule against
 * stating a figure nobody supplied. The `late` flag follows the same line: it marks a clock the
 * writer is answerable to, so it is only ever set where there IS a clock.
 */
import { BoardCard } from "./todoBoard";
import { isUrgentCard, taskCategory, type Category } from "./todoCategory";
import { Bucket, cardBucket } from "./todoBuckets";

export interface TicketFacts {
  dateKey: string;
  dateValue: string;
  spanKey: string;
  spanValue: string;
  late?: boolean;
}

/**
 * ⚠️ THE LABELS KEY ON THE BUCKET, NOT THE CATEGORY — and keying them on the category was wrong in
 * a way the rendered page said out loud. Agent requests hold BOTH a partial request and an offer,
 * so a per-category table gave an offer "Asked on", which is a claim about a thing nobody asked
 * for. The category says where the work came from; the BUCKET says what kind of act it is, and the
 * clock belongs to the act. The ref keys its own `dueBlock` the same way, on its six `p` values.
 *
 * ⚠️ AND IT IS `cardBucket`'s SIX, REUSED. A table of my own over the same six would be a second
 * derivation of "what kind of act is this" — the thing `taskCategory` is careful not to do.
 */
const LABELS: Record<Bucket, { date: string; span: string }> = {
  send: { date: "Asked on", span: "Waiting" },
  /* an offer or an R&R: the ball is with the writer, and the date is when it arrived */
  decide: { date: "Came in", span: "Since then" },
  chase: { date: "Their window closed", span: "Past it" },
  close: { date: "Quiet since", span: "That’s" },
  fix: { date: "Noticed", span: "Age" },
  note: { date: "Added", span: "Age" },
};

export const EM_DASH = "—";

/**
 * ⚠️ THE FIGURES COME FROM THE ROW'S OWN INPUTS, never from a second derivation. `days` and the
 * date are what the list cells and the sort already read (`listRowInputs`), so a ticket and its
 * row cannot state different numbers for one task — which is the whole reason this takes them as
 * arguments rather than reaching for `waitAnchorMs` itself.
 */
export function ticketFacts(
  card: BoardCard,
  inputs: { days?: number | null; dateLabel?: string | null; elapsed?: string | null },
): TicketFacts {
  const l = LABELS[cardBucket(card)];
  return {
    dateKey: l.date,
    dateValue: inputs.dateLabel || EM_DASH,
    spanKey: l.span,
    spanValue: inputs.elapsed || EM_DASH,
    /* ⚠️ BURGUNDY IS THE URGENT LENS, ASKED RATHER THAN RESTATED. A send whose clock is running
       is the one case where the ball is in the writer's court and the delay is theirs to answer;
       a silence that has run two years is a fact about the agency, not a debt the writer is behind
       on, and painting it burgundy would tell them off for someone else's inaction.

       It calls `isUrgentCard` instead of repeating its test, so the ticket's burgundy figure and
       the Urgent tile can never come to disagree about which cards those are — which they would,
       the first time either definition moved. */
    late: isUrgentCard(card, inputs.days),
  };
}

/**
 * THE CARD'S VERB — what the card leads to, in the contract's own words
 * (`design-refs/todo-list-and-card.html`, the `.go` button; list round, Phase 4).
 *
 * ⚠️ KEYED ON THE CATEGORY, NOT THE BUCKET, because that is how the contract prints it: BOTH of its
 * Gone quiet cards read "Decide" — the one that is a close and the one that is a silence after a
 * nudge — where a bucket table would have said "Close it" for one and "Log a nudge" for the other.
 * The one split inside a category is `req`, which holds a request (send) beside an offer or an R&R
 * (decide), and the contract gives those two different words.
 *
 * ⚠️ AND IT IS A LABEL, NOT A CONTROL. The card is the button; this names where pressing it goes, so
 * the word must describe the journey that opens rather than promise a write.
 */
export function ticketVerb(card: BoardCard): string {
  const cat: Category = taskCategory(card);
  switch (cat) {
    case "req": return cardBucket(card) === "send" ? "Mark sent" : "Decide";
    case "nudge": return "Log a nudge";
    case "quiet": return "Decide";
    case "house": return "Fill it in";
    case "yours": return "Tick it off";
    default: { const unhandled: never = cat; return unhandled; }
  }
}

/** the contract's own line beneath "Your own note" — what finishes a writer's own item */
export const OWN_NOTE_LINE = "Ticking it off is what finishes it";
