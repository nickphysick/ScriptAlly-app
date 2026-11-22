/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 (design-refs/phone-app-v3/phone-app-v3.html) — WHERE A PHONE ADDRESS SITS IN THE FIVE PLACES.
 * Below 768px only; nothing at 768px and up reads this.
 *
 * Phone app v5 (design-refs/phone-app-v5/phone-hub-v5.html `dock`): the five places are Today · To do · + · Materials ·
 * Profile. Queries and Agents are tabs INSIDE Today now, so their full lists (`/queries/all`, the agent list) are pushed
 * from Today; packages, letters, versions and comps are Materials; everything v4 kept under "You" is Profile.
 *
 * Every address belongs to one of the four tabs (the fifth place, +, is a sheet, never an address). A tab's own page is
 * a ROOT: no back arrow, the slim bar once scrolled. Anything else is PUSHED from a tab: the back arrow and its title,
 * with that tab still chosen in the dock.
 */

export type V3Tab = "today" | "todo" | "materials" | "profile";

export const V3_TABS: readonly { key: V3Tab; label: string; path: string }[] = [
  { key: "today", label: "Today", path: "/dashboard" },
  { key: "todo", label: "To do", path: "/todo" },
  { key: "materials", label: "Materials", path: "/materials" },
  { key: "profile", label: "Profile", path: "/you" },
];

/** the Profile tab's own address (a phone-only page; a computer is sent to the dashboard). v4 called it You. */
export const YOU_PATH = "/you";
/** Phone app v5: the full list of queries, pushed from Today's Queries tab (a computer is sent to `/queries`) */
export const QUERIES_ALL_PATH = "/queries/all";
/** Phone app v5: the Materials tab's own address (a computer is sent to the dashboard, as before) */
export const MATERIALS_PATH = "/materials";

const trim = (p: string): string => p.replace(/\/+$/, "") || "/";

/** a tab's own page */
export function v3IsRoot(pathname: string): boolean {
  const p = trim(pathname);
  return p === "/dashboard" || p === "/todo" || p === MATERIALS_PATH || p === YOU_PATH;
}

/** the tab chosen in the dock for any address */
export function v3TabFor(pathname: string): V3Tab {
  const p = trim(pathname);
  /* Today, and what Today's Queries and Agents tabs push (the full list, Discover) */
  if (p === "/dashboard" || p === "/queries" || p === QUERIES_ALL_PATH || p === "/agents" || p.startsWith("/agents/")) return "today";
  if (p === "/todo") return "todo";
  /* Materials: packages (and every page pushed from them), letters, versions, comps */
  if (p === MATERIALS_PATH || p.startsWith(`${MATERIALS_PATH}/`) || p === "/queries/packages" || p === "/manuscripts/comps" || p === "/manuscripts/versions") return "materials";
  /* Profile: the book, Responses, Analytics, the Corkboard, Settings, goals, help, plans, your notes, import */
  return "profile";
}

/** where a pushed page's back arrow goes when there is no history to go back through: its tab's root, and for what
 *  Today's tabs push, Today on that tab */
export function v3BackFor(pathname: string): string {
  const p = trim(pathname);
  if (p === "/agents" || p.startsWith("/agents/")) return "/dashboard?tab=agents";
  if (p === "/queries" || p === QUERIES_ALL_PATH) return "/dashboard?tab=queries";
  if (p === "/queries/packages") return `${MATERIALS_PATH}?tab=packages`;
  const t = v3TabFor(p);
  return V3_TABS.find((x) => x.key === t)!.path;
}

/** a root's title (the tab's name); a pushed page keeps the title the shell already gives it */
export function v3RootTitle(pathname: string): string | null {
  if (!v3IsRoot(pathname)) return null;
  const t = v3TabFor(pathname);
  return V3_TABS.find((x) => x.key === t)!.label;
}
