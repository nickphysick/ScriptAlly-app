/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHAT A CARD'S PILL SAYS (v39, Phase 2).
 *
 * ⚠️ THE VOCABULARY IS THE APP'S OWN, AND THAT IS THE WHOLE POINT OF THIS FILE.
 *
 * The board had been inventing words for states the app already names. It drew `Quiet`, `With
 * you`, `Waiting to hear`, `Offer received`, `Revise and resubmit`, `Closed`, and four
 * abbreviations — `Full req`, `Partial req`, `R&R`, `Offer`. Not one is a `QueryStatus`. A reader
 * who learns "Full req" on the calendar and then looks for it anywhere else in the app finds
 * nothing, and a reader who learns "Closed" is learning a state that does not exist: the three
 * closed statuses are Rejected, Withdrawn and No Response, and they mean different things.
 *
 * THE RULE: the pill shows the STATUS while the agency holds the move, and the DEED while the
 * writer does. Nothing else is permitted, and `pillText` is the only thing that decides.
 *
 * ⚠️ THE SWITCH IS EXHAUSTIVE, closed with the house `never` idiom, so a new `QueryStatus` fails
 * to COMPILE rather than reaching a default that invents a word for it. A default branch here
 * would be the same fault one level up: the board guessing at a state it has not been told about.
 */
import { QueryStatus } from "../types";

export type PillTone = "you" | "them" | "wait" | "quiet" | "closed";

export interface Pill {
  /** exactly a `QueryStatus` value, or one of `DEEDS` — nothing else is reachable */
  text: string;
  tone: PillTone;
}

/**
 * The four deeds, and they are the writer's own move stated as an instruction.
 *
 * ⚠️ `Send the revision` IS A FIFTH AND THE BRIEF NAMES FOUR. Revise & Resubmit is a writer-held
 * status and it needs a deed; without one it would fall through to a default, which this file does
 * not have. Flagged rather than resolved by silently reusing `Send the full`, which is a different
 * thing to send.
 *
 * ⚠️ IT IS `Answer them`, WHICH IS THE APP'S OWN WORDING. Part one flagged the disagreement — the
 * brief said "Answer the offer" and `timelineCopy`'s row note said "Answer them" — and the ruling
 * is that the app wins: two surfaces stating one deed in two wordings is the fault, and the row
 * note had it first.
 */
export const DEEDS = {
  partial: "Send the partial",
  full: "Send the full",
  revision: "Send the revision",
  offer: "Answer them",
  nudge: "Nudge due",
} as const;

/** Every string a pill may render — the lock reads this, never a hand-written copy of it. */
/**
 * ⚠️ THE FOUR GHOST GLYPHS THE REF DRAWS, AND THE TWO MOVES THAT HAVE NONE.
 *
 * `design-refs/timeline-v55.html` carries exactly four in its `GL` table — `nudge`, `half`,
 * `answer`, `close` — and its `MK` history table carries the same four. There is no full-disc
 * glyph and no revision glyph anywhere in it.
 *
 * So `DEEDS.full` and `DEEDS.revision` are DELIBERATELY ABSENT from this map, and a row whose next
 * move is one of them renders no ghost. The pack names a "full disc (full to send)" and the ref
 * does not draw one; the ref wins on anything visual, and inventing an SVG for a mark nobody has
 * drawn is how a design acquires a shape its author never chose. `revision` is named by neither.
 * Both are reported with their row counts rather than guessed at — see reports/calendar-v56.md.
 *
 * ⚠️ AND THE MAP IS KEYED ON THE DEED THE PILL ALREADY CHOSE, never on a status re-read here. The
 * pill and the ghost must name the same move — a ring saying "nudge" beside a pill saying "send
 * the partial" is two derivations disagreeing in the space of one card.
 */
export type GhostKind = "nudge" | "half" | "answer" | "close";

const GHOST_BY_DEED: Readonly<Record<string, GhostKind>> = {
  [DEEDS.nudge]: "nudge",
  [DEEDS.partial]: "half",
  [DEEDS.offer]: "answer",
};

/** the glyph for a pill's move, or `null` where the ref draws none */
export const ghostKindFor = (pillText: string): GhostKind | null =>
  GHOST_BY_DEED[pillText] ?? null;

/** the moves that are real and have no glyph — the flag, expressed as data so a lock can count it */
export const UNDRAWN_MOVES: readonly string[] = [DEEDS.full, DEEDS.revision];

export const PILL_WORDS: readonly string[] = [
  ...Object.values(QueryStatus),
  ...Object.values(DEEDS),
];

/**
 * @param status the query's own status
 * @param holder who the board says holds the move
 * @param nudgeDue a reminder has fallen due — a deed that comes from a DATE rather than a status,
 *   which is why it is a parameter and not another branch of the switch
 */
export function pillText(
  status: QueryStatus,
  holder: "agent" | "writer",
  nudgeDue = false,
): Pill {
  /* ⚠️ THE NUDGE OUTRANKS THE STATUS, and only while the agency holds the move. A query out with
     an agency whose reminder has come round is still `Queried` — the status has not changed and
     saying it has would be a lie — but what the reader can DO about it has. Where the writer
     already owes something, that debt is the more pressing statement and the nudge waits. */
  if (nudgeDue && holder === "agent") return { text: DEEDS.nudge, tone: "wait" };

  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED:
      return holder === "writer"
        ? { text: DEEDS.partial, tone: "you" }
        : { text: QueryStatus.PARTIAL_REQUESTED, tone: "them" };
    case QueryStatus.FULL_REQUESTED:
      return holder === "writer"
        ? { text: DEEDS.full, tone: "you" }
        : { text: QueryStatus.FULL_REQUESTED, tone: "them" };
    case QueryStatus.REVISE_RESUBMIT:
      return holder === "writer"
        ? { text: DEEDS.revision, tone: "you" }
        : { text: QueryStatus.REVISE_RESUBMIT, tone: "them" };
    case QueryStatus.OFFER:
      return holder === "writer"
        ? { text: DEEDS.offer, tone: "you" }
        : { text: QueryStatus.OFFER, tone: "them" };

    /* ⚠️ THESE FOUR ARE NEVER THE WRITER'S MOVE, and the board must not claim otherwise. A query
       you have sent, a partial you have sent, a full you have sent — the agency holds all of them
       by definition, so there is no deed to state and the status is the whole truth. */
    case QueryStatus.QUERIED:      return { text: QueryStatus.QUERIED, tone: "them" };
    case QueryStatus.PARTIAL_SENT: return { text: QueryStatus.PARTIAL_SENT, tone: "them" };
    case QueryStatus.FULL_SENT:    return { text: QueryStatus.FULL_SENT, tone: "them" };

    /* ⚠️ THE THREE CLOSED STATUSES KEEP THEIR OWN NAMES. The board used to draw all three as
       `Closed`, which is not a status and flattens three different endings into one word: an
       agency that said no, a query the writer withdrew, and a silence that ran out. */
    case QueryStatus.REJECTED:    return { text: QueryStatus.REJECTED, tone: "closed" };
    case QueryStatus.WITHDRAWN:   return { text: QueryStatus.WITHDRAWN, tone: "closed" };
    case QueryStatus.NO_RESPONSE: return { text: QueryStatus.NO_RESPONSE, tone: "quiet" };

    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}
