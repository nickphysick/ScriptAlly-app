/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 (design-refs/phone-app-v3/phone-app-v3.html) — WHERE A PHONE ADDRESS SITS IN THE FIVE PLACES.
 * Below 768px only; nothing at 768px and up reads this.
 *
 * Every address belongs to one of the four tabs (the fifth place, +, is a sheet, never an address). A tab's own page is
 * a ROOT: the slim header with the 30px title. Anything else is PUSHED from a tab: the back arrow and a 21px title, with
 * that tab still chosen in the bar (ref `render`: the bar is drawn on every screen).
 */

export type V3Tab = "today" | "queries" | "agents" | "you";

export const V3_TABS: readonly { key: V3Tab; label: string; path: string }[] = [
  { key: "today", label: "Today", path: "/dashboard" },
  { key: "queries", label: "Queries", path: "/queries" },
  { key: "agents", label: "Agents", path: "/agents" },
  { key: "you", label: "You", path: "/you" },
];

/** the You tab's own address (a phone-only page; a computer is sent to the dashboard) */
export const YOU_PATH = "/you";

const trim = (p: string): string => p.replace(/\/+$/, "") || "/";

/** a tab's own page (Phone app v4: Discover is pushed from Agents, so it carries a back arrow) */
export function v3IsRoot(pathname: string): boolean {
  const p = trim(pathname);
  return p === "/dashboard" || p === "/todo" || p === "/queries" || p === "/agents" || p === YOU_PATH;
}

/** the tab chosen in the bar for any address: Corkboard sits on Today, the pushed pages on You */
export function v3TabFor(pathname: string): V3Tab {
  const p = trim(pathname);
  if (p === "/dashboard" || p === "/todo" || p.startsWith("/todo/")) return "today";
  if (p === "/queries") return "queries";
  if (p === "/agents" || p.startsWith("/agents/")) return "agents";
  return "you";
}

/** a root's title (the tab's name); a pushed page keeps the title the shell already gives it */
export function v3RootTitle(pathname: string): string | null {
  if (!v3IsRoot(pathname)) return null;
  const t = v3TabFor(pathname);
  return V3_TABS.find((x) => x.key === t)!.label;
}

