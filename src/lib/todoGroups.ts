/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoGroups — the consolidated Tasks page's five groups, derived (tasks-consolidation, Phase 2;
 * ref design-refs/tasks-page.html).
 *
 * ⚠️ GROUPS ARE A VIEW OF THE ONE DERIVATION, NEVER A SECOND ONE. Every card here comes from
 * `assembleBoardColumns` — the same call the sidebar badge and every FILTERS count read — and is
 * only re-sorted into groups by rules that are already stated elsewhere (`liveFamily` for the
 * three live groups, the columns themselves for Snoozed and Done). Nothing is counted twice and
 * nothing is derived a second way, so no two surfaces can disagree about what is outstanding.
 *
 * ⚠️ NO STORED ORDERING OR PLACEMENT, EVER. A group is a question about a card the app can already
 * answer; a card's position inside one is the sort's output. Neither is written down. That is what
 * lets the page be rebuilt without a migration, and it is the law the board was built on too.
 *
 * ⚠️ THE BOARD'S FOUR COLUMNS ARE RETIRED HERE, NOT REPRODUCED. "To do / Today / Snoozed / Done"
 * asked the writer to place work; the ranked order IS the plan now, so the groups answer "what
 * KIND of thing is this" instead of "where did you put it".
 */
import { BoardCard } from "./todoBoard";
import { TodoColumnId } from "./todoColumns";
import { BoardColumns } from "./todoColumns";
import { liveFamily } from "./todoFamily";

/**
 * ⚠️ FIVE MEMBERS, TWO NATURES — three KINDS and two STATES, and the rebuild kept both (rail +
 * workspace, Phase 1). The three kinds answer "what sort of thing is this"; Snoozed and Done
 * answer "what has happened to it". Collapsing the states into the kinds was considered and
 * refused: a card is asleep or finished IN ADDITION to being urgent or housekeeping, so folding
 * them in would file one card under two questions at once.
 *
 * ⚠️ `urgent` WAS `now`, AND THE RENAME IS A UNIFICATION RATHER THAN A PREFERENCE. `TODO_LISTS`
 * (todoRoutes) already shipped the words "urgent / Urgent" while this module said "now / Needs you
 * now" — two vocabularies for one set, which is the drift every other law on this page exists to
 * prevent. The id is not stored anywhere (the one browser-storage key that sounds related,
 * `sa.todoGroupsOpen`, is keyed by SWEEP RULE), so the rename needed no migration.
 */
export type TaskGroupId = "urgent" | "housekeeping" | "yours" | "snoozed" | "done";

export interface TaskGroup {
  id: TaskGroupId;
  /** The Playfair name, outside and above the panel. */
  label: string;
  /** The plain sentence beneath it — what the group IS, never what it is called. */
  description: string;
  cards: BoardCard[];
}

/**
 * ⚠️ THE ORDER IS THE ARGUMENT: what needs you, then what the app can tidy, then what you set
 * yourself, then what is asleep, then what is finished. It descends from "someone is waiting" to
 * "nothing is waiting", which is the only ordering a writer never has to think about.
 */
export const TASK_GROUP_ORDER: TaskGroupId[] = ["urgent", "housekeeping", "yours", "snoozed", "done"];

/**
 * ⚠️ THE NAMES LIVE HERE AND NOWHERE ELSE — `TODO_LISTS` imports them rather than restating them.
 * Two hand-kept lists is precisely how "Needs you now" and "Urgent" came to name one set.
 *
 * ⚠️ THE DESCRIPTIONS KEEP THEIR FULL STOPS. The pack's table prints them without one; a table
 * dropping terminal punctuation is a typographic habit, not a copy instruction, and this module
 * already carries a lock reading "a sentence, not a label" over exactly these five strings.
 */
export const TASK_GROUP_META: Record<TaskGroupId, { label: string; description: string }> = {
  urgent: {
    label: "Urgent",
    description: "An agent is waiting, or a date is.",
  },
  housekeeping: {
    label: "Housekeeping",
    description: "Small tidying the app can see.",
  },
  yours: {
    label: "Your tasks",
    description: "Added by you.",
  },
  snoozed: {
    label: "Snoozed",
    description: "Put away until their day.",
  },
  done: {
    label: "Done today",
    description: "Cleared since midnight. It clears itself overnight.",
  },
};

/**
 * ⚠️ A GROUP WITH NOTHING IN IT DOES NOT RENDER — it is not an empty panel with a heading. An
 * empty section states a category the writer has no business in today, and five of them stack
 * into a page that looks full of nothing. The caller renders what this returns.
 */
