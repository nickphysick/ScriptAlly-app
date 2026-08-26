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
  offers: "Offers",
  now: "Needs you now",
  soon: "Needs you soon",
  watching: "Watching brief",
  snoozed: "Snoozed",
  closed: "Recently closed",
};

/** Snoozed is collapsed at rest: a quiet group is honest, and disappearing is not. */
export const COLLAPSED_BY_DEFAULT: readonly RowGroup[] = ["snoozed"];

/**
 * How long a closure lingers before the row goes.
 *
 * ⚠️ A STATED DEFAULT, NOT A DERIVED ONE — flagged for Nick rather than argued for here. It is the
 * only day count in this file, and it is a retention policy rather than a classification: nothing
 * about which group a row is in depends on it.
 */
export const CLOSED_LINGER_DAYS = 7;

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
