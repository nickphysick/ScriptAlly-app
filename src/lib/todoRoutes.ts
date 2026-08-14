/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoRoutes — the four To-do pages, and the five LISTS, named once.
 *
 * ⚠️ ONE SOURCE FOR THE FOUR ROUTES. They appear in the app sidebar's To-do group, in the command
 * palette, and in App.tsx's routing. Three lists that agreed by hand would stop agreeing the first
 * time a page was renamed.
 *
 * ⚠️ THE APP SIDEBAR IS THE SOLE NAVIGATION for these pages (owner's call). The page's own side
 * container carries LISTS, TAGS and Task settings — no page-name links, no second active state.
 * Two nav surfaces for one set of destinations is how a workspace starts disagreeing about where
 * you are.
 */
import { FAMILY_SWATCH, EXTRA_SWATCH } from "./todoFamily";
import { TASK_GROUP_META } from "./todoGroups";

/* ⚠️ THREE PAGES SINCE 9 Aug — Today is retired (tasks-consolidation P1). The ranked order of the
   one list IS the plan, so a second page over an overlapping subset of the same tasks was the
   over-complication; "Work the list" moved to the survivor's tool row.

   ⚠️ NO REDIRECT CODE WAS ADDED, DELIBERATELY. `todoPageForPath` already answers `list` for any
   unmatched `/todo*`, so `/todo/today` lands on the page that absorbed the job — an old link or
   bookmark keeps working without a redirect table anyone has to maintain. The fallback was
   written for a different reason and happens to be exactly right here; `todoWorkspace.test.ts`
   asserts it against the retired path so it cannot quietly stop being true. */
export type TodoPageId = "list" | "calendar" | "noteboard";

export interface TodoRoute {
  id: TodoPageId;
  label: string;
  path: string;
  /** The palette's one-line explanation — what the page is FOR, not what it is called. */
  blurb: string;
}

/** The default is the bare `/todo`, so an existing link or bookmark still lands somewhere real. */
export const TODO_ROUTES: TodoRoute[] = [
  { id: "list", label: "To-do list", path: "/todo", blurb: "Everything waiting on you, most pressing first" },
  { id: "calendar", label: "Calendar", path: "/todo/calendar", blurb: "Your work by date" },
  { id: "noteboard", label: "Noteboard", path: "/todo/noteboard", blurb: "Notes to self, undated" },
];

export function todoPageForPath(pathname: string): TodoPageId | null {
  // Longest first: "/todo" is a prefix of every other route, so a first-match scan would answer
  // "list" everywhere — the same class of bug as the shell's /agents vs /agents/discover.
  const byLength = [...TODO_ROUTES].sort((a, b) => b.path.length - a.path.length);
  return byLength.find((r) => pathname === r.path)?.id
    ?? (pathname.startsWith("/todo") ? "list" : null);
}

/**
 * THE FIVE LISTS (audit item 4). Snoozed is the fifth, and it is the whole point of the item:
 * without it, a snoozed item was findable nowhere in list view — only on the board.
 *
 * ⚠️ DISMISSED IS DELIBERATELY ABSENT. It lives in the Task settings ledger by design; the page
 * search's include-toggle is what reaches both (audit item 9).
 */
export type TodoListId = "urgent" | "housekeeping" | "yours" | "notes" | "snoozed";

export interface TodoList {
  id: TodoListId;
  label: string;
  /** The swatch colour — the same stream colours the group cards head with. */
  swatch: string;
}

/* ⚠️ SWATCHES FROM THE ONE MAP (board fixes II, P4). These were the `--td-sw-*` tokens — written
   under a semantic ("sage = your live work") that never matched the board's band families, so
   Urgent wore sage and Your-tasks wore pink, the reverse of every card. The tokens are deleted;
   the family rows read todoFamily's FAMILY_SWATCH, and the two non-family rows (notes, snoozed)
   read its EXTRA_SWATCH so even the adjacents have one home.

   ⚠️ AND THE WORDS COME FROM `TASK_GROUP_META` FOR THE SAME REASON (rail + workspace, Phase 1).
   Four of these five name a group the To-do list also heads a panel with, and until now both
   lists typed the words out — which is how this file read "Urgent" while `todoGroups` read
   "Needs you now" for the identical set of cards, with nothing anywhere to notice. `notes` keeps
   a literal because it is the one row with no group behind it: the Noteboard's undated notes are
   not a task group, and inventing a sixth group to source one string would be the tail wagging
   the dog. */
export const TODO_LISTS: TodoList[] = [
  { id: "urgent", label: TASK_GROUP_META.urgent.label, swatch: FAMILY_SWATCH.urgent },
  { id: "housekeeping", label: TASK_GROUP_META.housekeeping.label, swatch: FAMILY_SWATCH.housekeeping },
  { id: "yours", label: TASK_GROUP_META.yours.label, swatch: FAMILY_SWATCH.yours },
  { id: "notes", label: "Notes to self", swatch: EXTRA_SWATCH.notes },
  { id: "snoozed", label: TASK_GROUP_META.snoozed.label, swatch: EXTRA_SWATCH.snoozed },
];

/**
 * ⚠️ THE TWO WINDOW CONTRACTS, NAMED ONCE. Both already existed as string literals scattered
 * across the shell and the page; a literal typed in two places is a listener that silently never
 * fires. `sa:open-task-settings` is the EXISTING name — the account menu dispatches it and
 * ToDoPage listens — and is kept verbatim rather than tidied, because renaming it would break the
 * one caller that already works.
 */
export const TODO_OPEN_TASK_SETTINGS = "sa:open-task-settings";

/**
 * The bar's ＋ New, in To-do context: open the composer in TASK mode.
 *
 * ⚠️ AN EVENT RATHER THAN A PROP, because the composer is page-local state inside ToDoPage and the
 * bar lives in the shell — three components above it. Threading a setter up through the shell
 * would make the chrome know what a composer is, which is exactly the coupling the shell has been
 * kept free of. The page listens; the bar announces.
 *
 * ⚠️ TASK MODE, NOT NOTE (audit item 7): one verb per control. The page's own pink action opens
 * the composer to choose; this one is the global "make something" and a global create that
 * produced a dateless note would be a different promise.
 */
export const TODO_OPEN_COMPOSER = "sa:open-todo-composer";

/**
 * ⚠️ THESE TWO WERE DEFINED IN THE TODAY PAGE AND CONSUMED BY THE TO-DO LIST — an inverted
 * dependency, and a load-bearing one (tasks-consolidation P1). `ToDoPage` imported them from
 * `TodoTodayPage`, so deleting Today would have taken the SURVIVING page's dock entrance with
 * it. That failure is silent by construction: an event name that no longer resolves is a
 * listener that simply never fires, and "Work the list" would have quietly stopped working with
 * nothing red anywhere.
 *
 * They live here, beside the app's other To-do events, so the deletion cannot reach them.
 *
 * `Work the list` is the dock's queue entrance — the To-do list's tool row announces it, the
 * page answers by launching the dock over its ranked order.
 */
export const TODO_WORK_THE_LIST = "sa:todo-work-the-list";
export const TODO_ADD_TO_TODAY = "sa:todo-add-to-today";