export function taskGroups(cols: BoardColumns): TaskGroup[] {
  /* The live cards are the three working columns flattened: the board's To do / Today split was a
     placement question, and placement is retired. Done and Snoozed keep their own columns because
     they are STATES rather than kinds. */
  const live = [...cols.todo, ...cols.today];
  const byFamily = (f: ReturnType<typeof liveFamily>) => live.filter((c) => liveFamily(c) === f);

  /* ⚠️ BUILT FROM `TASK_GROUP_ORDER`, not from a second hand-written list in the same order. The
     order and the membership were two places to state one sequence, and the group ids are the
     `liveFamily` values for the three kinds — so the map below is the only thing that has to
     know a kind from a state. */
  const cardsFor = (id: TaskGroupId): BoardCard[] =>
    id === "snoozed" ? cols.snoozed
    : id === "done" ? cols.done
    : byFamily(id);

  const all: TaskGroup[] = TASK_GROUP_ORDER.map((id) => ({ id, ...TASK_GROUP_META[id], cards: cardsFor(id) }));
  return all.filter((g) => g.cards.length > 0);
}

/**
 * ⚠️ HOUSEKEEPING FOLDS PAST THIS; NOTHING ELSE DOES. It is the one group that can run to dozens
 * without any of it mattering today, so it opens at a readable length and says how much it is
 * holding back. The urgent group is never folded — hiding something that needs you now behind a
 * "show more" is the one thing this page must not do.
 */
export const HOUSEKEEPING_VISIBLE = 4;

export function groupSlice(g: TaskGroup, expanded: boolean): { visible: BoardCard[]; more: number } {
  if (g.id !== "housekeeping" || expanded) return { visible: g.cards, more: 0 };
  return {
    visible: g.cards.slice(0, HOUSEKEEPING_VISIBLE),
    more: Math.max(0, g.cards.length - HOUSEKEEPING_VISIBLE),
  };
}

/** "SHOW 7 MORE" — the pill states the figure, so the fold is a choice rather than a surprise. */
export function showMoreLabel(more: number): string {
  return `SHOW ${more} MORE`;
}

/* ── the rail's filter chips (rail + workspace, Phase 4) ───────────────────────────────────── */

/**
 * ⚠️ THE CHIPS ARE THE GROUPS, PLUS "ALL" — never a second facet vocabulary. The page shipped one
 * of those already (`todoFilters`' seven types: offers · overToYou · materials · mswl · stale ·
 * snoozed · notes), written for a sidebar that no longer exists and no longer narrowing anything
 * the rail draws. A chip strip in a third vocabulary beside the group headings is how a page comes
 * to file one card under two names, which is the fault Phase 1 spent a commit removing.
 *
 * ⚠️ DONE IS NOT A CHIP, DELIBERATELY. The chips answer "what do you want to look at", and
 * finished work is not something you look FOR — it is where things go. It still renders under All
 * as its own group, which is where you find it.
 */
export type RailChipId = "all" | "urgent" | "housekeeping" | "yours" | "snoozed";

export interface RailChip {
  id: RailChipId;
  label: string;
  /** OPEN cards under this chip — live, and never a stored figure. */
  count: number;
}

export const RAIL_CHIP_ORDER: RailChipId[] = ["all", "urgent", "housekeeping", "yours", "snoozed"];

/**
 * ⚠️ EVERY COUNT COMES FROM `taskGroups`, so a chip and the heading it names cannot disagree.
 * "All" is the three LIVE kinds — it is what is outstanding, which is the same figure the
 * "Outstanding" stat chip states, and deliberately not the sum of every group (Done is not
 * outstanding and Snoozed is asleep).
 *
 * ⚠️ THE SNOOZED CHIP IS ABSENT AT ZERO, and only that one. The three kinds are the page's
 * permanent vocabulary and a `0` beside one of them is information — nothing needs you in that
 * pile today. Snoozed is a state you may never have used at all, and a chip for it would teach a
 * feature rather than report a fact.
 */
export function railChips(cols: BoardColumns): RailChip[] {
  const groups = taskGroups(cols);
  const count = (id: TaskGroupId) => groups.find((g) => g.id === id)?.cards.length ?? 0;
  const live = count("urgent") + count("housekeeping") + count("yours");
  const out: RailChip[] = [
    { id: "all", label: "All", count: live },
    { id: "urgent", label: TASK_GROUP_META.urgent.label, count: count("urgent") },
    { id: "housekeeping", label: TASK_GROUP_META.housekeeping.label, count: count("housekeeping") },
    { id: "yours", label: TASK_GROUP_META.yours.label, count: count("yours") },
  ];
  const asleep = count("snoozed");
  if (asleep > 0) out.push({ id: "snoozed", label: TASK_GROUP_META.snoozed.label, count: asleep });
  return out;
}

