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

/**
 * ⚠️ ONE STRING, TWO PRODUCERS, ONE FILTER. "Added" is emitted here (a card with no agent, whose
 * only date is its own creation) and by `anchorNoun`'s note case — and `trackingStats` drops it
 * from any card that HAS an agent. Three literals would let a rename silently switch the filter
 * off, which is the failure this whole file's derivation-over-literal habit exists to prevent.
 */
export const ADDED_LABEL = "Added";


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
  /**
   * ⚠️ DAYS SINCE THE EVENT THAT STARTED THIS WAIT — and `undefined` where the record cannot say.
   * It was `= 0`, which silently became "Today" on every card whose anchor was missing. A default
   * here is a fabricated date, and the whole point of this pass is that there is no such thing.
   */
  elapsedDays?: number;
  /** An offer's remaining days. NEGATIVE where the reply-by has passed. */
  replyWithinDays?: number;
  /** A snoozed card's return date, already formatted. */
  backOn?: string;
}

/**
 * ⚠️ THE LABEL AND THE FIGURE ARE CHOSEN TOGETHER, NEVER INDEPENDENTLY. "DANIEL'S WAITED / Today"
 * is not English. The pair is picked in one branch so a label can never be handed a figure that
 * does not complete it — read every row of the table aloud and it is a sentence.
 *
 * ⚠️ AND THERE IS NO FALLBACK TO TODAY. A card whose anchor the record cannot supply says so —
 * `No date on record`, and no figure at all. Inventing "Today" for a wait that started months ago
 * is the app stating something false in its most scannable column.
 */
export function rowFigure(input: FigureInput): RowFigure {
  const { card, statedWeeks, ballHolder, elapsedDays, replyWithinDays, backOn } = input;

  if (backOn) return { label: "Back on", value: backOn, unit: "", side: "neither", hot: false };

  /* the offer's clock is the one that counts DOWN, and it can run out */
  if (typeof replyWithinDays === "number") {
    if (replyWithinDays < 0) {
      const past = Math.abs(replyWithinDays);
      return { label: "Reply was due", value: String(past), unit: past === 1 ? "day ago" : "days ago", side: "you", hot: true };
    }
    if (replyWithinDays === 0) return { label: "Reply by", value: "Today", unit: "", side: "you", hot: true };
    return { label: "Reply within", ...elapsedFigure(replyWithinDays), side: "you", hot: true };
  }

  /* ⚠️ NO ANCHOR, NO FIGURE, AND THE LABEL SAYS SO. */
  if (typeof elapsedDays !== "number") {
    return { label: "No date on record", value: "", unit: "", side: "neither", hot: false };
  }

  const first = firstName(card.who);
  const past = !!statedWeeks && statedWeeks > 0 && elapsedDays > statedWeeks * 7;
  const fig = elapsedFigure(elapsedDays, statedWeeks);
  /* under two days the figure is a WORD, and a word needs a different verb to complete it */
  const isWord = elapsedDays <= 1;

  if (!card.agentId && !card.who) {
    return {
      label: card.userTaskId || card.nature ? ADDED_LABEL : "Noticed",
      ...fig, side: "neither", hot: false,
    };
  }

  if (ballHolder === "writer") {
    /* the agent is waiting on the writer — "Marcus's waited / 12 days", "Marcus asked / Today" */
    return {
      label: isWord
        ? (first ? `${first} asked` : "They asked")
        : (first ? `${possessive(first)} waited` : "They've waited"),
      ...fig, side: "you", hot: past,
    };
  }

  /* the writer is waiting on the agent — "You've waited / 14 weeks", "You queried / Today" */
  return { label: isWord ? "You queried" : "You've waited", ...fig, side: "them", hot: past };
}

/** Days between two instants, floored — the one arithmetic every caller shares. */
export function daysSince(fromMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - fromMs) / DAY));
}

/* ── line two: the meta line (corrections, Phase 2) ──────────────────────────────────────────── */

/**
 * ⚠️ THE AGENT WAS PRINTED TWICE, and this is the one derivation that composes the line.
 *
 * `BoardCard.record` is ALREADY the composed meta — `todoBoard` builds it as
 * `[agentPrimary(ag), ag.agency].filter(Boolean).join(" · ")` — so the row rendering
 * `{who} · {record}` produced "Tom Ellery · Tom Ellery · Curtis Vane". The composition was never
 * wrong; a second one was layered over it.
 *
 * ⚠️ SO THE ROW COMPOSES NOTHING. It asks this, and this reads the field that already holds the
 * answer. A card with an agent and no agency yields the name alone (the `filter(Boolean)` upstream
 * already drops the empty half, so there is no dangling separator to guard against here — and the
 * lock asserts that rather than trusting it).
 *
 * ⚠️ AND A CARD WITH NO AGENT NAMES ITS STANDING SUBJECT rather than rendering an empty line. A
 * note belongs to the writer's own board; everything else without an agent is about the list.
 */
