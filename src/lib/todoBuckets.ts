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
import { isSweepCard } from "./todoColumns";
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
 * THE CARD FOOTER'S HINT — what pressing the primary will and will not do.
 *
 * ⚠️ THIS WAS A HARDCODED SENTENCE, NOT A DEFAULT — which is worse. `TodoDock` rendered
 * "Nothing is sent from here — this records what happened." on EVERY card, for all six buckets. It
 * is wrong on a Note (nothing is recorded about a send), wrong on a Close (the query IS closed by
 * it) and wrong on a record gap (nothing about the query moves at all). One journey's reassurance
 * standing in for six.
 *
 * ⚠️ THE SAME FAMILY AS `completionVia` AND `journeySummary`, one register further out: those were
 * permissive DEFAULTS answering as another journey; this did not even branch. Exhaustive over
 * `Bucket` with the house `never` guard, so the next bucket fails to compile until it says what
 * pressing its primary does.
 *
 * ⚠️ AND IT IS THE CARD'S HINT, NOT THE JOURNEY'S. `JOURNEY_HINT` speaks at the moment of commit
 * ("this records what you sent"); this speaks before the form opens, about the act the primary
 * begins. Two moments, two sentences — folding them would put a commit's promise on a button that
 * only opens something.
 */
/* (`cardFootHint` is DELETED — workspace round, Phase 4. Its only caller was the pane's form
   sub-line, which the chrome diet retires: the deed already says what the card is for, and a
   generic hint under it said something true and unnecessary. A reachability sweep is what this
   repo asks for rather than an export nothing imports.) */


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
/**
 * ⚠️ ONE DEED FOR ONE CARD, AND THIS IS IT. There were THREE wordings in the app for the same card
 * — `listDeed` said "Consider closing", `rowDeed` said "Log the close", and the note branch reads
 * `card.title` — so the row and the pane described the same task in different words on one screen.
 * That is the three-activity-stores disease in copy, and the fix is the same: collapse the
 * synonyms rather than route each caller to the right one.
 *
 * ⚠️ AND `rowDeed`'S OLD TABLE CARRIED THREE RETIRED VERBS — "Answer the offer", "Chase your
 * query", "Log the close". The language review retired log · record · mark · chase as user-facing
 * words; the row had already moved and the pane had not, which is exactly how a synonym survives.
 *
 * ⚠️ THE NOTE BRANCH IS NOT A SYNONYM. A note's deed IS the writer's own words, so `card.title` is
 * the right read there and the only one — that is a different fact, not a third wording.
 */
export function taskDeed(c: BoardCard, partial?: boolean): string {
  if (c.userTaskId || c.nature || c.stream === "nt") return c.title;
  const isPartial = partial ?? c.taskType === "partial_requested";
  switch (cardBucket(c)) {
    case "send": return isPartial ? "Send your partial" : "Send your full manuscript";
    case "decide": return "Reply to the offer";
    case "chase": return "Worth a nudge";
    case "close": return "Consider closing";
    case "fix": return "Fill in what you sent";
    case "note": return c.title;
    default: return c.title;
  }
}

/**
 * @deprecated Use `taskDeed`. Kept as a thin alias so the two remaining callers keep compiling
 * while they move; it returns the SAME string `taskDeed` does, so a caller cannot get the old
 * wording by reaching for the old name.
 */
export const rowDeed = (c: BoardCard): string => taskDeed(c);

/**
 * ⚠️ THE BAND'S DEED IS A SENTENCE (deed round, Phase 1), built from the same bucket table
 * `taskDeed` reads — the verb keeps one home and this adds the objects around it.
 *
 * The LIST ROW keeps the short deed, deliberately. A column of forty sentences is unreadable and a
 * column of forty short deeds is what makes it scannable. That is not the synonym fault the earlier
 * round closed — that was two DIFFERENT short deeds for one act. This is one act, named once,
 * stated briefly in a list and fully in a pane.
 *
 * ⚠️ AND IT DEGRADES BY DROPPING, NEVER BY PLACEHOLDER. No agency ends the sentence at the agent;
 * no agent ends it at the title. "agent not specified" is honest in a META line, where absence is
 * the subject — inside a sentence about what you are about to do it is the app narrating its own
 * gaps at the writer.
 */
export interface DeedParts {
  title?: string;
  agent?: string;
  agency?: string;
  /** a partial rather than the full — the send pair's only split */
  partial?: boolean;
  /** how many queries a cohort stands for */
  bulkCount?: number;
}

/** one span of the sentence. `em` renders `<i>` — italic in the heading's own ink, never coloured. */
export interface DeedSpan { text: string; em?: boolean }