/**
 * Which groups a chip shows. `all` shows everything the derivation returned — including Done,
 * which has no chip of its own precisely because All is where you find it.
 */
export function chipGroups(groups: TaskGroup[], chip: RailChipId): TaskGroup[] {
  if (chip === "all") return groups;
  return groups.filter((g) => g.id === chip);
}

/**
 * ⚠️ THE SAME NARROWING, ASKED OF ONE CARD — this is what the workspace pane's queue reads, so
 * the pane walks exactly the set the rail is showing.
 *
 * ⚠️ A SNOOZED CHIP MATCHES NO LIVE CARD, AND THAT IS CORRECT RATHER THAN A HOLE. The pane's list
 * is the three live kinds; a sleeping card is not in it. Narrowing the rail to Snoozed therefore
 * empties the pane's queue — which is the case the pane HOLDS its selection for, rather than
 * clearing itself because a filter moved.
 */
export function chipMatchesCard(chip: RailChipId, c: BoardCard): boolean {
  if (chip === "all") return true;
  if (chip === "snoozed") return false;
  return liveFamily(c) === chip;
}

/* ── the header block ──────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE MONO EYEBROW IS THE DASHBOARD'S GRAMMAR, AND BOTH HALVES ARE THE DASHBOARD'S OWN
 * DERIVATIONS (`longDate` / `weekOfQuerying`) — imported by the caller rather than reimplemented,
 * so the two pages cannot disagree about the date or the week. It travelled here from the retired
 * Today page's `todoToday.ts`, unchanged: the page it sat on is gone, the line is not.
 */
export function tasksEyebrow(dateLine: string, weekLine: string): string {
  return `${dateLine} · ${weekLine} of querying`.toUpperCase();
}

/* ── the header's stat chips ───────────────────────────────────────────────────────────────── */

export interface TaskStat {
  label: string;
  value: string;
}

/**
 * ⚠️ ALL FOUR FIGURES COME FROM THE ONE DERIVATION, and each counts CARDS — the unit the groups
 * and the sidebar badge both speak. A sweep is one card however many agents it holds; that is the
 * settled law, and a chip that summed members would put 24 beside a page showing 16.
 *
 * "Outstanding" is everything live — it is deliberately NOT the sum of the visible groups, because
 * Snoozed is live work that is merely asleep and Done is not outstanding at all.
 *
 * ⚠️ THREE OF THE FOUR CHIPS NAME A GROUP, SO THEY READ THE GROUP'S OWN LABEL. They used to be
 * literals, and one of them ("Needs you now") outlived the group it named — a chip and a heading
 * counting the same cards under two different words. Only "Outstanding" and "Estimated" are the
 * chip row's own, because neither is a group.
 */
export function taskStats(cols: BoardColumns, estimatedMin: number): TaskStat[] {
  const live = [...cols.todo, ...cols.today];
  const urgent = live.filter((c) => liveFamily(c) === "urgent").length;
  const out: TaskStat[] = [
    { label: "Outstanding", value: String(live.length) },
    { label: TASK_GROUP_META.urgent.label, value: String(urgent) },
    { label: TASK_GROUP_META.done.label, value: String(cols.done.length) },
    { label: TASK_GROUP_META.snoozed.label, value: String(cols.snoozed.length) },
  ];
  /* ⚠️ The estimate chip is absent when nothing carries an estimate — "0 min" states an absence
     as a figure and invites the reader to believe the day is empty. (The same rule the retired
     Today page's stat row was built on; it carries over intact.) */
  if (estimatedMin > 0) out.push({ label: "Estimated", value: `${estimatedMin} min` });
  return out;
}

/**
 * ⚠️ LIFTED OUT OF `TaskList` WHEN THE LIST WAS PORTED. It maps a group id to the column whose
 * verbs apply to its cards, which is a fact about the MODEL — the list only ever imported it to
 * pass along. It survived the component because it was never part of it.
 */
export function groupColumn(id: TaskGroup["id"]): TodoColumnId {
  if (id === "snoozed") return "snoozed";
  if (id === "done") return "done";
  return "todo";
}
