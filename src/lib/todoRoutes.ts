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

export type TodoPageId = "list" | "today" | "calendar" | "noteboard";

export interface TodoRoute {
  id: TodoPageId;
  label: string;
  path: string;
  /** The palette's one-line explanation — what the page is FOR, not what it is called. */
  blurb: string;
}

/** The default is the bare `/todo`, so an existing link or bookmark still lands somewhere real. */
export const TODO_ROUTES: TodoRoute[] = [
  { id: "list", label: "To-do list", path: "/todo", blurb: "Everything waiting on you, grouped by kind" },
  { id: "today", label: "Today", path: "/todo/today", blurb: "The list you built for today" },
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

export const TODO_LISTS: TodoList[] = [
  { id: "urgent", label: "Urgent", swatch: "var(--td-sw-urgent)" },
  { id: "housekeeping", label: "Housekeeping", swatch: "var(--td-sw-hk)" },
  { id: "yours", label: "Your tasks", swatch: "var(--td-sw-yours)" },
  { id: "notes", label: "Notes to self", swatch: "var(--td-sw-notes)" },
  { id: "snoozed", label: "Snoozed", swatch: "var(--td-sw-snoozed)" },
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
