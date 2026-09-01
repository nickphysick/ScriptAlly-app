import { QueryStatus } from "../types";
import { sideOf } from "./journeyBars";

/**
 * Which group a timeline row belongs to.
 *
 * ⚠️ THE now/soon SPLIT IS BY KIND, NOT BY A THRESHOLD, and that is the point of this module.
 * A day count would need tuning, would need explaining, and would put two rows in different groups
 * for a difference of one night. What separates them is what the query STATE says: whether the
 * agent has asked the writer for something, and whether the writer's own reminder has arrived.
 * Both are facts already in the record. Nothing here counts days except the closure linger, which
 * is a stated default rather than a derivation (see `CLOSED_LINGER_DAYS`).
 *
 * ⚠️ AND "OVERDUE" IS NOT A GROUP, NOT A FIELD AND NOT A WORD. It is a verdict twice over: it says
 * the writer failed, and it implies a deadline that mostly does not exist — nobody set a due date
 * on a partial requested six weeks ago. The fact is stated in the row's own words instead.
 */
export type RowGroup = "offers" | "now" | "soon" | "watching" | "snoozed" | "closed";

/**
 * ⚠️ THE ORDER IS THE RANK, AND THE RANK IS THE PRECEDENCE. One array, read both ways: the board
 * draws groups in this sequence, and a row holding several queries takes the EARLIEST group any of
 * them earns. Two arrays would be two things to keep in step.
 */
export const GROUP_ORDER: readonly RowGroup[] = [
  "offers", "now", "soon", "watching", "snoozed", "closed",
];

/**
 * ⚠️ OFFERS ARE ALWAYS THEIR OWN GROUP, EVEN AT ONE ROW. An offer is categorically different from
 * everything else on this board — rare, time-bound, and the thing the product exists for. Folding
 * a single offer into "Needs you now" would file the best news a writer gets among the chores.
 */
export const GROUP_LABEL: Record<RowGroup, string> = {
  offers: "Offer on the table",
  now: "Needs you now",
  soon: "Needs you soon",
  watching: "Watching brief",
  snoozed: "Snoozed",
  closed: "Recently closed",
};

/** Snoozed is collapsed at rest: a quiet group is honest, and disappearing is not. */
/**
 * ⚠️ SNOOZED **AND** RECENTLY CLOSED (v36, Phase 6). Both are history rather than work — one is
 * the writer saying "not yet", the other a relationship that has ended — and a board opens on what
 * is being asked. A quiet group is honest; disappearing is not, so both keep their heading, their
 * count and their `show ›`.
 */
export const COLLAPSED_BY_DEFAULT: readonly RowGroup[] = ["snoozed", "closed"];

/**
 * How long a closure lingers before the row goes.
 *
 * ⚠️ A STATED DEFAULT, NOT A DERIVED ONE — flagged for Nick rather than argued for here. It is the
 * only day count in this file, and it is a retention policy rather than a classification: nothing
 * about which group a row is in depends on it.
 */
export const CLOSED_LINGER_DAYS = 30;

/** What one live query contributes. Every field is already in the record; none is computed here. */
export interface QueryFacts {
  status: QueryStatus;
  /** `Query.nudgeDate` as a ymd — the reminder the WRITER set, never a promise the agent made. */
  nudgeYmd: string | null;
  /** `TaskFlag.snoozedUntil` as a ymd — when the writer asked to be shown this again. */
  backYmd: string | null;
}

const rank = (g: RowGroup): number => GROUP_ORDER.indexOf(g);

/**
 * One live query's group.
 *
 * ⚠️ EVERY BRANCH READS A FACT, AND THE ONE THAT DECIDES "the agent asked for something" IS
 * `sideOf` — the app-wide CTA engine, which is what the bar colours, the filters and the row dot
 * already read. Listing the statuses here instead would be a second copy of a mapping that exists,
 * and the day one moved the board and the bars would disagree about whose move it is.
 */
/* ══ ONE PREDICATE: DOES THIS ASK SOMETHING OF YOU? (fix pack, Phase 4) ═════════════════════ */

/**
 * The three groups that are asking something of the writer.
 *
 * ⚠️ THE GROUPS ARE THE DEFINITION, AND EVERYTHING ELSE READS THEM. Membership of one of these,
 * the presence of a deed button, and the `RIGHT NOW` filter were three separate answers to one
 * question — so a row could sit under "Needs you now" with a dash in its action column and a
 * scrawl telling the writer to send a partial. Measured: one of five.
 */
export const ASKING_GROUPS: readonly RowGroup[] = ["offers", "now"];

/**
 * Does this row ask something of the writer?
 *
 * ⚠️ IT TAKES THE GROUP, WHICH IS THE POINT. The group is already derived from the whole row —
 * every query on it, the snooze, the reminder — by `rowGroupOf`, and a second predicate reading a
 * single lead query is how the two came to disagree: the group was the EARLIEST group across all
 * of a row's queries while the deed read the MOST ADVANCED one. One derivation, consulted twice,
 * cannot disagree with itself.
 *
 * ⚠️ AND THE PINNED TASK ROWS ANSWER `true` BY THEIR OWN RULE, not by a group: a dated task of the
 * writer's own is asking something by existing. `group === null` is how a task row says it belongs
 * to no query group, so the caller passes `hasDatedTask` for it.
 */