export function rowMeta(c: BoardCard): string {
  if (c.record) return c.record;
  if (c.who) return c.who;
  return cardBucket(c) === "note" ? "Your noteboard" : "Submission packages";
}

/* ── the wait's anchor, per bucket (corrections, Phase 3a) ───────────────────────────────────── */

export interface AnchorInput {
  /** The query behind the card, where there is one. */
  dateSent?: string;
  partialRequestedDate?: string;
  fullRequestedDate?: string;
  partialSentDate?: string;
  fullSentDate?: string;
  lastNudgeSentDate?: string;
  /**
   * ⚠️ NAMED FOR WHAT THEY ARE HERE, NOT FOR THE FIELDS THEY COME FROM — and that is deliberate.
   * `recomputeQuery`'s single-writer lock sweeps for the object-key form of the two derived date
   * fields and flags any file outside the derivation pair that carries it. An
   * AnchorInput literal using those names is indistinguishable from a write, so the sweep would
   * have to be loosened to let this through — and a lock that has to be argued with stops being
   * one. These are the anchor's own names; the call site READS the stored fields, which the sweep
   * correctly ignores.
   */
  /** The last reply that came in (from the derived `responseReceivedAt`). */
  lastReplyAt?: string;
  /** When the status last moved (from the derived `lastStatusChange`). */
  statusMovedAt?: string;
  /** A user card's own creation instant. */
  createdAt?: string;
}

const ms = (v?: string): number => {
  const t = v ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : NaN;
};
const latest = (...vs: (string | undefined)[]): number => {
  const ts = vs.map(ms).filter((t) => Number.isFinite(t));
  return ts.length ? Math.max(...ts) : NaN;
};

/**
 * ⚠️ THE ANCHOR IS THE EVENT THAT STARTED **THIS** WAIT, AND IT IS PER BUCKET. The rail was
 * measuring from `dateSent` — when the QUERY went — for every kind, which is why an offer received
 * on 17 July read `127 weeks` and a full requested on 2 August read `123 weeks`: both were counting
 * from the original query, months or years earlier. And where `dateSent` was absent it fell back
 * to `now`, which is where `Today` came from on cards that had waited 24 and 47 days.
 *
 * ⚠️ NaN MEANS THE RECORD CANNOT SAY, and that is a RESULT rather than a failure. `rowFigure` turns
 * it into "No date on record" with no figure. There is no fallback to today and no fallback to the
 * query's creation — both are the app inventing a date, which is worse than admitting it has none.
 *
 * ⚠️ THE DERIVED FIELDS ARE READ, NOT RE-DERIVED. `lastStatusChange` and `responseReceivedAt` are
 * `recomputeQuery`'s own output from the activity log, so reading them IS reading the log — through
 * the one derivation that owns it, exactly as `lastQueriedAt` reads `dateSent` rather than
 * rescanning. A second scan here would be a second answer.
 */
export function waitAnchorMs(bucket: Bucket, taskType: string | undefined, q: AnchorInput): number {
  switch (bucket) {
    case "send":
      /* the date the agent asked for the material — the specific request, not the query */
      if (taskType === "partial_requested") return ms(q.partialRequestedDate);
      if (taskType === "full_requested") return ms(q.fullRequestedDate);
      /* an R&R has no request date of its own; the status change IS when it was asked for */
      return ms(q.statusMovedAt);

    case "decide":
      /* the offer or the revision arrived when the status last moved */
      return ms(q.statusMovedAt);

    case "chase":
    case "close":
      /* whichever is later: the last thing the writer sent, or the last thing that came back */
      return latest(q.fullSentDate, q.partialSentDate, q.lastNudgeSentDate, q.lastReplyAt, q.dateSent);

    case "note":
      return ms(q.createdAt);

    case "fix":
      /* ⚠️ NOT RESOLVABLE TODAY, AND THIS IS THE HONEST ANSWER RATHER THAN A GUESS. A housekeeping
         gap is raised from a `TaskFlag`, which carries `snoozedUntil`, `committedDate`, `skippedAt`
         and `resolvedAt` — every date EXCEPT when the flag was created. There is nothing to measure
         from, so the row says "No date on record". Adding a `createdAt` to the flag is the one
         change that would resolve it, and it is a data decision rather than a display one. */
      return NaN;
  }
}
