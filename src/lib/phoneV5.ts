/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase A (design-refs/phone-app-v5/phone-hub-v5.html) — THE ADDRESSES. Below 768px only, except the two
 * desktop lines at the foot, which keep a computer exactly where it was before v5's two new addresses existed.
 *
 * Today is the hub: `/queries` and `/agents` land on Today with that tab chosen, and their full lists are pushed
 * (`/queries/all`, Today's agent list). Packages, letters, versions and comps land on Materials on their own tab. A deep
 * link that names one thing (`?pkg=`, `?version=`, `?view=birds`, `?court=`, `?focus=`, `?q=`, `?build=` …) keeps going
 * to the page that opens it, as before.
 */
import { MATERIALS_PATH, QUERIES_ALL_PATH } from "./phoneV3Nav";

export type TodayTab = "queries" | "agents" | "activity";
export const TODAY_TABS: readonly { key: TodayTab; label: string }[] = [
  { key: "queries", label: "Queries" }, { key: "agents", label: "Agents" }, { key: "activity", label: "Activity" },
];
export type MatTab = "packages" | "letters" | "versions" | "comps";
export const MAT_TABS: readonly { key: MatTab; label: string }[] = [
  { key: "packages", label: "Packages" }, { key: "letters", label: "Letters" }, { key: "versions", label: "Versions" }, { key: "comps", label: "Comps" },
];

export const isTodayTab = (x: string | null | undefined): x is TodayTab => !!x && TODAY_TABS.some((t) => t.key === x);
export const isMatTab = (x: string | null | undefined): x is MatTab => !!x && MAT_TABS.some((t) => t.key === x);

/** the tab a page was last left on, for this session (storage refused → the first tab) */
export const TODAY_TAB_KEY = "pa5.today.tab";
export const MAT_TAB_KEY = "pa5.materials.tab";
export function readTab<T extends string>(key: string, ok: (x: string | null) => x is T, first: T): T {
  try { const v = window.sessionStorage.getItem(key); return ok(v) ? v : first; } catch { return first; }
}
export function saveTab(key: string, v: string): void {
  try { window.sessionStorage.setItem(key, v); } catch { /* storage refused: the tab is still chosen for this visit */ }
}

/** `/manuscripts#…` (the v4 book page's sections) → the Materials tab that now holds that section */
const HASH_TAB: Record<string, MatTab> = { materials: "letters", comps: "comps", versions: "versions", packages: "packages" };

/**
 * Where a phone address goes in v5, or null when it renders where it is. `search` and `hash` carry their `?` / `#`.
 * Pure: App.tsx calls it among its early returns and navigates with `replace`.
 */
export function phoneV5Redirect(path: string, search: string, hash: string): string | null {
  const p = path.replace(/\/+$/, "") || "/";
  const q = search && search !== "?" ? search : "";
  if (p === "/queries") return q ? `${QUERIES_ALL_PATH}${q}` : "/dashboard?tab=queries";
  if (p === "/agents") return "/dashboard?tab=agents";
  if (p === "/queries/packages") return q ? null : `${MATERIALS_PATH}?tab=packages`;
  if (p === "/materials/letters") return `${MATERIALS_PATH}?tab=letters`;
  /* with a `?version=` (or anything else) these keep their v4 landing on the book page (PhoneSectionLanding) */
  if (p === "/manuscripts/comps") return q ? null : `${MATERIALS_PATH}?tab=comps`;
  if (p === "/manuscripts/versions") return q ? null : `${MATERIALS_PATH}?tab=versions`;
  if (p === "/manuscripts") {
    const tab = HASH_TAB[hash.replace(/^#/, "")];
    /* `?pkg=` / `?version=` open that item on the book page; `?edit=` / `?newpackage` / `?copy` are PhoneMaterialsHost's */
    return tab && !q ? `${MATERIALS_PATH}?tab=${tab}` : null;
  }
  return null;
}

/** At 768px and up the two v5 addresses keep a computer where it went before they existed */
export function desktopV5Redirect(path: string, search: string): string | null {
  const p = path.replace(/\/+$/, "") || "/";
  if (p === QUERIES_ALL_PATH) return `/queries${search && search !== "?" ? search : ""}`;
  if (p === MATERIALS_PATH) return "/dashboard";
  return null;
}
