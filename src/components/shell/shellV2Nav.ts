/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * shellV2Nav — the React-free navigation model for the CAPSULE shell (ref
 * design-refs/scriptally-capsule-shell.html). One source for the rail ribs, the panel's
 * accordion, and the top-bar breadcrumb.
 *
 * The accordion's grammar: DASHBOARD IS A FLAT LINK (no children); FOUR collapsible sections —
 * Querying (Queries Hub · Packages), To-do (To-do list · Today · Calendar · Noteboard), Agents
 * (Agent list · Discover), Shelf (Manuscripts · Comparable titles). One section open at a time,
 * following the route. Import is OFF the nav (baked) — it keeps a breadcrumb entry via
 * CRUMB_EXTRAS and stays reachable from the Queries empty state. Paths are matched EXACTLY
 * (query strings are pathname-invisible).
 *
 * ⚠️ TO-DO IS A SECTION, NOT A PAGE UNDER QUERYING (workspace pack P1, Nick's call). It became a
 * workspace of four pages, and a workspace cannot be a leaf in someone else's section. The
 * consequence is deliberate and was chosen with its cost known: it LEAVES Querying (which is now
 * Queries Hub · Packages) and it takes a fifth rib on the rail. The rib is not decoration — the
 * rail's active state derives from the route's section, so without one, all four To-do routes
 * would light nothing, or would have to light Querying, which would be an active state that
 * lies about where you are.
 */

export interface ShellV2Page {
  key: string;
  label: string;
  path: string;
}

export interface ShellV2Section {
  key: "querying" | "agents" | "shelf" | "todo";
  label: string;
  pages: ShellV2Page[];
}

/** The flat Dashboard link — no chevron, no children; active = pink fill on the row. */
export const SHELL_DASHBOARD: ShellV2Page = { key: "dashboard", label: "Dashboard", path: "/dashboard" };

export const SHELL_SECTIONS: ShellV2Section[] = [
  {
    key: "querying",
    label: "Querying",
    pages: [
      { key: "queries-hub", label: "Queries Hub", path: "/queries" },
      { key: "packages", label: "Packages", path: "/manuscripts/packages" },
    ],
  },
  {
    key: "todo",
    label: "To-do",
    pages: [
      // The list is the DEFAULT — /todo itself, so every existing link, the ⌘K entry and the
      // rail's section-select all land on it without a redirect.
      { key: "todo", label: "To-do list", path: "/todo" },
      { key: "todo-today", label: "Today", path: "/todo/today" },
      { key: "todo-calendar", label: "Calendar", path: "/todo/calendar" },
      { key: "todo-noteboard", label: "Noteboard", path: "/todo/noteboard" },
    ],
  },
  {
    key: "agents",
    label: "Agents",
    pages: [
      { key: "agents-list", label: "Agent list", path: "/agents" },
      { key: "agents-discover", label: "Discover", path: "/agents/discover" },
    ],
  },
  {
    key: "shelf",
    label: "Shelf",
    pages: [
      { key: "manuscripts", label: "Manuscripts", path: "/manuscripts" },
      { key: "comps", label: "Comparable titles", path: "/manuscripts/comps" },
    ],
  },
];

/** The rail's five ribs — Dashboard + the four sections (each routes to its lead page). Order
 *  follows the accordion exactly: a rib and its section must never be in different places. */
export const SHELL_RAIL = [
  { key: "dashboard", caption: "Dashboard", path: "/dashboard" },
  { key: "querying", caption: "Querying", path: "/queries" },
  { key: "todo", caption: "To-do", path: "/todo" },
  { key: "agents", caption: "Agents", path: "/agents" },
  { key: "shelf", caption: "Shelf", path: "/manuscripts" },
] as const;

/** Setup — the rail item above the avatar (capsule fixes P5: /account now renders in the
 *  capsule shell like everything signed-in). */
export const SHELL_SETUP = { key: "setup", caption: "Setup", path: "/account" } as const;

/** The Setup family — off-nav workspace routes that light the Setup rib (fixes P5). */
export const SHELL_SETUP_PATHS = new Set(["/account", "/plans", "/help"]);

/** Off-nav routes that still deserve a breadcrumb; `rail` names the rib they light (if any). */
const CRUMB_EXTRAS: Record<string, { section: string; page: string; rail: "dashboard" | ShellV2Section["key"] | null }> = {
  "/import": { section: "Shelf", page: "Import", rail: "shelf" },
  "/account": { section: "Setup", page: "Account", rail: null },
  "/plans": { section: "Setup", page: "Plans", rail: null },
  "/help": { section: "Setup", page: "Help centre", rail: null },
};

/** The page (and its owning section, null for the flat Dashboard) an exact pathname maps to. */
export function shellPageForPath(
  pathname: string
): { section: ShellV2Section | null; page: ShellV2Page } | null {
  if (pathname === SHELL_DASHBOARD.path) return { section: null, page: SHELL_DASHBOARD };
  for (const section of SHELL_SECTIONS) {
    for (const page of section.pages) {
      if (page.path === pathname) return { section, page };
    }
  }
  return null;
}

/** The rail rib a pathname lights ("dashboard" | section key | null). */
export function shellSectionKeyForPath(
  pathname: string
): "dashboard" | ShellV2Section["key"] | null {
  const hit = shellPageForPath(pathname);
  if (!hit) return CRUMB_EXTRAS[pathname]?.rail ?? null;
  return hit.section ? hit.section.key : "dashboard";
}

/** The rail's click POLICY (rail-section-select pack, AMENDED by rail-icon-toggle): the rail
 *  selects a SECTION — it never picks a page — and the icon of the section that is ALREADY
 *  OPEN in the accordion TOGGLES the panel shut. Collapse keys off the OPEN section, never the
 *  section of the page you happen to be on (the two differ while browsing — the decisive
 *  point). An icon with more than one destination browses (expand + open, no navigation) or,
 *  when its section is the open one, collapses; exactly one destination navigates; already at
 *  the single destination → collapsed expands (no section open), expanded collapses when no
 *  section is open, or switches to the no-section view when one is (the table's implicit
 *  cell). Every cell does something — no no-op remains. Derived from the config —
 *  SHELL_SECTIONS pages counts, never a hardcoded list. NOTE (standing report flag): the
 *  accordion has no Setup section, so Setup derives as single-destination and navigates. */
export type RailClickPlan =
  | { kind: "navigate"; path: string }
  | { kind: "browse"; section: ShellV2Section["key"] | null }
  | { kind: "collapse" };

export function railClickPlan(
  ribKey: "dashboard" | ShellV2Section["key"] | "setup",
  pathname: string,
  collapsed: boolean,
  openSection: ShellV2Section["key"] | null
): RailClickPlan {
  const section = SHELL_SECTIONS.find((s) => s.key === ribKey);
  if (section && section.pages.length > 1) {
    if (!collapsed && openSection === section.key) return { kind: "collapse" }; // the toggle
    return { kind: "browse", section: section.key };
  }
  // Single destination (Dashboard; Setup as configured — see the note above).
  const path = ribKey === "setup" ? SHELL_SETUP.path : SHELL_DASHBOARD.path;
  if (pathname === path) {
    if (collapsed) return { kind: "browse", section: null };
    return openSection === null ? { kind: "collapse" } : { kind: "browse", section: null };
  }
  return { kind: "navigate", path };
}

/** Top-bar breadcrumb — `Section / Page`; the flat Dashboard is just its own bold name. */
export function shellCrumbForPath(
  pathname: string
): { section: string; page: string } | null {
  const extra = CRUMB_EXTRAS[pathname];
  if (extra) return { section: extra.section, page: extra.page };
  const hit = shellPageForPath(pathname);
  if (!hit) return null;
  return { section: hit.section ? hit.section.label : hit.page.label, page: hit.page.label };
}
