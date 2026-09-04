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
  /**
   * ⚠️ `Nudge them` IS A SIXTH DEED, AND v60 IS WHAT MADE IT REACHABLE.
   *
   * It is the move on a wait where the AGENCY's stated reply date has passed and nothing is
   * scheduled — the ref's Priya case. Until v60 the app filed that as a silence and offered
   * nothing: `journeyBars` says "the writer's own dates only — an agency's expected date that has
   * passed is a silence rather than a deadline", so the chip read `No Response` and the row sat in
   * a section nobody was asked to act on. v60 says both prompt (Law 9), so the state needs a deed,
   * and `Nudge due` is not it: that one is the writer's OWN reminder falling due, which is a
   * different fact with a different origin.
   */
  them: "Nudge them",
} as const;

/** Every string a pill may render — the lock reads this, never a hand-written copy of it. */
/**
 * ⚠️ THE GHOST-KIND MAP WENT WITH THE RING IT FED (v58).
 *
 * It mapped a deed to one of four glyphs the ref drew, and named the two moves — `full` and
 * `revision` — that had no glyph and therefore rendered nothing. That gap is closed rather than
 * inherited: a cap carries a WORD, so every move can be named, and there is no drawing to invent.
 */
/**
 * ⚠️ THE ACTION CAP'S WORD — the deed available AT the date a card ends on (v58).
 *
 * It is NOT the pill. The pill says where the relationship stands right now; the cap says what
 * becomes available on the day the bar reaches. On a row waiting for an agency they differ
 * completely — the pill reads "Queried" and the cap reads "Nudge", because the reply window is
 * when nudging becomes reasonable rather than when the query changes state.
 *
 * ⚠️ AND IT IS KEYED ON THE END'S OWN `source`, from `namedEndFor` — the derivation that CHOSE the
 * date. Deriving the word from the status instead would let the cap name a deed belonging to a
 * different date from the one it is standing on, which is the fault this file's ghost-kind map was
 * written to foreclose one surface earlier.
 */
export type CapKind = "window" | "sendBy" | "reminder";

export const capWord = (
  source: CapKind,
  deed: string,
  alreadyNudged: boolean,
): string => {
  if (source === "sendBy") return deed;
  /* an agency's own window: nudging becomes available when it passes */
  if (source === "window") return "Nudge";
  /* a reminder the writer set — "again" only once one has actually been sent */
  return alreadyNudged ? "Nudge again" : "Nudge";
};

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

/** the status, as the board words it — the chip's text whenever no deed is owed */
const statusWord = (status: QueryStatus): string => String(status);

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
/**
 * ⚠️ v58: THE CHIP GOES IMPERATIVE ONLY ONCE THE WRITER-OWED DATE HAS PASSED.
 *
 * A request the writer has until 3 October to answer is a STATUS — "Partial requested" — and only
 * becomes "Send the partial" when the third passes. Saying the deed while the date is still ahead
 * turns a standing arrangement into a reproach, which is the appraisal this app does not do; it
 * also leaves the board with nothing left to say when the date actually goes.
 *
 * `overdue` is the same flag the card wobbles on and the row draws its strip from, so the chip,
 * the wobble and the strip cannot disagree about whether a thing is late.
 */
export function pillText(
  status: QueryStatus,
  holder: "agent" | "writer",
  nudgeDue = false,
  overdue = true,
  /**
   * ⚠️ A LONG SILENCE SAYS SO (v58). The board's own silence rule — `barState`'s `quiet` and
   * `ghost` — is what decides this; the chip does not re-derive a threshold of its own.
   *
   * A relationship that has heard nothing for long enough is not "Queried" any more in any useful
   * sense: the status has not changed, but what the reader needs to know has. The ref gives it the
   * sand chip and the words "No response", which is a statement about the RECORD — nothing came
   * back — rather than a verdict on the agency.
   */
  /**
   * ⚠️ A LONG SILENCE SAYS SO (v58), AND v60 NARROWED WHAT COUNTS AS ONE.
   *
   * `barState` has always had two silences: `quiet` — a stated reply date passed, under the
   * long-silence threshold — and `ghost`, the same absence past 180 days. v58 treated both as
   * silent, so a wait five days past its estimate wore the same sand chip as one five hundred days
   * past it and neither offered a move. v60 splits them: `quiet` PROMPTS (see `estLate` below) and
   * only `ghost` is the silence this flag means. The board's own rule still decides; the chip does
   * not re-derive a threshold of its own.
   */
  silent = false,
  /**
   * The agency's stated reply date has passed on a wait that is still running — `barState`'s
   * `quiet`. Distinct from `silent`, which is the same absence gone long enough to stop being
   * work, and distinct from `overdue`, which is the WRITER's own date.
   */
  estLate = false,
): Pill {
  /* ⚠️ IT OUTRANKS THE SILENCE FLAG BECAUSE IT IS THE NARROWER CASE. A caller passing both would
     otherwise get the sand chip and no move, which is the v58 behaviour this replaces. */
  if (estLate) return { text: DEEDS.them, tone: "you" };
  /* ⚠️ THE APP'S OWN WORD, not a new string. `QueryStatus.NO_RESPONSE` is already in `PILL_WORDS`,
     which `calCard`'s lock checks every chip against; a hand-typed "No response" would have been a
     second spelling of one status and would have failed that lock for the right reason. The chip
     renders uppercase either way. */
  if (silent) return { text: QueryStatus.NO_RESPONSE, tone: "quiet" };
  /* ⚠️ THE DEEDS ARE FOR OVERDUE WORK ONLY. Where the writer holds a date still ahead, the status
     word is the honest one and the tone stays the writer's — whose move it is has not changed. */
  if (!overdue) {
    const tone: PillTone = nudgeDue ? "wait" : holder === "writer" ? "you" : "them";
    return { text: statusWord(status), tone };
  }
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
