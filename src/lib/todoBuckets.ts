/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoBuckets — the six buckets, the deed, and the figure column (visual rebuild, Phase 2;
 * ref design-refs/todo-workspace-v9.html).
 *
 * ⚠️ SIX BUCKETS BESIDE FOUR FAMILIES, AND THEY ANSWER DIFFERENT QUESTIONS. `todoFamily`'s
 * `liveFamily` answers "how urgent is this" — urgent · housekeeping · yours — which is what the
 * GROUPS and the chips are built on and what the counting law speaks. A bucket answers "what kind
 * of act is this": Send, Decide, Chase, Close, Fix, Note. One urgent card is a Send and another is
 * a Decide; both are urgent.
 *
 * ⚠️ SO THIS EXTENDS `todoFamily` RATHER THAN REPLACING IT, and `bucketFamily` states the tie: a
 * bucket always rolls up to exactly one family, and the mapping is here so the two can never drift
 * into disagreeing about which pile a card is in.
 *
 * ⚠️ THE DEED IS THE ACT ALONE — "Send your full", never "Send your full to Marcus Reed". The
 * agent moves to line two, so line one scans as a column of verbs. That is the whole reason the
 * card's own `title` is not reused here: it is a sentence, and a sentence is not a deed.
 */
import { BoardCard } from "./todoBoard";
import { BandFamily, liveFamily } from "./todoFamily";

export type Bucket = "send" | "decide" | "chase" | "close" | "fix" | "note";

export const BUCKET_ORDER: Bucket[] = ["send", "decide", "chase", "close", "fix", "note"];

/** Sentence case, as the ref draws them — `Send`, never `SEND`. The pill is small; caps at 8.5px
 *  with letter-spacing is a texture rather than a word. */
export const BUCKET_LABEL: Record<Bucket, string> = {
  send: "Send",
  decide: "Decide",
  chase: "Chase",
  close: "Close",
  fix: "Fix",
  note: "Note",
};

/**
 * ⚠️ EVERY CARD KIND LANDS IN EXACTLY ONE BUCKET, and the order of these branches is the order of
 * their certainty. A writer's own item is a Note whatever else it looks like; an offer or an R&R
 * is a Decide because the act is a judgement rather than a task; a requested material is a Send;
 * a silence is a Chase until it is old enough to Close; a gap in the record is a Fix.
 */
export function cardBucket(c: BoardCard): Bucket {
  if (c.userTaskId || c.nature || c.stream === "nt") return "note";
  switch (c.taskType) {
    case "offer_received":
    case "revise_resubmit":
      return "decide";
    case "partial_requested":
    case "full_requested":
      return "send";
    case "nudge_overdue":
      return "chase";
    case "no_response_close":
      return "close";
    default:
      /* ⚠️ THE DEFAULT IS `fix`, AND THAT IS A DECISION RATHER THAN A FALLBACK. Everything not
         named above is a housekeeping gap — a missing wish list, stale materials, an absent
         response time — and every one of them is answered by correcting the record. A bucket
         called "Other" would be a pill that tells the reader nothing. */
      return "fix";
  }
}

/**
 * ⚠️ THE TIE TO THE FAMILIES, STATED ONCE. A bucket rolls up to exactly one family, so the pill
 * and the group heading above it can never claim different piles. `liveFamily` remains the
 * authority for which GROUP a card is in; this is how a bucket agrees with it.
 */
export function bucketFamily(b: Bucket): Exclude<BandFamily, "done"> {
  if (b === "note") return "yours";
  if (b === "send" || b === "decide") return "urgent";
  return "housekeeping";
}

/**
 * ⚠️ ASSERTED, NOT ASSUMED: the bucket a card gets must roll up to the family it is filed under.
 * Exported so the lock reads the same predicate the app would, rather than restating it.
 */
export function bucketAgreesWithFamily(c: BoardCard): boolean {
  return bucketFamily(cardBucket(c)) === liveFamily(c);
}

/* ── line one: the deed ───────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE DEED IS DERIVED FROM THE TASK, NOT SLICED OUT OF THE TITLE. `card.title` is a composed
 * sentence ("Send your full to Bethany Carter"); cutting it at " to " would break the moment a
 * title was phrased differently, and silently. These are the acts themselves.
 *
 * A writer's own item keeps its own words — it is the one card whose text the writer wrote.
 */
export function rowDeed(c: BoardCard): string {
  if (c.userTaskId || c.nature || c.stream === "nt") return c.title;
  switch (c.taskType) {
    case "partial_requested": return "Send your partial";
    case "full_requested": return "Send your full";
    case "revise_resubmit": return "Send your revision";
    case "offer_received": return "Answer the offer";
    case "nudge_overdue": return "Chase your query";
    case "no_response_close": return "Log the close";
    default: return c.title;
  }
}

/* ── the figure column ────────────────────────────────────────────────────────────────────────── */