export function asksOfYou(group: RowGroup | null, hasDatedTask = false): boolean {
  if (group === null) return hasDatedTask;
  return ASKING_GROUPS.includes(group);
}

export function queryGroup(f: QueryFacts, today: string): RowGroup {
  if (f.status === QueryStatus.OFFER) return "offers";
  /* a live snooze is the writer saying "not yet" — it outranks everything except an offer */
  if (f.backYmd && f.backYmd > today) return "snoozed";
  /* the agent asked for something: materials requested, an R&R to resubmit */
  if (sideOf(f.status) === "yours") return "now";
  /* the writer's own reminder has arrived and there is still no reply */
  if (f.nudgeYmd && f.nudgeYmd <= today) return "now";
  /* a reminder is coming, but nothing is being asked of the writer yet */
  if (f.nudgeYmd) return "soon";
  /* out with an agent, nothing expected of the writer */
  return "watching";
}

/**
 * A row's group, or `null` when the row should not be drawn at all.
 *
 * ⚠️ `null` MEANS GONE, AND IT IS ONLY EVER A CLOSURE THAT HAS OUTSTAYED ITS WEEK. Returning
 * "closed" for those would keep every closure the writer has ever had on the board forever, which
 * is what happens today; returning `null` for a LIVE row would hide work.
 */
/**
 * Is this query CLOSED, for the board's purposes?
 *
 * ⚠️ THREE WAYS TO BE CLOSED, AND THE THIRD IS THE AGENCY'S OWN POLICY.
 *
 * Rejected, or Withdrawn, or — a query whose agency states that silence means no AND whose stated
 * window has passed. That third case is not a judgement the app is making: the agency published
 * the rule, the clock ran out, and the answer arrived by prior arrangement. It is the same fact a
 * rejection is, delivered differently.
 *
 * ⚠️ SILENCE ALONE IS STILL NOT A CLOSURE. An agency that states no such policy has simply not
 * replied: the writer can nudge it, and can choose to close it, which is why such a row keeps its
 * place under `With agents` and is offered a close rather than filed as one.
 *
 * A relationship that never got a reply has not ended: the writer can still nudge it, and can
 * still choose to close it — which is exactly why the board offers it a close. Filing it under
 * `Closed` puts a row the writer can still act on into the one view that says there is nothing
 * left to do, and takes it out of `With agents`, where they would look for it.
 *
 * ⚠️ AND `TERMINAL_STATUSES` IS LEFT ALONE. It is read by the agent list and the agent context,
 * where "terminal" means "this query is over" and No Response belongs; redefining it there to suit
 * a view would change a fact about the data to fix a fact about a tab.
 */
export const isBoardClosed = (
  status: QueryStatus,
  /**
   * The agency's own policy and its clock. Both are needed together and neither means anything
   * alone: a stated policy with time still on it is a live query, and a passed window at an agency
   * that states nothing is an ordinary silence.
   *
   * ⚠️ OPTIONAL, SO THE STATUS-ONLY CALL STILL MEANS WHAT IT SAYS. Omitting it asks only "is this
   * recorded as ended", which is the right question in a context that has no agent to hand — and
   * it can never widen the answer, only narrow it.
   */
  silence?: { statesNoMeansNo: boolean; windowPassed: boolean },
): boolean =>
  status === QueryStatus.REJECTED
  || status === QueryStatus.WITHDRAWN
  /**
   * ⚠️ AND ONLY WHERE THERE HAS BEEN NO RESPONSE — which is what "no response means no" is ABOUT.
   *
   * `QUERIED` is the one status that means sent and nothing back. Every other live status exists
   * because the agency replied: a partial request, a full request, an R&R, an offer. A policy about
   * silence cannot speak to a conversation that has started.
   *
   * Measured before this clause existed: `Send the partial` — a row the writer owed work on — was
   * swept into `Closed` because its agency happened to state the policy and the original window
   * had lapsed. That is the worst direction for this rule to fail in: work the writer must do,
   * filed under the one view that says there is nothing left to do.
   */
  || (status === QueryStatus.QUERIED
    && !!silence && silence.statesNoMeansNo && silence.windowPassed);

