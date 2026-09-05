/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * taskListRow — the list's display language, from `design-refs/todo-tasklist-contract.html`.
 *
 * ⚠️ DISPLAY ONLY. Nothing here changes a stored value, a task type or a bucket key — the same
 * separation `materialLabel` keeps between what a thing IS and what a reader is shown. A row that
 * reads "Consider closing" is still a `close` bucket card with its own `taskType` underneath.
 *
 * ⚠️ THE RETIRED VERBS ARE RETIRED AS WORDS, NOT AS CONCEPTS. "log", "record", "mark" and "chase"
 * do not appear in anything a reader sees; `cardBucket` still returns `"chase"` and the code still
 * says `record`, because those are identifiers. The list asserts the reader's side of that line.
 *
 * ⚠️ AND ABSENCE IS STATED PLAINLY, NEVER GUESSED. "no agency" and "agent not specified" are the
 * contract's own words for a record that does not hold the fact — they go in the META, while an
 * absent DATE goes in the right-hand column as `.absent`. Two different absences, two slots; a
 * missing date rendered as a sentence in the middle column is the fault this separation prevents.
 */
import { BoardCard } from "./todoBoard";
import { Bucket, cardBucket, taskDeed } from "./todoBuckets";
import { elapsedParts } from "./elapsed";

/** what the row can be told beyond the card itself — every one optional, every one falling back */
export interface RowInputs {
  card: BoardCard;
  /** the specific ask ("the first 3 chapters"), through the one materials formatter */
  ask?: string | null;
  /** the day representation was offered, already formatted */
  offeredOn?: string | null;
  /** days on this row's own clock — the rail's resolver, never a second derivation */
  days?: number | null;
  /** how many queries a bulk gap stands for */
  bulkCount?: number | null;
  /** a send whose material is a partial rather than the full */
  partial?: boolean;
  /**
   * ⚠️ THE AGENCY ALONE. `card.record` is the rail's own meta line and already reads
   * "Ana Duarte · Duarte Words" — using it as the agency printed the agent TWICE
   * ("Ana Duarte asked for it · Ana Duarte · Duarte Words"). Measured on the page; no source
   * reading could have shown it, because the field's name is honest and its content is a pair.
   */
  agency?: string | null;
}

/* ── the deed ─────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ ONE STRING PER BUCKET, and the send pair is the only split. Everything else says the same
 * thing on every row of its group, which is what makes a column of deeds scannable.
 */
/**
 * ⚠️ THE ROW AND THE BAND CALL THE SAME FUNCTION NOW. This used to hold its own copy of the table,
 * which is how the pane came to say "Log the close" beside a row saying "Consider closing" — two
 * correct-looking switches, one card, two words. The table lives in `taskDeed`; this passes the
 * one thing the row knows and the card does not: whether the send is a partial.
 */
export const listDeed = (i: RowInputs): string => taskDeed(i.card, i.partial);

/* ── the meta ─────────────────────────────────────────────────────────────────────────────── */

/** the contract's separator — a soft dot with its own colour, so it is markup rather than text */
export const META_DOT = " · ";

/** "no agency" / "agent not specified" — the contract's words for a fact the record lacks */
const agencyOf = (i: RowInputs): string => (i.agency || "").trim() || "no agency";
const agentOf = (c: BoardCard): string => (c.who || "").trim() || "agent not specified";

/**
 * Returns the pieces rather than a joined string, because the separator is a styled span. Joining
 * here and splitting in the component is the same fault as splitting `elapsedPhrase` at a call
 * site: the rule about how a line is composed would end up in two places.
 */
export function listMeta(i: RowInputs): string[] {
  const c = i.card;
  const b = cardBucket(c);
  switch (b) {
    case "send":
      /* ⚠️ THE PARTIAL NAMES WHAT WAS ASKED FOR, WHEN THE RECORD HOLDS IT. The ask is the whole
         point of the line — "asked for the first 3 chapters" tells you what to put in the envelope.
         Unrecorded, it falls back to the pair, which is honest rather than inventing a quantity. */
      if (i.partial) {
        return i.ask ? [`${agentOf(c)} asked for ${i.ask}`] : [agentOf(c), agencyOf(i)];
      }
      return [`${agentOf(c)} asked for it`, agencyOf(i)];
    case "decide":
      return i.offeredOn
        ? [`${agentOf(c)} offered representation`, i.offeredOn]
        : [`${agentOf(c)} offered representation`];
    case "chase":
      /* ⚠️ "their stated window" — never "his" or "hers". The app does not know, and an agent is a
         real person whose pronouns it never asked for. */
      return typeof i.days === "number"
        ? [`Quiet for ${elapsedParts(i.days).figure} ${elapsedParts(i.days).unit} — past their stated window`]
        : ["Past their stated window"];
    case "close":
      return [agentOf(c), agencyOf(i)];
    case "fix":
      /* the bulk gap stands for a SET; the single one stands for a query */
      return typeof i.bulkCount === "number" && i.bulkCount > 1
        ? [`${i.bulkCount} imported queries are missing their materials`]
        : [`${agentOf(c)} · imported without materials`];
    case "note":
      return [];
    default: {
      const unhandled: never = b;
      return unhandled;
    }
  }
}

