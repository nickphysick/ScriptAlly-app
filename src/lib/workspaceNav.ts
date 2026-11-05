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
/** The To-do pages' row icons — keyed by TODO_ROUTES' own ids, so a fifth page cannot be
 *  added to the routes without this map (and therefore the nav) noticing. */
const TASKS_ICON: Record<string, string> = {
  list: "check",
  today: "sun",
  noteboard: "note",
};

export function workspaceSections(input: WorkspaceNavInput): ShellSection[] {
  /* ⚠️ SIDEBAR RAIL v1 (5 Nov; section list ruled 5 Nov on dev's nav): five sections, most-used first —
     Dashboard · Queries · Agents · Your book · Tasks. The rail, the full sidebar, the folder tab, the ⌘K
     palette and the phone bar all read this one list. There is no Materials section and no Calendar
     (retired 29 Oct). Each section names its own icon for the rail's section row. */
  return [
    {
      id: "workspace",
      label: "Workspace",
      icon: "dash",
      def: "dash",
      /* ⚠️ DASHBOARD SITS ON ITS OWN, WITH NO HEADING (Nick's ruling, 25 Oct). The label stays "Workspace" because
         the folder tab still names the group; the rail names the row by its page. */
      noHeading: true,
      children: [
        { id: "dash", label: "Dashboard", path: "/dashboard", icon: "dash" },
      ],
    },
    {
      id: "queries",
      label: "Queries",
      icon: "send",
      def: "q-centre",
      children: [
        /* ⚠️ SHORT LABELS IN THE FULL SIDEBAR ONLY (Nick's ruling, 25 Oct): "Queries" and "Packages". `label` is
           still the page's full name, which the folder tab, the bar, breadcrumbs and the palette read; the rail's
           card has its own short labels (RAIL_SHORT_LABELS below). */
        { id: "q-centre", label: "Query Centre", navLabel: "Queries", path: "/queries", icon: "send" },
        /* Responses v2 (15 Oct): every agent answer for the book in scope */
        { id: "q-responses", label: "Responses", path: "/queries/responses", icon: "replies" },
        { id: "q-analytics", label: "Analytics", path: "/queries/analytics", icon: "chart" },
        /* Submission packages v26 (25 Oct): packages moved here from Materials — they are what goes out with a
           query. Last in the section (rail v1, most-used first). Pro, dormant while packages are open to all. */
        { id: "q-pkg", label: "Submission packages", navLabel: "Packages", path: "/queries/packages", icon: "folder", pro: "packages" },
      ],
    },
    {
      id: "agents",
      label: "Agents",
      icon: "people",
      def: "a-list",
      children: [
        { id: "a-list", label: "Contact list", path: "/agents", icon: "people" },
        /* Pro, dormant: nothing gates Discover (`DISCOVER_OPEN_TO_ALL`) */
        { id: "a-disc", label: "Discover", path: "/agents/discover", icon: "compass", pro: "discover" },
      ],
    },
    /* ⚠️ "YOUR BOOK" (Submission packages v26, 25 Oct): the manuscript, its versions and the titles it is
       compared with. The id stays "materials" so every section lookup keyed on it is unchanged; nothing a
       writer reads says Materials. The rail draws it with the Library icon. */
    {
      id: "materials",
      label: "Your book",
      icon: "library",
      def: "m-ms",
      children: [
        { id: "m-ms", label: "Manuscripts", path: "/manuscripts", icon: "library" },
        /* Manuscripts v27 Part E — Versions on its own page. Pro, dormant under founding access. */
        { id: "m-ver", label: "Versions", path: "/manuscripts/versions", icon: "versions", pro: "versions" },
        { id: "m-comps", label: "Comparable titles", path: "/manuscripts/comps", icon: "books" },
      ],
    },
    /* ⚠️ ITS ROWS ARE `TODO_ROUTES` — the one definition of the To-do pages. The count rides the To-do list row
       alone: the board's own total, and still the ONLY count in the nav (Amendment 1, H5). */
    {
      id: "tasks",
      label: "Tasks",
      icon: "check",
      def: "list",
      children: TODO_ROUTES.map((r) => ({
        id: r.id,
        label: r.label,
        path: r.path,
        icon: TASKS_ICON[r.id],
        ...(r.id === "list" ? { count: input.todo || undefined, urgent: true as const } : {}),
      })),
    },
    /* There is no Account section: Settings is the account's own furniture, reached from the foot. */
  ];
}

/**
 * THE RAIL'S SHORT LABELS (sidebar rail v1). The 80px rail has room for about ten characters of 10px
 * serif under each section, so two page names are shortened there and NOWHERE ELSE — the full sidebar,
 * the folder tab, the palette and every aria-label keep the full name. Keyed by page id; a page that is
 * not listed shows its own label.
 */
export const RAIL_SHORT_LABELS: Readonly<Record<string, string>> = {
  "q-pkg": "Packages",
  "m-comps": "Comps",
};

/**
 * The label a SECTION row wears in the rail. Dashboard is a section with no heading of its own — one row,
 * named by its page — so its row reads "Dashboard"; every other section reads its own label.
 */
export function railSectionLabel(sec: { id: string; label: string; children?: { label: string }[] }): string {
  return sec.id === "workspace" ? sec.children?.[0]?.label ?? sec.label : sec.label;
}

/** The label a page wears in the rail's open card. */
export function railPageLabel(child: { id: string; label: string }): string {
  return RAIL_SHORT_LABELS[child.id] ?? child.label;
}

/**
 * THE SETTINGS RAIL'S SHORT LABELS (sidebar rail v1), keyed by `ACCOUNT_ROUTES` ids. The pages, the
 * full sidebar and the aria-labels keep `ACCOUNT_ROUTES`' own names.
 */
export const SETTINGS_RAIL_LABELS: Readonly<Record<string, string>> = {
  profile: "Profile",
  security: "Security",
  plan: "Plan",
  notifications: "Alerts",
  preferences: "Settings",
  tasks: "Tasks",
  data: "Your data",
};

/**
 * Where a path sits in the nav — the section's label and the page's — or null when the path is not a
 * nav page. The phone bar's title reads this (rail v1, Phase 1), so the phone and the desktop name a
 * page from one list.
 */
export function workspacePageForPath(pathname: string): { section: string; page: string; single: boolean } | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  for (const sec of workspaceSections({ todo: 0 })) {
    const kids = sec.children ?? [];
    const ch = kids.find((c) => c.path === path);
    if (ch) return { section: sec.label, page: ch.label, single: kids.length === 1 };
  }
  return null;
}
