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
import { BoardColumns } from "./todoColumns";
import { liveFamily } from "./todoFamily";

export type TaskGroupId = "now" | "housekeeping" | "yours" | "snoozed" | "done";

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
export const TASK_GROUP_ORDER: TaskGroupId[] = ["now", "housekeeping", "yours", "snoozed", "done"];

const META: Record<TaskGroupId, { label: string; description: string }> = {
  now: {
    label: "Needs you now",
    description: "An agent is waiting, or a date is.",
  },
  housekeeping: {
    label: "Housekeeping",
    description: "Small tidying the app can see — none of it urgent.",
  },
  yours: {
    label: "Your tasks",
    description: "Things you set yourself, and notes with a date.",
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

  const all: TaskGroup[] = [
    { id: "now", ...META.now, cards: byFamily("urgent") },
    { id: "housekeeping", ...META.housekeeping, cards: byFamily("housekeeping") },
    { id: "yours", ...META.yours, cards: byFamily("yours") },
    { id: "snoozed", ...META.snoozed, cards: cols.snoozed },
    { id: "done", ...META.done, cards: cols.done },
  ];
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
 */
export function taskStats(cols: BoardColumns, estimatedMin: number): TaskStat[] {
  const live = [...cols.todo, ...cols.today];
  const now = live.filter((c) => liveFamily(c) === "urgent").length;
  const out: TaskStat[] = [
    { label: "Outstanding", value: String(live.length) },
    { label: "Needs you now", value: String(now) },
    { label: "Done today", value: String(cols.done.length) },
    { label: "Snoozed", value: String(cols.snoozed.length) },
  ];
  /* ⚠️ The estimate chip is absent when nothing carries an estimate — "0 min" states an absence
     as a figure and invites the reader to believe the day is empty. (The same rule the retired
     Today page's stat row was built on; it carries over intact.) */
  if (estimatedMin > 0) out.push({ label: "Estimated", value: `${estimatedMin} min` });
  return out;
}