/* ── the right-hand fragment ──────────────────────────────────────────────────────────────── */

/**
 * ⚠️ ONE GRAMMAR FOR EVERY ROW (Option B). Two lines, mono, right-aligned, with a Playfair figure
 * inside. `absent` is its own treatment rather than a missing value: a row with no date says so
 * HERE, in the slot the eye already goes to for a duration, instead of putting the admission in
 * the middle column where the subject belongs.
 */
export interface RowFragment {
  /** the first line, and the second when there is no figure */
  lead: string;
  /** the Playfair numeral — absent on an absent row */
  figure?: string;
  /** what follows the figure on the second line */
  tail?: string;
  /** burgundy figure — Decide only, this run */
  hot?: boolean;
  /** the muted, figure-less treatment */
  absent?: boolean;
}

export function listFragment(i: RowInputs): RowFragment {
  const b = cardBucket(i.card);
  const d = typeof i.days === "number" ? elapsedParts(i.days) : null;

  switch (b) {
    case "send":
      return d ? { lead: "waiting", figure: d.figure, tail: d.unit }
               : { lead: "no date on record", absent: true };
    case "decide":
      /* ⚠️ `.hot` IS DECIDE'S ALONE THIS RUN. Other hot conditions are out of scope by the brief;
         adding one here would put a rule in the list that nothing else knows about. */
      return d ? { lead: "open", figure: d.figure, tail: d.unit, hot: true }
               : { lead: "no date on record", absent: true };
    case "chase":
    case "close":
      return d ? { lead: "quiet for", figure: d.figure, tail: d.unit }
               : { lead: "no date on record", absent: true };
    case "fix":
      return typeof i.bulkCount === "number" && i.bulkCount > 1
        ? { lead: "", figure: String(i.bulkCount), tail: "queries to fill in" }
        : { lead: "no date on record", absent: true };
    case "note":
      return d ? { lead: "added", figure: d.figure, tail: `${d.unit} ago` }
               : { lead: "no date set", absent: true };
    default: {
      const unhandled: never = b;
      return unhandled;
    }
  }
}

/** the pill's word — the existing label map, unchanged; the list only renders it */
export const rowBucket = (c: BoardCard): Bucket => cardBucket(c);

/* ── the pane's copy ──────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE PANE SPEAKS THE LIST'S LANGUAGE (frame2 Phase 4). The row said "Consider closing" while
 * the form beside it said "Complete" — two halves of one page in two registers, and "Complete" is
 * on the retired list besides. One table, keyed by the bucket the row is already keyed by, so the
 * two cannot drift into different words for one act.
 *
 * ⚠️ A HEADING OF `null` MEANS THE JOURNEY HAS NONE. Nudge is the case: there is nothing to fill
 * in, so a heading would announce a form that is not there. Absence is a value here, exactly as it
 * is for tiles and the timeline.
 */
export interface PaneCopy {
  /* (`heading` is RETIRED — workspace round, Phase 4. The pane draws no form heading: the DEED is
     the heading, and "Sent it? Note it here" restated it in weaker words three centimetres below.
     Deleted rather than left as a field nobody reads.) */
  /** `.ab.go` */
  primary: string;
  /**
   * ⚠️ `.f-sub` WHERE THE JOURNEY HAS WORDS OF ITS OWN, absent where the generic hint will do.
   * Close is the case: the contract gives it a line that has to be carried verbatim, because it is
   * the sentence that stops "closing" reading as "rejecting" — and it makes a claim about the
   * writer's own statistics that the app has to be able to stand behind.
   */
  note?: string;
}

/**
 * ⚠️ DECLARED ABOVE `PANE_COPY`, WHICH READS IT. A `const` in a module's temporal dead zone
 * throws when the table below is initialised, and the table is initialised on import — so the
 * page renders nothing and no test that reads source can see it. The house rule, stated in
 * CLAUDE.md, is that initialisation goes at the END of a module; this is the same rule read
 * forwards.
 *
 * the verbatim line the close journey must carry */
export const CLOSE_NOTE =
  "Closing records no response — not a rejection, so your response rate stays honest.";

