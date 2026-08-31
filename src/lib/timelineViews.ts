import { type RowGroup, asksOfYou } from "./timelineGroups";

/**
 * The Calendar's four views (v40, Phase 6).
 *
 * ⚠️ THE TABS PARTITION THE BOARD, AND THAT IS WHY SNOOZED FOLDS INTO `With agents`.
 *
 * The obvious mapping — needs = the asking groups, agents = `watching`, closed = `closed` — leaves
 * `snoozed` and `soon` in no tab but `All`, so three counts sit beside a fourth they do not add up
 * to and a reader has no way to find out why. Both belong with the agent: `soon` is a reminder
 * coming with nothing asked of the writer yet, and a snooze is the writer deferring their own
 * ATTENTION, not a change in whose move it is. The relationship is still out.
 *
 * ⚠️ AND THE VIEWS READ THE GROUPS RATHER THAN RE-DERIVING FROM STATUS. `RowGroup` already answers
 * "where does this stand", the board's headings draw it, and a second answer here would let a tab
 * and a heading disagree about one row — which is the fault `ASKING_GROUPS` was written to end
 * after a row sat under "Needs you now" with a dash in its action column.
 */
export type TimelineTab = "all" | "needs" | "agents" | "closed";

export const TAB_ORDER: readonly TimelineTab[] = ["all", "needs", "agents", "closed"];

export const TAB_LABEL: Record<TimelineTab, string> = {
  all: "All",
  needs: "Needs me",
  agents: "With agents",
  closed: "Closed",
};

/**
 * Which single view a row belongs to, `all` aside.
 *
 * ⚠️ A TASK ROW IS ALWAYS THE WRITER'S OWN. It belongs to no query, so it has no group — and it is
 * something the writer wrote down for themselves, which is `Needs me` whatever its date says. It
 * can never be with an agent and it can never be closed.
 */
export function tabOf(group: RowGroup | null, hasDatedTask = false): Exclude<TimelineTab, "all"> {
  if (group === null) return "needs";
  if (group === "closed") return "closed";
  return asksOfYou(group, hasDatedTask) ? "needs" : "agents";
}

/** Does this row belong in the named view? */
export function rowInTab(
  tab: TimelineTab, group: RowGroup | null, hasDatedTask = false,
): boolean {
  return tab === "all" || tabOf(group, hasDatedTask) === tab;
}
