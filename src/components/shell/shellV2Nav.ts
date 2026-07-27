/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * shellV2Nav — the React-free navigation model for the CAPSULE shell (ref
 * design-refs/scriptally-capsule-shell.html). One source for the rail ribs, the panel's
 * accordion, and the top-bar breadcrumb.
 *
 * The accordion's grammar: DASHBOARD IS A FLAT LINK (no children); three collapsible sections
 * — Querying (Queries Hub · To-do · Packages), Agents (Agent list · Discover), Shelf
 * (Manuscripts · Comparable titles). One section open at a time, following the route. Import
 * is OFF the nav (baked) — it keeps a breadcrumb entry via CRUMB_EXTRAS and stays reachable
 * from the Queries empty state. Paths are matched EXACTLY (query strings are
 * pathname-invisible).
 */

export interface ShellV2Page {
  key: string;
  label: string;
  path: string;
}

export interface ShellV2Section {
  key: "querying" | "agents" | "shelf";
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
      { key: "todo", label: "To-do", path: "/todo" },
      { key: "packages", label: "Packages", path: "/manuscripts/packages" },
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

/** The rail's four ribs — Dashboard + the three sections (each routes to its lead page). */
export const SHELL_RAIL = [
  { key: "dashboard", caption: "Dashboard", path: "/dashboard" },
  { key: "querying", caption: "Querying", path: "/queries" },
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
