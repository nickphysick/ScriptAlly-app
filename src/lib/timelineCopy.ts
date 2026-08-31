import { QueryStatus } from "../types";
import { shortCalDate } from "./todoCalendar";
import { asksOfYou, type RowGroup } from "./timelineGroups";

/**
 * What a timeline row says about itself, in the writer's own words.
 *
 * ⚠️ NEVER A PRONOUN, ANYWHERE. This app does not store an agent's gender and must not guess: a
 * 50% error rate on a real person's name, in the one register — a personal one — where being
 * wrong is least forgivable. The surname where there is one, "the agent" where there is not, and
 * "they" only where a plural verb is natural.
 *
 * ⚠️ AND NEVER A VERDICT. No "overdue", no "late", no "still", no adverb of any kind. An agent has
 * not broken a promise by being slow, and most of these journeys have no deadline at all — nobody
 * set a due date on a partial requested six weeks ago. The fact is stated and the reader draws
 * their own conclusion, which is the only thing the app is entitled to do here.
 *
 * ⚠️ THE DERIVATION NAMES STAY IN THE CODE. "Your move", "Their move", "Reply window", "waiting",
 * "your turn" are how this codebase talks to itself; none of them is how a writer talks about
 * their own submission, and none of them reaches the screen any more.
 */

/**
 * The surname to address an agent by, or `null` for "the agent".
 *
 * ⚠️ THE LAST WORD, WITH THE OBVIOUS FAILURES RULED OUT RATHER THAN ASSUMED AWAY. A one-word name
 * is used whole — it is either a surname already or a mononym, and both read correctly. A trailing
 * initial or honorific is not a surname, and neither is a name that turns out to be an agency
 * (`agentPrimary` falls back to the agency when there is no personal name), which is why an empty
 * or punctuation-only tail returns null and takes the "the agent" branch.
 */
