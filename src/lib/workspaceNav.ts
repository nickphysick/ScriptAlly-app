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
/** The four To-do pages' row icons — keyed by TODO_ROUTES' own ids, so a fifth page cannot be
 *  added to the routes without this map (and therefore the nav) noticing. */
const TASKS_ICON: Record<string, string> = {
  list: "check",
  today: "sun",
  calendar: "calendar",
  noteboard: "note",
};

export function workspaceSections(input: WorkspaceNavInput): ShellSection[] {
  return [
    {
      id: "workspace",
      label: "Workspace",
      def: "dash",
      children: [
        { id: "dash", label: "Dashboard", path: "/dashboard", icon: "dash" },
        /* ⚠️ TO-DO LEFT THIS GROUP (sidebar-IA fix, 6 Aug — Nick's call, REVERSING the one-row
           fold below). It is the TASKS section now. The old reasoning ("the sub-routes are
           page-level views of one place") is superseded: four routed pages with their own
           chrome are peers in the IA, and the fold left Calendar reachable from nowhere. */
      ],
    },
    /* ⚠️ THE TASKS SECTION (sidebar-IA fix, 6 Aug) — directly after WORKSPACE, the same
       section grammar as Queries/Agents/Materials, NO new variant. Its rows ARE `TODO_ROUTES`
       — the one definition of the four pages (labels, paths, palette blurbs), so the sidebar,
       the ⌘K palette, the breadcrumb ("Tasks / To-do list") and every route-section lookup
       follow from the same source and cannot drift. The urgency dot + count ride the To-do
       list row alone — the board's own total, the ONLY count in the nav (Amendment 1, H5). */
    {
      id: "tasks",
      label: "Tasks",
      def: "list",
      children: TODO_ROUTES.map((r) => ({
        id: r.id,
        label: r.label,
        path: r.path,
        icon: TASKS_ICON[r.id],
        ...(r.id === "list" ? { count: input.todo || undefined, urgent: true as const } : {}),
      })),
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
    /* ⚠️ MATERIALS HAS THREE DESTINATIONS AGAIN, AND `/manuscripts` HAD NONE AT ALL.
       The section was childless-but-one for a stretch, carrying only Submission packages — which
       meant the manuscript library, a routed page with its own plate card, tabs and panes, was
       reachable from the shell only by typing the URL. That is the opposite failure from the one
       the file's header warns about: not a nav entry with no route, but a route with no nav entry.
       Both leave the sidebar lying about the shape of the app.

       ⚠️ THE ORDER IS BROAD TO NARROW, and it is not alphabetical by accident: the manuscript is
       the object, comps and packages are things you attach to it. `def` moves to `m-list` with the
       order — the section segment must land on the section's FIRST destination, or clicking
       "Materials" would skip the page the other two are about. */
    {
      id: "materials",
      label: "Materials",
      def: "m-list",
      children: [
        { id: "m-list", label: "Manuscripts", path: "/manuscripts", icon: "book" },
        { id: "m-comps", label: "Comparable titles", path: "/manuscripts/comps", icon: "shelf" },
        { id: "m-pkg", label: "Submission packages", path: "/manuscripts/packages", icon: "folder" },
      ],
    },
  ];
}
