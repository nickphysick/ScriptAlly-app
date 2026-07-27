/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * shellV2Nav — the React-free navigation model for the v2 app shell (ref
 * design-refs/scriptally-shell-v2.html): the icon rail's four sections + the pinned Setup
 * item, each section carrying its sidebar page list. One source for the rail, the sidebar
 * Pages nav, the masthead's section kicker and the top-bar breadcrumb — the railNav.ts
 * pattern, kept as a SEPARATE model because railNav.ts still feeds the (untouched) NavDrawer.
 *
 * Section→page mapping follows the mockup's product grammar, not the URL tree: Packages files
 * under Querying (a submission bundle is querying kit), while Comparable titles stays on the
 * Shelf beside its manuscript. Paths are matched EXACTLY — every page is an exact route, and
 * query strings (`/queries?q=…`) are pathname-invisible.
 */

export interface ShellV2Page {
  key: string;
  label: string;
  path: string;
}

export interface ShellV2Section {
  key: "desk" | "queries" | "agents" | "shelf";
  /** Rail caption — the mono micro-label under the icon (CSS uppercases it). */
  caption: string;
  /** The masthead kicker + breadcrumb section name. */
  sectionName: string;
  /** Rail click target — the section's lead page. */
  path: string;
  pages: ShellV2Page[];
}

export const SHELL_SECTIONS: ShellV2Section[] = [
  {
    key: "desk",
    caption: "Desk",
    sectionName: "Desk",
    path: "/dashboard",
    pages: [{ key: "dashboard", label: "Dashboard", path: "/dashboard" }],
  },
  {
    key: "queries",
    caption: "Queries",
    sectionName: "Querying",
    path: "/queries",
    pages: [
      { key: "queries-hub", label: "Queries Hub", path: "/queries" },
      { key: "todo", label: "To-do", path: "/todo" },
      { key: "packages", label: "Packages", path: "/manuscripts/packages" },
    ],
  },
  {
    key: "agents",
    caption: "Agents",
    sectionName: "Agents",
    path: "/agents",
    pages: [
      { key: "agents-list", label: "Contact list", path: "/agents" },
      { key: "agents-discover", label: "Discover", path: "/agents/discover" },
    ],
  },
  {
    key: "shelf",
    caption: "Shelf",
    sectionName: "Manuscripts",
    path: "/manuscripts",
    pages: [
      { key: "manuscripts", label: "Your manuscripts", path: "/manuscripts" },
      { key: "comps", label: "Comparable titles", path: "/manuscripts/comps" },
      { key: "import", label: "Import", path: "/import" },
    ],
  },
];

/** Setup — the rail-foot pinned item. Navigates OUT of the workspace tier (focus chrome). */
export const SHELL_SETUP = { key: "setup", caption: "Setup", path: "/account" } as const;

/** The page (and its owning section) an exact pathname belongs to; null off the map. */
export function shellPageForPath(
  pathname: string
): { section: ShellV2Section; page: ShellV2Page } | null {
  for (const section of SHELL_SECTIONS) {
    for (const page of section.pages) {
      if (page.path === pathname) return { section, page };
    }
  }
  return null;
}

/** The rail section a pathname lights, or null (focus/marketing/unknown light nothing). */
export function shellSectionKeyForPath(pathname: string): ShellV2Section["key"] | null {
  return shellPageForPath(pathname)?.section.key ?? null;
}

/** Top-bar breadcrumb segments — `Section / Page`, current page last (bold, inert). */
export function shellCrumbForPath(
  pathname: string
): { section: string; page: string } | null {
  const hit = shellPageForPath(pathname);
  return hit ? { section: hit.section.sectionName, page: hit.page.label } : null;
}