export function deedSentence(c: BoardCard, p: DeedParts = {}): DeedSpan[] {
  const t = (p.title ?? "").trim();
  const ag = (p.agent ?? "").trim();
  const agy = (p.agency ?? "").trim();
  const forTitle = (): DeedSpan[] => (t ? [{ text: " for " }, { text: t, em: true }] : []);
  const to = (): DeedSpan[] => {
    const out: DeedSpan[] = [];
    if (ag) out.push({ text: " to " }, { text: ag, em: true });
    if (agy) out.push({ text: " at " }, { text: agy, em: true });
    return out;
  };

  switch (cardBucket(c)) {
    case "send": {
      const what = (p.partial ?? c.taskType === "partial_requested") ? "partial manuscript" : "full manuscript";
      return [{ text: "Send your " }, { text: what, em: true }, ...forTitle(), ...to()];
    }
    case "close":
      return [{ text: "Consider closing your query" }, ...forTitle(), ...to()];
    case "fix": {
      const n = p.bulkCount ?? 0;
      return n > 1
        ? [{ text: "Fill in what you sent with " }, { text: `${n} imported queries`, em: true }, ...forTitle()]
        : [{ text: "Fill in what you sent" }, ...forTitle(), ...to()];
    }
    /**
     * ⚠️ THE CHASE NAMES WHO IT CONCERNS (chase round, Phase 1). It had no template, so it fell
     * through to the short deed — "Worth a nudge" — and once the sub-line was removed there was
     * nothing on the card saying which agent it was about. The row keeps the summary; the band is
     * the sentence.
     *
     * ⚠️ IT DEGRADES BY DROPPING, NEVER BY PLACEHOLDER. No agency loses " at …"; no agent loses the
     * name and leans on the agency; neither leaves "them", which is the app's own pronoun for an
     * agent whose pronouns it does not know and never asks for.
     */
    case "chase": {
      const about = (): DeedSpan[] => (t ? [{ text: " about " }, { text: t, em: true }] : []);
      if (ag && agy) return [{ text: "Nudge " }, { text: ag, em: true }, { text: " at " }, { text: agy, em: true }, ...about()];
      if (ag) return [{ text: "Nudge " }, { text: ag, em: true }, ...about()];
      if (agy) return [{ text: "Nudge " }, { text: agy, em: true }, ...about()];
      return [{ text: "Nudge them" }, ...about()];
    }
    /* a note is the writer's own words, and nothing is added to them */
    case "note": return [{ text: c.title }];
    /**
     * ⚠️ `decide` KEEPS THE SHORT DEED, AND THAT IS DECLARED IN `DEED_FORM` RATHER THAN LEFT AS A
     * FALL-THROUGH. An offer hands off to its own takeover, which names the agent in its own band;
     * templating one here would put a second sentence about the same act on the same screen. The
     * declaration is what stops the next bucket inheriting this silently.
     */
    default: return [{ text: taskDeed(c) }];
  }
}

/**
 * ⚠️ WHICH BUCKETS COMPOSE A SENTENCE, DECLARED — exhaustive, closed with `never`, so a new bucket
 * cannot arrive holding another bucket's answer.
 *
 * `sentence` — a composed template naming the subject.
 * `own`      — the writer's own words, which nothing is added to.
 * `short`    — deliberately the row's short deed; the reason lives at its `case` above.
 *
 * The test asserts this against `deedSentence` itself rather than restating the strings: a bucket
 * declared `sentence` whose output equals the short deed has lost its template, and a bucket
 * declared `short` whose output does not is being templated without saying so.
 */
export const DEED_FORM: Record<Bucket, "sentence" | "own" | "short"> = {
  send: "sentence",
  close: "sentence",
  fix: "sentence",
  chase: "sentence",
  note: "own",
  decide: "short",
};

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
  /* ⚠️ A GROUP ROW WITH NOTHING TO SAY SAYS NOTHING. The fallbacks below name a STANDING SUBJECT —
     the writer's board, the packages page — which is honest for a card that has one and no agent.
     A sweep has neither: it stands for n agents rather than for a place, so borrowing either
     fallback would put a destination in the slot where the row's subject belongs. Empty renders no
     line at all, which is the true answer. */
  /* ⚠️ A BULK RECORD GAP STANDS FOR A SET, EXACTLY LIKE A SWEEP — so it takes the same exit.
     It is not built by `sweepCardFor` (it has no HK_RULES rule and no batch-fix sheet behind it),
     so `isSweepCard` does not catch it, and without this it printed "Submission packages" in the
     slot where the row's subject belongs — a destination standing in for a subject, which is the
     precise fault the note above describes. Measured on the page; no unit lock could see it. */
  if (isSweepCard(c) || c.taskType === "materials_unrecorded_bulk") return "";
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