/** Whose move it is — the colour of the label, and nothing else. */
export type WaitSide = "you" | "them" | "neither";

export interface RowFigure {
  label: string;
  /** The numeral. Empty where the figure is a word (`Today`) or a date. */
  value: string;
  /** The unit after the numeral, in mono caps. Empty where there is no numeral. */
  unit: string;
  side: WaitSide;
  /** ⚠️ BURGUNDY, AND ONLY HERE. Past a stated window, or an offer's reply-by running. */
  hot: boolean;
}

/**
 * ⚠️ NAMES ENDING IN `s` STILL TAKE `'s`. "Marcus's waited" is the house form; "Marcus' waited"
 * reads as a typo to most readers and the app should not look uncertain about a name.
 */
export function possessive(first: string): string {
  return `${first}'s`;
}

/** First name only — the column is 104px and a full name would wrap to three lines. */
export function firstName(full?: string): string {
  return (full ?? "").trim().split(/\s+/)[0] ?? "";
}

const DAY = 86400000;

/**
 * ⚠️ THE UNIT IS THE AGENT'S OWN WHERE THEY STATE ONE. An agency quoting twelve weeks gets weeks,
 * because a writer comparing "84 days" against a stated "12 weeks" has to do the arithmetic the
 * app already did.
 *
 * ⚠️ AND THE ONLY UNIT AN AGENT CAN STATE IS WEEKS. `Agent.responseTimeWeeks` is a NUMBER whose
 * unit is baked into the field name — there is no unit field — so "the same unit they state it in"
 * has exactly two outcomes here: weeks when they state a window, days when they do not. Recorded
 * because the rule as written implies a choice the record cannot express, and a future unit field
 * is the one thing that would widen it.
 */
export function elapsedFigure(days: number, statedWeeks?: number): { value: string; unit: string } {
  /* ⚠️ UNDER TWO DAYS READS AS A WORD, and the caller renders it at the numeral's size so the
     column still aligns. "1 DAY" is a figure nobody needs; "Yesterday" is the fact. */
  if (days <= 0) return { value: "Today", unit: "" };
  if (days === 1) return { value: "Yesterday", unit: "" };
  if (statedWeeks && statedWeeks > 0) {
    const w = Math.floor(days / 7);
    return { value: String(w), unit: w === 1 ? "week" : "weeks" };
  }
  return { value: String(days), unit: days === 1 ? "day" : "days" };
}

export interface FigureInput {
  card: BoardCard;
  /** The agent's stated window, where the record carries one. */
  statedWeeks?: number;
  /** Whose move — the CTA engine's answer, passed in rather than re-derived. */
  ballHolder?: "agent" | "writer" | null;
  /** Days since the thing the figure counts from. */
  elapsedDays?: number;
  /** An offer's remaining days, where one is running. */
  replyWithinDays?: number;
  /** A snoozed card's return date, already formatted. */
  backOn?: string;
}

/**
 * ⚠️ THE LABEL SAYS WHOSE WAIT IT IS, AND THE COLOUR SAYS THE SAME THING — one fact in two
 * registers, never two facts. `side` drives the colour and the wording comes from the same branch.
 *
 * ⚠️ BURGUNDY IS RARE BY CONSTRUCTION. `hot` is true in exactly two cases: an elapsed figure past
 * a stated window, and an offer's reply-by running. It is not reachable from any other branch, so
 * the page cannot drift into a column of red numerals.
 */
export function rowFigure(input: FigureInput): RowFigure {
  const { card, statedWeeks, ballHolder, elapsedDays = 0, replyWithinDays, backOn } = input;

  if (backOn) return { label: "Back on", value: backOn, unit: "", side: "neither", hot: false };

  if (typeof replyWithinDays === "number") {
    return {
      label: "Reply within",
      ...elapsedFigure(replyWithinDays, undefined),
      side: "you",
      hot: true, // a running reply-by is one of the two cases burgundy exists for
    };
  }

  const first = firstName(card.who);
  const past = !!statedWeeks && statedWeeks > 0 && elapsedDays > statedWeeks * 7;

  if (!card.agentId && !card.who) {
    /* no agent at all — the writer's own items and the housekeeping that has no agency behind it */
    return { label: card.userTaskId || card.nature ? "Added" : "Noticed", ...elapsedFigure(elapsedDays, statedWeeks), side: "neither", hot: false };
  }

  if (ballHolder === "writer") {
    /* the agent is waiting on the writer */
    return {
      label: first ? `${possessive(first)} waited` : "They've waited",
      ...elapsedFigure(elapsedDays, statedWeeks),
      side: "you",
      hot: past,
    };
  }

  return {
    label: "You've waited",
    ...elapsedFigure(elapsedDays, statedWeeks),
    side: "them",
    hot: past,
  };
}

/** Days between two instants, floored — the one arithmetic every caller shares. */
export function daysSince(fromMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - fromMs) / DAY));
}
