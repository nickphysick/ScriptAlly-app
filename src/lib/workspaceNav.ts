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
  /* ⚠️ SHELL NAV v3 (13 Nov; ref design-refs/shell-nav-v3.html): FIVE sections — Dashboard · Queries · Agents ·
     Materials · Tasks — and they are the rail's five rows, one per section. The rail, the full sidebar, the folder
     tabs, the ⌘K palette and the crumbs all read this one list. "Your book" is gone (Manuscripts and Versions are the
     last two pages of Materials) and "Founding writer" is gone from the nav (/your-notes is reached from the account
     menu, the feedback pop-up and the full sidebar's "See your notes" link). No page changed its address. */
  return [
    {
      id: "workspace",
      label: "Dashboard",
      icon: "dash",
      def: "dash",
      /* ⚠️ DASHBOARD SITS ON ITS OWN, WITH NO HEADING in the full sidebar (Nick's ruling, 25 Oct). */
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
        /* ⚠️ A SHORT LABEL IN THE FULL SIDEBAR ONLY (Nick's ruling, 25 Oct): "Queries". `label` is still the page's
           full name, which the tab strip, breadcrumbs and the palette read. */
        { id: "q-centre", label: "Query Centre", navLabel: "Queries", path: "/queries", icon: "send" },
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
        { id: "a-list", label: "Contact list", path: "/agents", icon: "people" },
        /* Pro (plan rules v1): the Scout — gated by the resolver, and the page by MaterialsLock page="scout" */
        { id: "a-disc", label: "Discover", path: "/agents/discover", icon: "compass", pro: "discover" },
      ],
    },
    /* ⚠️ MATERIALS: what goes out with a query, then the book itself. The Pro marks are the PAGES' own (shell nav v3):
       the three materials pages carry "materials", Versions "versions", Manuscripts none — so a Free writer's rail
       click on Materials lands on Manuscripts. The section carries no mark. Comps and Packages keep their old
       addresses (/manuscripts/comps, /queries/packages). `tabLabel` is the tab strip's short name only. */
    {
      id: "materials",
      label: "Materials",
      icon: "mail",
      def: "m-letters",
      children: [
        { id: "m-letters", label: "Query letters", tabLabel: "Letters", path: "/materials/letters", icon: "letter", pro: "materials" },
        { id: "q-pkg", label: "Submission packages", tabLabel: "Packages", path: "/queries/packages", icon: "folder", pro: "materials" },
        { id: "m-comps", label: "Comparable titles", tabLabel: "Comps", path: "/manuscripts/comps", icon: "books", pro: "materials" },
        /* Manuscripts v27 Part E — Versions on its own page. Pro, dormant under founding access. */
        { id: "m-ver", label: "Versions", path: "/manuscripts/versions", icon: "versions", pro: "versions" },
        { id: "m-ms", label: "Manuscripts", tabLabel: "Manuscript", path: "/manuscripts", icon: "library" },
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

/* ══ SHELL NAV v3 (13 Nov): the rail is PLACES — one row per section ═══════════════════════════════════════════
   Rail v2's per-page `rail` flags, its More panel (moreGroups, morePageFor) and its short rail labels are deleted. */

/** A page's name in the tab strip. Absent `tabLabel` = `label`. */
export const tabLabelOf = (c: Pick<ShellChild, "label" | "tabLabel">): string => c.tabLabel ?? c.label;

/** True when this page is Pro and the account is not entitled to it. */
export const isPageLocked = (c: Pick<ShellChild, "pro">, locked: ReadonlySet<string>): boolean => !!c.pro && locked.has(c.pro);

/**
 * Where a rail row goes: the section's `def` page, or — when that page is locked for this account — the first page
 * of the section that is not. No per-section memory of the last page. A section whose every page is locked still
 * goes to `def` (locked pages are shown locked, never hidden).
 */
export function railTargetFor(section: ShellSection, locked: ReadonlySet<string>): string {
  const kids = section.children ?? [];
  const def = kids.find((c) => c.id === section.def) ?? kids[0];
  if (!def) return section.path ?? "/dashboard";
  if (!isPageLocked(def, locked)) return def.path;
  return (kids.find((c) => !isPageLocked(c, locked)) ?? def).path;
}

/** The section whose rail row is lit: the current page's own section, or null (settings, /your-notes, Help…). */
export function railSectionFor(sections: readonly ShellSection[], hit: ShellHit | null): string | null {
  if (!hit?.child) return null;
  const sec = sections.find((s) => s.id === hit.section);
  return sec && (sec.children ?? []).some((c) => c.id === hit.child) ? sec.id : null;
}

/**
 * THE SETTINGS RAIL'S SHORT LABELS (sidebar rail v1), keyed by `ACCOUNT_ROUTES` ids. The pages, the
 * full sidebar and the aria-labels keep `ACCOUNT_ROUTES`' own names.
 */
export const SETTINGS_RAIL_LABELS: Readonly<Record<string, string>> = {
  profile: "You",
  preferences: "Preferences",
  emails: "Emails",
  plan: "Plan",
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
