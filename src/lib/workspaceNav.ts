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
    /* ⚠️ THE ORDER IS THE WORK'S ORDER (audit pack P5), and it CHANGED: Tasks used to lead,
       directly after Workspace. It now sits fourth, after Queries · Agents · Materials.

       The reasoning the 6 Aug fix recorded — that Tasks is a section rather than a page under
       Querying — is untouched and still right; only its POSITION moved. The three sections above
       it are the querying work itself, in the order it happens: you write to agents, you keep
       agents, you keep the materials you send them. Tasks is what falls out of that work, so it
       reads better after it than before it. */
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
    /* ⚠️ MANUSCRIPTS AND COMPARABLE TITLES JOIN MATERIALS (amendment 7 §6), and this RESTORES
       access rather than adding features: both pages have been live and routed all along, reachable
       only by typing the URL, because this section held nothing but Packages.
       ⚠️ THE ROWS ARE LITERALS, matching every other section in this file. They are NOT derived from
       `TODO_ROUTES` — that definition is the three To-do pages and drives the Tasks section alone.
       (A shared MATERIALS_ROUTES definition would be the tidier shape, but there is no second
       consumer to justify it yet; noted as a follow-up rather than done under a header pack.)
       ⚠️ AND `def` MOVED WITH THE ORDER. Every other section defaults to its FIRST child, so the
       rib now lands on Manuscripts rather than Packages — a deliberate behaviour change that comes
       with leading the section, not an oversight. */
    {
      id: "materials",
      label: "Materials",
      def: "m-ms",
      children: [
        { id: "m-ms", label: "Manuscripts", path: "/manuscripts", icon: "library" },
        { id: "m-comps", label: "Comparable titles", path: "/manuscripts/comps", icon: "books" },
        { id: "m-pkg", label: "Submission packages", path: "/manuscripts/packages", icon: "folder" },
      ],
    },
    /* ⚠️ ITS ROWS ARE `TODO_ROUTES` — the one definition of the To-do pages (labels, paths,
       palette blurbs), so the sidebar, the ⌘K palette, the breadcrumb ("Tasks / To-do list") and
       every route-section lookup follow from the same source and cannot drift. Do NOT hand-write
       these rows to change the section's place in the list: the order lives here, the rows do
       not. The urgency dot + count ride the To-do list row alone — the board's own total, and
       still the ONLY count in the nav (Amendment 1, H5). */
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
    /* ⚠️ ACCOUNT IS A SECTION NOW, AND SETTINGS CAME UP OUT OF THE FOOT (audit pack P5).
       Settings was a lone row pinned below the divider beside the user block — a destination
       living in the furniture rather than in the navigation, and the only page in the app you
       could not find by reading down the nav. It is an ordinary row in an ordinary section here.

       ⚠️ THE FOOT IS NOW THE USER ROW AND NOTHING ELSE, which is what makes the divider mean
       something: everything above it is somewhere to go, everything below it is who you are.

       One child, and that is honest rather than awkward — `/plans` and `/help` are real routes
       but they are reached from inside Settings and from the help control, so listing them here
       would be a second door apiece. The section grows when a page genuinely has no other home. */
    {
      id: "account",
      label: "Account",
      def: "settings",
      children: [{ id: "settings", label: "Settings", path: "/account", icon: "settings" }],
    },
  ];
}