export function rowGroupOf(
  live: readonly QueryFacts[],
  lastClosedYmd: string | null,
  today: string,
  daysBetween: (from: string, to: string) => number,
): RowGroup | null {
  if (live.length) {
    /* ⚠️ THE EARLIEST GROUP ANY QUERY EARNS. A relationship with one snoozed query and one out
       with the agent is a watching brief, not a snoozed row — snoozing one book does not quieten
       the other. Taking the earliest is what makes that fall out rather than needing a rule. */
    return live.reduce<RowGroup>(
      (best, f) => (rank(queryGroup(f, today)) < rank(best) ? queryGroup(f, today) : best),
      "closed",
    );
  }
  /**
   * ⚠️ AN UNKNOWN CLOSURE DATE KEEPS THE ROW. `rejectedDate` and `lastStatusChange` are DERIVED
   * fields with a single writer, and a record that predates them — or an import that never had
   * them — carries neither. Returning `null` there would delete a relationship from the board
   * because a field is missing, which is a confident answer to a question we cannot answer.
   *
   * The two failures are not the same size. Keeping a stale closure costs a row the writer can
   * see and dismiss; hiding a real one costs them a record with nothing to say it went. So the
   * unknown case fails OPEN, and it lands exactly where today's board already puts every closure:
   * present, at the bottom. Four fixture rows found this within a minute of the linger landing.
   */
  if (!lastClosedYmd) return "closed";
  return daysBetween(lastClosedYmd, today) <= CLOSED_LINGER_DAYS ? "closed" : null;
}

/* ══ WHAT A GROUP SAYS (Porcelain, Phase 2; ref timeline-v35.html) ═══════════════════════════
 *
 * ⚠️ A HEADING NAMES A BUCKET; A SENTENCE SAYS WHY YOU ARE LOOKING AT IT. "Needs you soon" is a
 * label the writer has to decode; "Nothing to do yet; a reminder is coming" is the thing itself.
 * The ref carries one for every group and they are normative copy.
 *
 * ⚠️ TWO OF THEM STATE A COUNT AND STATE IT IN WORDS, which is why this is a function and not a
 * table. The ref writes "One offer, awaiting your answer" and "Four agents are waiting on you" —
 * prose, in a sentence, where a numeral would read as a tally beside the tally already there.
 */
const ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
  "Nineteen", "Twenty",
];

/**
 * A count as a word, falling back to the numeral past twenty.
 *
 * ⚠️ THE FALLBACK IS NOT A FAILURE. "Twenty-seven agents are waiting on you" is a sentence nobody
 * reads as a sentence; past twenty the numeral IS the more readable form, and a writer with that
 * many rows is scanning rather than reading.
 */
export const inWords = (n: number): string => (n >= 0 && n <= 20 ? ONES[n] : String(n));

/**
 * What the group says beneath its title, or `""` where it says nothing.
 *
 * ⚠️ `closed` DERIVES ITS SENTENCE FROM `CLOSED_LINGER_DAYS` RATHER THAN RESTATING IT. The ref's
 * own wording is "Kept for a month, then it leaves." — and the constant is SEVEN DAYS, so the
 * ref's sentence would be a false claim about what the app does the moment it was typed. This is
 * the house law that copy asserts only what the code does today, and it bites here in the one
 * direction that is easy to miss: the copy came from a normative artefact, so it arrived looking
 * already-approved. Derived, the two cannot disagree whatever the constant becomes.
 *
 * ⚠️ THE REF/CODE DIVERGENCE IS FLAGGED, NOT SILENTLY RESOLVED. Whether a closure should linger a
 * week or a month is Nick's call, not a copy edit; changing the constant to make a sentence true
 * is deciding a retention policy by typography.
 */
export function groupSentence(g: RowGroup, n: number): string {
  switch (g) {
    case "offers":
      return `${inWords(n)} ${n === 1 ? "offer" : "offers"}, awaiting your answer.`;
    case "now":
      return `${inWords(n)} ${n === 1 ? "agent is" : "agents are"} waiting on you.`;
    case "soon":
      return "Nothing to do yet; a reminder is coming.";
    case "watching":
      return "Out with agents. Nothing is asked of you.";
    case "snoozed":
      return "Quiet until their return dates.";
    case "closed":
      /* ⚠️ STILL DERIVED, AND THE CONSTANT MOVED RATHER THAN THE SENTENCE (fix pack, Phase 6).
         The ref said "Kept for a month" and the code said seven days, so shipping the ref's words
         would have been a false claim. Nick ruled for the ref: at a weekly visiting cadence a
         seven-day linger can hide a closure entirely — you look on Monday, it closed on Tuesday,
         and by your next visit it has gone. The sentence goes on deriving so the two can never
         disagree again, whichever way the constant moves next. */
      return `Kept for ${CLOSED_LINGER_DAYS === 30 ? "a month" : CLOSED_LINGER_DAYS === 7 ? "a week" : `${CLOSED_LINGER_DAYS} days`}, then it leaves.`;
    default: {
      const unhandled: never = g;
      return unhandled;
    }
  }
}

/**
 * The pinned row's own heading and sentence.
 *
 * ⚠️ IT IS A HEADING, NOT A SEVENTH `RowGroup`, and the difference is the whole reason it is here
 * rather than in `GROUP_ORDER`. A task belongs to no query, so it has no group — `rowGroupOf`
 * returns `null` for it and that null is DATA. The ref draws a heading above those rows, which is
 * a fact about the view; widening the data type so the view could have its heading would put a
 * view decision inside the classification every other reader shares.
 */
export const TASKS_HEADING = "Your tasks";
export const TASKS_SENTENCE = "Dated tasks of your own.";
