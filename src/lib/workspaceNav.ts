/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * workspaceNav — THE IA of the workspace shell (shell-rebuild pack + Amendment 1).
 *
 * ⚠️ THE SHELL RENDERS WHAT EXISTS, NEVER WHAT IS PLANNED. A nav entry with no route is a dead
 * link, and a dead link in permanent chrome is worse than an absent one because it looks like a
 * decision. `Learn` and `Documents` are therefore absent — neither has a route.
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
import type { ShellChild, ShellHit, ShellSection } from "./workspaceShell";
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
  /* ⚠️ SIDEBAR MATERIALS v1 (6 Nov): six sections — Dashboard · Queries · Agents · Your book · Materials · Tasks.
     The rail, the full sidebar, the folder tab, the ⌘K palette and the crumbs all read this one list. There is no
     Calendar (retired 29 Oct). Each section names its own icon for the rail's section row. */
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
        { id: "dash", label: "Dashboard", path: "/dashboard", icon: "dash", rail: true },
      ],
    },
    {
      id: "queries",
      label: "Queries",
      icon: "send",
      def: "q-centre",
      children: [
        /* ⚠️ A SHORT LABEL IN THE FULL SIDEBAR ONLY (Nick's ruling, 25 Oct; kept 6 Nov): "Queries". `label` is
           still the page's full name, which the folder tab, the bar, breadcrumbs and the palette read. The rail
           has its own short label (`railLabel`). */
        { id: "q-centre", label: "Query Centre", navLabel: "Queries", path: "/queries", icon: "send", rail: true, railLabel: "Queries" },
        /* Responses v2 (15 Oct): every agent answer for the book in scope */
        { id: "q-responses", label: "Responses", path: "/queries/responses", icon: "replies" },
        { id: "q-analytics", label: "Analytics", path: "/queries/analytics", icon: "chart" },
      ],
    },
    {
      id: "agents",
      label: "Agents",
      icon: "people",
      def: "a-list",
      children: [
        { id: "a-list", label: "Contact list", path: "/agents", icon: "people", rail: true, railLabel: "Agents" },
        /* Pro, dormant: nothing gates Discover (`DISCOVER_OPEN_TO_ALL`) */
        { id: "a-disc", label: "Discover", path: "/agents/discover", icon: "compass", pro: "discover" },
      ],
    },
    /* ⚠️ "YOUR BOOK" — the manuscript and its versions (sidebar materials v1, 6 Nov). Its id is "book"; until 6 Nov it
       was "materials", which now names the Materials section below. Stored last-used entries keyed "materials" that
       name a Your-book page were dropped by the rail's memory, retired with the section cards (sidebar rail v2). */
    {
      id: "book",
      label: "Your book",
      icon: "library",
      def: "m-ms",
      children: [
        { id: "m-ms", label: "Manuscripts", path: "/manuscripts", icon: "library" },
        /* Manuscripts v27 Part E — Versions on its own page. Pro, dormant under founding access. */
        { id: "m-ver", label: "Versions", path: "/manuscripts/versions", icon: "versions", pro: "versions" },
      ],
    },
    /* ⚠️ MATERIALS (sidebar materials v1, 6 Nov): what goes out with a query. The whole SECTION is Pro ("materials"),
       so its rows carry no Pro mark of their own. Comps and Packages keep their old addresses (/manuscripts/comps,
       /queries/packages): only the nav regroups. Query letters is new, at /materials/letters. */
    {
      id: "materials",
      label: "Materials",
      icon: "mail",
      def: "m-letters",
      pro: "materials",
      children: [
        { id: "m-letters", label: "Query letters", path: "/materials/letters", icon: "letter", rail: true, railLabel: "Letters" },
        { id: "m-comps", label: "Comparable titles", path: "/manuscripts/comps", icon: "books", railLabel: "Comps" },
        { id: "q-pkg", label: "Submission packages", path: "/queries/packages", icon: "folder", railLabel: "Packages" },
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
        ...(r.id === "list" ? { count: input.todo || undefined, urgent: true as const, rail: true as const, railLabel: "Tasks" } : {}),
      })),
    },
    /* ⚠️ YOUR NOTES v1 (9 Nov): the founding writer's record of their notes. Never a rail item: it lives under More ›
       Founding writer, and the full sidebar's Give feedback card links to it as well. */
    {
      id: "founding",
      label: "Founding writer",
      icon: "notes",
      def: "notes",
      children: [
        { id: "notes", label: "Your notes", path: "/your-notes", icon: "notes" },
      ],
    },
    /* There is no Account section: Settings is the account's own furniture, reached from the foot. */
  ];
}

/* ══ SIDEBAR RAIL v2 (6 Nov): five places and More ══════════════════════════════════════════════════════════════
   The rail draws the pages flagged `rail`, in nav order; More holds every other page, grouped by its section. The
   section cards, their trays and the per-section last-used memory of rail v1 are deleted. */

/** The rail's own items, in nav order. */
export function railItems(sections: readonly ShellSection[]): ShellChild[] {
  return sections.flatMap((s) => (s.children ?? []).filter((c) => c.rail));
}

/** The More panel's groups: each section's pages that are not on the rail, in nav order; empty sections left out. */
export function moreGroups(sections: readonly ShellSection[]): { section: ShellSection; pages: ShellChild[] }[] {
  return sections
    .map((section) => ({ section, pages: (section.children ?? []).filter((c) => !c.rail) }))
    .filter((g) => g.pages.length > 0);
}

/** A page's short rail name. */
export const railLabelOf = (c: Pick<ShellChild, "label" | "railLabel">): string => c.railLabel ?? c.label;

/** The More page you are on (lights More, which takes its short name), or null. */
export function morePageFor(sections: readonly ShellSection[], hit: ShellHit | null): ShellChild | null {
  if (!hit?.child) return null;
  const sec = sections.find((s) => s.id === hit.section);
  const ch = sec?.children?.find((c) => c.id === hit.child);
  return ch && !ch.rail ? ch : null;
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