/**
 * ⚠️ "LOG" IS REINSTATED FOR THESE PRIMARIES BY OWNER OVERRIDE (finishing round), AND THE OVERRIDE
 * IS RECORDED HERE SO IT IS NOT "FIXED" BACK.
 *
 * The language review retired "log" as a heading verb, and the previous round changed these three
 * to "I've sent it" / "Close this query" / "Record {n} queries" on that rule. The owner has since
 * overridden it deliberately, after that round shipped: the primaries are "Log as sent", "Log the
 * close", "Log {n} queries" and "Tick it off". That is a later decision by the person whose
 * language table it is — not a regression, and not the contract leaking an old string.
 *
 * ⚠️ SO THE RETIRED-VERB ASSERTION IS SCOPED, NOT DELETED. "log" remains retired everywhere it was
 * retired — deeds, headings, list rows — and is permitted on these four primaries alone. A blanket
 * ban and a blanket permission are both wrong; the exception is named.
 */
export const PANE_COPY: Record<Bucket, PaneCopy> = {
  send:   { primary: "Log as sent" },
  chase:  { primary: "I've nudged them" },
  close:  { primary: "Log the close",
            /* ⚠️ COMPOSED FROM `CLOSE_NOTE`, NOT RETYPED. The first sentence is the verbatim line
               and is asserted as such; retyping it here would put the same claim about response
               rates in two places, and the one that drifts is always the copy.
               ⚠️ IT IS THE `When` ROW'S HINT NOW (workspace round, Phase 4), not the form's
               sub-line. It reassures about the ACT of closing, and the row where the writer dates
               that act is where they are deciding whether to go through with it — a sentence three
               centimetres above the question is read before the question exists. */
            note: `${CLOSE_NOTE} It does not tell the agent anything.` },
  fix:    { primary: "Log as sent" },
  note:   { primary: "Tick it off" },
  /* ⚠️ DECIDE IS NOT IN THE BRIEF'S TABLE. An offer is answered in its own journey, not by a
     one-line form — reported rather than invented. */
  decide: { primary: "Reply to the offer" },
};

export const paneCopy = (c: BoardCard): PaneCopy => PANE_COPY[cardBucket(c)];

/* ── the wide row's own cells (drawer round, Phase 1) ─────────────────────────────────────── */

/**
 * ⚠️ THE WIDE ROW'S CELLS ARE THE META LINE'S FACTS, SPLIT INTO COLUMNS — never re-derived.
 * `listMeta` composes agent, agency and the ask into one sentence for the 392px rail; at full
 * width the same facts get columns of their own. Both read the SAME two accessors (`agentOf`,
 * `agencyOf`), so a row cannot say "no agency" in one form and print an agency in the other.
 *
 * ⚠️ AND ABSENCE STAYS PLAIN. The columns keep the contract's words for a record that does not
 * hold the fact rather than falling back to an em dash, because "no agency" is a statement about
 * the record and "—" is a statement about nothing.
 */
export const listAgent = (i: RowInputs): string => agentOf(i.card);
export const listAgency = (i: RowInputs): string => agencyOf(i);

/**
 * The manuscript this row's work belongs to. Absent on a user task, which is not about a book.
 * `null` means "print nothing", NOT "print a placeholder" — an empty cell in a column that is
 * only rendered when there is more than one manuscript reads correctly; a dash does not.
 */
export const listManuscript = (i: RowInputs): string | null =>
  (i.card.msTitle || "").trim() || null;

/**
 * ⚠️ THE MANUSCRIPT COLUMN IS A PROPERTY OF THE ACCOUNT, NOT OF A ROW. With one manuscript every
 * cell in the column holds the same word, so the column is a repeated constant taking width from
 * the deed — it is HIDDEN, not greyed, because a greyed column still costs the space that made it
 * worth removing.
 *
 * ⚠️ ONE is the boundary, and ZERO must fall on the hidden side with it. An account with no
 * manuscripts has nothing to distinguish either, and `> 1` states the rule the way it is meant —
 * "more than one book to tell apart" — rather than `!== 1`, which would show an empty column to
 * somebody who has not added a book yet.
 */
export const showsManuscriptColumn = (manuscriptCount: number): boolean => manuscriptCount > 1;

/**
 * ⚠️ THE AVATAR IS AN AGENT'S, SO A ROW WITHOUT AN AGENT HAS NONE. A user task's `initials` is a
 * GLYPH (`✎` / `✓`) and an agentless query card's is `•`; both are meaningful in the board's own
 * chip and neither is a person's initials. Rendering them in a person-shaped disc would claim the
 * row is about somebody it is not.
 *
 * ⚠️ `Agent.image` EXISTS AND IS DELIBERATELY NOT READ HERE. Its own docstring says
 * "absent === the initials avatar", but the field is NOT in `firestore.rules`' agent-update
 * allowlist and no agent on any account has one — so a photo branch would be a permanently dead
 * path pretending to be a fallback. When upload lands, this is the one place that changes.
 */
export const listAvatarInitials = (c: BoardCard): string | null =>
  c.userTaskId || !(c.who || "").trim() ? null : (c.initials || "").trim() || null;