export function agentSurname(name: string | null | undefined): string | null {
  const clean = (name ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const parts = clean.split(" ").filter(Boolean);
  const last = parts[parts.length - 1];
  /* an initial, a suffix or a stray mark is not a name to address someone by */
  if (!/^[\p{L}][\p{L}'’-]+$/u.test(last)) return null;
  return last;
}

/** How this row addresses its agent — the surname, or the one permitted stand-in. */
export const addressed = (surname: string | null): string => surname ?? "the agent";

export interface RowCopy {
  surname: string | null;
  status: QueryStatus;
  /** the reply the record expects, ymd, or null when nothing states one */
  expectedYmd: string | null;
  /** the writer's next reminder, ymd — `Query.nudgeDate` */
  nudgeYmd: string | null;
  /** when the writer last nudged, ymd — `Query.lastNudgeSentDate` */
  nudgedOnYmd: string | null;
  /** the last thing that happened on this journey, ymd */
  lastWordYmd: string | null;
  /** when the relationship closed, ymd */
  closedYmd: string | null;
}

const DAY_MS = 86_400_000;
const at = (ymd: string) => new Date(`${ymd}T12:00:00`).getTime();
const gap = (from: string, to: string) => Math.round((at(to) - at(from)) / DAY_MS);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/**
 * A recent date as its weekday, an older one as its date.
 *
 * ⚠️ SIX DAYS, NOT SEVEN. At seven "Sunday" is ambiguous between the Sunday just gone and the one
 * before it, and the reader has no way to tell which. Six is the largest window where a weekday
 * names exactly one day.
 */
export function whenSaid(ymd: string, today: string): string {
  const back = gap(ymd, today);
  if (back === 0) return "today";
  if (back === 1) return "yesterday";
  if (back === -1) return "tomorrow";
  /**
   * ⚠️ SIX DAYS EITHER SIDE, NOT SEVEN. At seven "Sunday" is ambiguous between the Sunday just
   * gone and the one before it — or, forward, between this coming Sunday and the next — and the
   * reader has no way to tell which. Six is the largest window where a weekday names exactly one
   * day in each direction.
   *
   * ⚠️ AND IT LOOKS FORWARD AS WELL AS BACK, which it did not at first: "an answer by Sunday" is
   * how a deadline four days out is spoken about, and rendering it as "an answer by 30 Aug" for a
   * date inside the same week is stiffer than anything a writer would say.
   */
  if (Math.abs(back) <= 6) {
    return new Date(`${ymd}T12:00:00`).toLocaleString("en-GB", { weekday: "long" });
  }
  return shortCalDate(ymd);
}

/**
 * What the agent asked for, in the words a writer would use.
 *
 * ⚠️ "the full" AND "a partial", NOT "Full Requested". The status is a state name in a pipeline;
 * these are the things themselves. `Opening sample` is deliberately absent — an agent asking for
 * one is not a state this pipeline has, and inventing a phrase for it would put words in a
 * writer's mouth about a request that was never recorded.
 */
const WANTED: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "a partial",
  [QueryStatus.FULL_REQUESTED]: "the full",
  [QueryStatus.REVISE_RESUBMIT]: "a revise and resubmit",
};

/**
 * The row's sentence.
 *
 * ⚠️ THE BRANCHES ARE ORDERED MOST-SPECIFIC FIRST AND EVERY ONE RETURNS. There is no default that
 * writes: an unrecognised state falls through to the plainest true thing this row can say, which
 * is who it is out with. A default that invented a livelier sentence would be the same fault as a
 * default branch that performs a write — the case nobody thought about, given confident words.
 */
export function rowSentence(c: RowCopy, today: string): string {
  const who = addressed(c.surname);

  if (c.closedYmd) return `Closed on ${whenSaid(c.closedYmd, today)} — full record in Query Centre`;

  if (c.status === QueryStatus.OFFER) {
    if (!c.expectedYmd) return "Offer on the table";
    /* ⚠️ "by yesterday" IS NONSENSE AND IT RENDERED. A date the agency stated reads as a deadline
       ahead while it is ahead and as a fact once it is behind — "an answer by yesterday" asks the
       writer to have done something in the past. Not a verdict on them either way: the date is the
       agency's, and stating it late is reporting, not scolding. */
    return c.expectedYmd < today
      ? `Offer on the table — an answer was due ${whenSaid(c.expectedYmd, today)}`
      : `Offer on the table — an answer by ${whenSaid(c.expectedYmd, today)}`;
  }

  const wants = WANTED[c.status];
  if (wants) {
    /* ⚠️ THE ASK'S OWN AGE, not the journey's. "asked 3 days ago" is about the request; the
       journey may have been running for months and that is a different sentence. */
    const asked = c.lastWordYmd ? gap(c.lastWordYmd, today) : null;
    if (asked == null) return `They want ${wants}`;
    if (asked === 0) return `They want ${wants} — asked today`;
    return `They want ${wants} — asked ${plural(asked, "day")} ago`;
  }

  const silence = c.lastWordYmd ? gap(c.lastWordYmd, today) : null;
  const noWord = silence != null && silence > 0 ? `No word in ${plural(silence, "day")}` : null;

  /* the writer's own reminder has arrived and there is still nothing back */
  if (c.nudgeYmd && c.nudgeYmd <= today) {
    const fell = `a nudge fell due on ${whenSaid(c.nudgeYmd, today)}`;
    return noWord ? `${noWord} — ${fell}` : `Out with ${who} — ${fell}`;
  }

  /* nudged, and the reminder is still ahead */
  if (c.nudgeYmd && c.nudgedOnYmd) {
    const said = whenSaid(c.nudgedOnYmd, today);
    const left = gap(today, c.nudgeYmd);
    /**
     * ⚠️ TWO RENDERINGS OF ONE STATE, AND THE SPLIT IS FORMATTING RATHER THAN FACT. The brief
     * distinguishes "nudged, clock restarted" from "nudged, reminder ahead"; the record does not —
     * both are a nudge with a reminder in front of it, and nothing stored says which the writer
     * meant. So the wait is stated in the unit that reads naturally at its size: whole weeks where
     * it is whole weeks, days otherwise. Flagged rather than invented.
     */
    return left >= 14 && left % 7 === 0
      ? `Nudged ${said} — giving it ${plural(left / 7, "more week")}`
      : `Nudged ${said} — a reminder falls due in ${plural(left, "day")}`;
  }
  if (c.nudgeYmd) {
    const left = gap(today, c.nudgeYmd);
    return `Out with ${who} — a reminder falls due in ${plural(left, "day")}`;
  }

  /* a long silence with nothing scheduled is the silence itself */
  if (noWord && c.expectedYmd && c.expectedYmd < today) return noWord;

  if (c.expectedYmd) return `Out with ${who} — reply expected by ${whenSaid(c.expectedYmd, today)}`;
  return `Out with ${who} — no reply time given`;
}


/* ══ THE NOTE AFTER THE BAR ═══════════════════════════════════════════════════════════════════
 *
 * ⚠️ THE NOTE IS RESERVED FOR ACTIONS, AND A ROW WITH NOTHING TO DO SHOWS NOTHING. It is set in a
 * hand — Caveat, burgundy, tilted — and a hand implies that a PERSON wrote it. The person it
 * implies is the writer. So scrawling on a row where nothing is being asked of them puts words in
 * their mouth about work they have not got, which is why nothing waiting, quiet or closed is ever
 * written on: the hand belongs to actions only.
 *
 * ⚠️ AND THE NOTE NEVER SAYS WHAT THE BAR SAYS. The bar states what a stretch of time IS; the note
 * states what to do about it. The ref itself breaks this once — its `cold` bar reads "Quiet for 78
 * days · nudge or close it" above a note reading "Nudge or close it" — and the rule wins over the
 * artefact: the instruction lives in the note and the bar keeps the fact.
 */
export interface RowNote {
  /** the deed — underlined by hand, because it is the thing to do */
  deed: string;
  /** when it is for — plain, because a date is not an instruction. "" where none applies. */
  timing: string;
}

/**
 * ⚠️ ONLY TWO GROUPS ARE EVER WRITTEN ON, and it is the GROUP that decides rather than the status.
 * A row is in "Needs you now" or "Offers" precisely when something is being asked of the writer —
 * that judgement is already made, once, in `timelineGroups`, and re-deriving it here from statuses
 * would be a second answer to a settled question that could disagree with the group heading three
 * inches above it.
 */
/* ⚠️ THE SECOND PREDICATE IS DELETED. `WRITTEN_ON` was a hand-written copy of `ASKING_GROUPS`,
   and two lists naming the same three groups is one edit away from disagreeing. `rowNote` now
   asks `asksOfYou`, which is the same function the group heading, the deed button and the
   `RIGHT NOW` filter ask. */

/** What to do, in the writer's own imperative. */
const DEED: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "Send the partial",
  [QueryStatus.FULL_REQUESTED]: "Send the full",
  [QueryStatus.REVISE_RESUBMIT]: "Send the revision",
  [QueryStatus.OFFER]: "Answer them",
};

/**
 * When a deed is for, stated as a fact.
 *
 * ⚠️ NEVER "OVERDUE" — not in the copy, not in a class name, not in a token. It is a verdict twice
 * over: it says the writer failed, and it implies a deadline that mostly does not exist. "due 15
 * days ago" states the identical fact and accuses nobody.
 */
function timingFor(ymd: string | null, today: string): string {
  if (!ymd) return "";
  const d = gap(today, ymd);
  if (d === 0) return "due today";
  if (d > 0) return `by ${whenSaid(ymd, today)}`;
  return `due ${plural(-d, "day")} ago`;
}

export function rowNote(c: RowCopy, group: RowGroup | null, today: string): RowNote | null {
  if (!asksOfYou(group)) return null;

  const deed = DEED[c.status];
  if (deed) return { deed, timing: timingFor(c.expectedYmd, today) };

  /* ⚠️ A NUDGE THAT HAS FALLEN DUE IS AN ACTION, and it is the one deed that comes from a DATE
     rather than from a status — the query is still simply out with the agent. */
  if (c.nudgeYmd && c.nudgeYmd <= today) {
    return { deed: "Nudge them", timing: timingFor(c.nudgeYmd, today) };
  }

  /* ⚠️ GONE QUIET OFFERS A CHOICE, not an instruction, because there is no right answer: a
     relationship that has stopped answering can be chased or let go, and the app does not know
     which. It carries no timing — there is no date to be for. */
  if (c.expectedYmd && c.expectedYmd < today) return { deed: "Nudge or close it", timing: "" };

  /**
   * ⚠️ THE GENERIC IS GONE, AND ITS ABSENCE IS THE POINT (v36, Phase 7).
   *
   * "Open the query" is a dash wearing a costume: it occupies the one place on the row that is
   * meant to say what is owed, and says nothing. It existed because the deed was asked of the
   * row's LEAD query while the GROUP came from whichever query earned it — so on a row holding
   * several, the copy could be looking at a query the heading was not about. That mismatch is
   * fixed where it belongs (`todoTimeline` picks the earner), so every asking row now reaches one
   * of the named branches above.
   *
   * ⚠️ AND `null` IS THE HONEST FALLBACK IF ONE EVER DOES NOT. A row that reaches here is a row
   * the app cannot say anything true about — a dash is what that looks like, and it is a bug
   * report rather than a costume. The lock asserts no asking row renders one.
   */
  return null;
}

/* ══ WHETHER A SCRAWL EARNS ITS PLACE (Porcelain, Phase 6) ═══════════════════════════════════ */

