/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CALENDAR'S SIX SECTIONS — one strict partition of the board's rows (v60).
 *
 * `design-refs/timeline-v60.html` files every row into one of six white section containers:
 * Urgent · Upcoming · With agents · Gone quiet · Tasks · Closed. This module is that membership
 * rule and nothing else — no ordering, no labels of urgency, no counting.
 *
 * ⚠️ IT IS A CASCADE, NOT SIX PREDICATES, AND THE REF'S OWN SIX OVERLAP.
 *
 * The ref runs `rows.filter(gp.f)` once per group with each predicate re-stating its exclusions,
 * which is a partition only for as long as no row satisfies two. Two of them do overlap: `over`
 * is `!shut && isUrgent` and `quiet` is `!shut && pk === 'quiet'`, and NEITHER excludes the other.
 * The ref's fixture never produces a row that is both — its three quiet rows carry no dates at all
 * — so the fault is invisible there. In the app it is reachable the moment an agency that has gone
 * silent for years had once stated a reply date: the row is a long silence AND an estimate that
 * has passed. Under the ref's shape it would be drawn TWICE, on two different sections, and the
 * pack requires the counts to sum.
 *
 * A first-match cascade cannot double-count, so that is the shape here, and the order below is the
 * whole of the rule.
 *
 * ⚠️ AND THE ORDER PUTS `quiet` ABOVE `over`, WHICH IS THE DECISION THE REF LEAVES OPEN.
 *
 * The overlapping row is a query silent for years whose stated reply date passed with it. Both
 * sections would take it and they say opposite things: Urgent's whole claim is that a prompt is
 * worth sending, and Gone quiet's is that this one is past prompting — which is why the ref gives a
 * quiet row a `Close query?` flag and an urgent one `Nudge them`. Offering to nudge an agency that
 * has said nothing for two years is not a prompt anybody would act on. The silence wins.
 */

/** ⚠️ Namespaced `cal…`: `RowGroup` in `timelineGroups.ts` is a DIFFERENT partition, still live. */
export type CalSection = "task" | "shut" | "quiet" | "over" | "need" | "with";

/**
 * ⚠️ THE CASCADE ORDER, NOT THE DRAWING ORDER — the two differ and both are needed.
 *
 * A cascade is decided by precedence; a board is read top-down by urgency. Keeping them in one
 * array would force one of the two to be wrong, so each is stated once and `CAL_SECTION_DRAW`
 * carries a completeness assertion against this one.
 */
export const CAL_SECTION_CASCADE: readonly CalSection[] = [
  "task", "shut", "quiet", "over", "need", "with",
];

/** The order the sections are drawn in — the ref's `G` array, top to bottom. */
export const CAL_SECTION_DRAW: readonly CalSection[] = [
  "over", "need", "with", "quiet", "task", "shut",
];

/**
 * What each group is FOR, in a sentence — the bar's right-hand eyebrow.
 *
 * ⚠️ A NAME IS A LABEL A READER HAS TO DECODE; THIS IS THE THING ITSELF. "Gone quiet" tells you
 * what the group is called and leaves you to work out what it holds; "No reply for a long while"
 * is what it holds. The group bar is full width, so there is room for both — the name to find the
 * group by, the sentence to know it by.
 */
export const CAL_SECTION_PURPOSE: Record<CalSection, string> = {
  over: "Needs you now",
  need: "Coming up",
  with: "Waiting on a reply",
  quiet: "No reply for a long while",
  task: "Your to-dos",
  shut: "For the record",
};

/**
 * What the SIDEBAR calls each section — and it is not always what the group bar calls it.
 *
 * ⚠️ ONE SECTION, TWO NAMES, AND THAT IS A DECISION RATHER THAN AN INCONSISTENCY. The bar names
 * the STATE of the rows under it — "Urgent" — because that is what a heading over a run of rows is
 * for. The view names what it does for the READER — "Needs me" — because that is what you are
 * choosing when you click it. The ref carries both tables and they differ on exactly this one
 * entry; every other name is shared, which is what makes the difference legible rather than a slip.
 */
export const CAL_SECTION_VIEW: Record<CalSection, string> = {
  over: "Needs me",
  need: "Upcoming",
  with: "With agents",
  quiet: "Gone quiet",
  task: "Tasks",
  shut: "Closed",
};

/** Section headings, as the ref writes them. */
export const CAL_SECTION_LABEL: Record<CalSection, string> = {
  over: "Urgent",
  need: "Upcoming",
  with: "With agents",
  quiet: "Gone quiet",
  task: "Tasks",
  shut: "Closed",
};

/**
 * The ref's `UP` — a dated next move this close promotes an agency-held row to Upcoming.
 *
 * ⚠️ A THRESHOLD, AND THE ONLY ONE IN THIS FILE. It is the ref's stated value; every other
 * boundary here is a fact about the record rather than a number.
 */
export const UPCOMING_WINDOW_DAYS = 14;

export interface CalSectionFacts {
  /** A task or note row — it belongs to no agency, which is what makes it its own section. */
  isTask: boolean;
  /** Every query on the row has ended: rejected, withdrawn, or a stated no-reply window passed. */
  isClosed: boolean;
  /** A silence past the board's long-silence threshold. */
  isQuiet: boolean;
  /**
   * A date that has passed and still asks for something.
   *
   * ⚠️ TWO SOURCES, AND THE SECOND IS NEW IN v60 (Law 9). A writer-owed date that has passed, OR
   * an agency's stated reply estimate that has passed on a wait that is still running — the ref's
   * Priya case. The app's earlier law was `journeyBars`' "the writer's own dates only", which filed
   * a passed estimate as a silence and prompted nothing; v60 says both prompt, so both are urgent.
   */
  isUrgent: boolean;
  /** The writer holds the move on at least one query — they owe the agency something. */
  writerHolds: boolean;
  /**
   * Days until the row's next dated action, or null where it has none.
   *
   * ⚠️ FORWARD-LOOKING ONLY. A negative value is a date that has already passed, which is
   * `isUrgent`'s business rather than this one's; the ref gates on `to >= 0 && to <= UP`.
   */
  nextDatedIn: number | null;
}

/**
 * Which section a row is drawn in. Total by construction: every row lands in exactly one.
 */
export function calSectionOf(f: CalSectionFacts): CalSection {
  if (f.isTask) return "task";
  if (f.isClosed) return "shut";
  if (f.isQuiet) return "quiet";
  if (f.isUrgent) return "over";
  if (f.writerHolds) return "need";
  if (f.nextDatedIn !== null && f.nextDatedIn >= 0 && f.nextDatedIn <= UPCOMING_WINDOW_DAYS) {
    return "need";
  }
  return "with";
}
