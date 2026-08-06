/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * workspaceNav — THE IA of the workspace shell (shell-rebuild pack + Amendment 1).
 *
 * ⚠️ THE SHELL RENDERS WHAT EXISTS, NEVER WHAT IS PLANNED. A nav entry with no route is a dead
 * link, and a dead link in permanent chrome is worse than an absent one because it looks like a
 * decision. `Learn` and `Documents` are therefore absent — neither has a route — which is why
 * Materials is CHILDLESS rather than a one-child accordion. TODO(documents-route).
 *
 * ⚠️⚠️ AMENDMENT 1 (H) — THE SIDEBAR IS NAVIGATION ONLY. It never encodes a filter or a view of a
 * page; every entry is a distinct destination. This SUPERSEDES the original Baked 14, whose
 * Queries children were four filters over one hub (All queries / Needs attention / Awaiting
 * response / Closed).
 *
 * Why it matters beyond tidiness: filter-children make the nav a second control surface for a
 * page that already has one, so the sidebar and the page's own filter bar can disagree about
 * what you are looking at — and the nav starts needing counts, which is how a navigation column
 * turns into a dashboard. Queries now carries two real destinations, and the `?status=` param
 * survives as IN-PAGE, linkable state (palette results, dashboard deep-links) rather than
 * something the sidebar drives.
 *
 * ⚠️ AND SO THE ATTENTION SIGNAL LIVES ON TO-DO ALONE. With the filter children gone there is no
 * count under Queries and no badge on its rail icon.
 */
import { ShellSection } from "./workspaceShell";
import { TODO_ROUTES } from "./todoRoutes";

export interface WorkspaceNavInput {
  /** The To-do board's own total. The ONLY count in the nav (Amendment 1, H5). */
  todo: number;
}

/**
 * ⚠️ COUNTS ARE INJECTED, NEVER READ HERE. This file has no db imports, so the nav is unit-
 * testable in the node environment and each figure has exactly one derivation.
 */
/**
 * ⚠️ FLAT GROUPS — EVERY DESTINATION IS VISIBLE (final ref, `shell-workspace-doubledecker.html`:
 * "every destination is visible; groups map 1:1 to rail icons").
 *
 * THE ACCORDION IS RETIRED. Parent rows that expanded to reveal children meant half the app was
 * behind a disclosure you had to know to open, and the row you clicked to open it was ALSO a
 * destination — so one control did two jobs and the nav had a state to remember. Now every page
 * has its own row with its own icon, under a mono group label that is pure typography: a label is
 * not clickable, does not navigate, and holds no state.
 *
 * The groups map 1:1 to the rail's ribs, which is what makes the collapsed rail a complete map of
 * the app rather than a subset of it.
 */
export function workspaceSections(input: WorkspaceNavInput): ShellSection[] {
  return [
    {
      id: "workspace",
      label: "Workspace",
      def: "dash",
      children: [
        { id: "dash", label: "Dashboard", path: "/dashboard", icon: "dash" },
        /* ⚠️ ONE ROW, NOT A GROUP OF FOUR. The earlier build gave To-do its own group with
           To-do list · Today · Calendar · Noteboard, reasoning that folding it would hide three
           destinations. It does not: Today is linked from the board, Noteboard from Today, and
           the sub-routes are page-level views of one place rather than four peers in the IA.
           The ref files To-do here, and it is right — a nav column that lists every view of every
           page stops being navigation and becomes a table of contents.
           ⚠️ `/todo/calendar` HAS NO IN-PAGE LINK — flagged in reports/shell-polish.md, not
           solved by leaving a nav row in place to cover for it. */
        { id: "todo", label: "To-do", path: "/todo", icon: "check", count: input.todo || undefined, urgent: true },
      ],
    },
    {
      id: "queries",
      label: "Queries",
      def: "q-centre",
      children: [
        { id: "q-centre", label: "Query Centre", path: "/queries", icon: "send" },
        { id: "q-analytics", label: "Analytics", path: "/queries/analytics", icon: "chart" },
      ],
    },
    {
      id: "agents",
      label: "Agents",
      def: "a-list",
      children: [
        { id: "a-list", label: "Contact list", path: "/agents", icon: "people" },
        { id: "a-disc", label: "Discover", path: "/agents/discover", icon: "compass" },
      ],
    },
    {
      id: "materials",
      label: "Materials",
      def: "m-pkg",
      children: [{ id: "m-pkg", label: "Submission packages", path: "/manuscripts/packages", icon: "folder" }],
    },
  ];
}
