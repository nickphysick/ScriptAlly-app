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
export type TimelineTab = "all" | "needs" | "agents" | "tasks" | "closed";

export const TAB_ORDER: readonly TimelineTab[] = ["all", "needs", "agents", "tasks", "closed"];

export const TAB_LABEL: Record<TimelineTab, string> = {
  all: "All",
  needs: "Needs me",
  agents: "With agents",
  tasks: "Tasks",
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
  /**
   * ⚠️ A TASK ROW HAS ITS OWN VIEW NOW (v54, Phase 6), AND THAT IS WHAT STOPS A DOUBLE COUNT.
   *
   * It used to return "needs": a task is the writer's own, so it belonged with what is being asked
   * of them. With a `Tasks` tab beside `Needs me`, filing it under both would put two of the
   * board's rows in two views at once — measured before this change, `Needs me` read 9 against 23
   * rendered rows with 2 of the 9 being tasks, so adding a fifth tab without moving them would
   * have given 9 + 14 + 2 + 0 = 25 against 23. `hasDatedTask` is no longer consulted: a task
   * belongs to the writer whether or not it carries a date.
   */
  if (group === null) return "tasks";
  if (group === "closed") return "closed";
  return asksOfYou(group, hasDatedTask) ? "needs" : "agents";
}

/** Does this row belong in the named view? */
export function rowInTab(
  tab: TimelineTab, group: RowGroup | null, hasDatedTask = false,
): boolean {
  return tab === "all" || tabOf(group, hasDatedTask) === tab;
}

/**
 * How the board is arranged (v54, Phase 6).
 *
 * ⚠️ FOUR MODES OF ONE LIST, NOT FOUR BOARDS. Grouping buckets the rows the page already has — it
 * fetches nothing, filters nothing and re-derives nothing — which is why a lock can assert that
 * any two modes hold the identical row set by identity. The moment one of them starts choosing
 * which rows exist it has become a filter wearing a grouping's name, and the tabs are the filter.
 */
export type GroupMode = "list" | "move" | "status" | "manuscript";

export const GROUP_MODES: readonly GroupMode[] = ["list", "move", "status", "manuscript"];

export const GROUP_MODE_LABEL: Record<GroupMode, string> = {
  list: "One list",
  move: "Whose move",
  status: "Status",
  manuscript: "Manuscript",
};

/**
 * Which bucket a row falls in under a given mode.
 *
 * ⚠️ `list` RETURNS NULL RATHER THAN ONE BUCKET NAMED "everything". A single bucket would draw a
 * heading over the flat list, which is the one thing the flat list is for not having.
 *
 * ⚠️ AND `move` READS THE SAME `tabOf` THE TABS READ. Two answers to "whose move is this" is how a
 * heading and a tab come to disagree about one row — the fault `ASKING_GROUPS` was written to end.
 */
export function groupKeyOf(
  mode: GroupMode,
  row: { group: RowGroup | null; hasDatedTask?: boolean; manuscript?: string | null },
): string | null {
  switch (mode) {
    case "list": return null;
    case "move": return tabOf(row.group, row.hasDatedTask ?? false);
    case "status": return row.group ?? "tasks";
    case "manuscript": return row.manuscript || "No manuscript";
    default: {
      const unhandled: never = mode;
      return unhandled;
    }
  }
}
