/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SIX LIVING-HEADER ROUTES (living headers v3; ref design-refs/page-header/living-headers-v3.html).
 *
 * On these routes the page's NAME lives in the top bar's breadcrumb, from first paint, and the
 * in-page eyebrow is gone — the name is said once. Every other route keeps the quiet bar (its name
 * appears only once the page's own title has scrolled up behind it) and its header's eyebrow.
 *
 * ⚠️ ONE LIST, READ BY BOTH SIDES. The bar decides to show the crumb from this list and the shell
 * decides to withhold the eyebrow's section from the same one, so the two cannot disagree about a
 * page: a route here never shows both the crumb and the eyebrow, and a route not here never shows
 * neither. It is route-only — never data — so it is right before any count has arrived.
 */
export const LIVING_ROUTES = [
  "/queries",
  "/agents",
  "/todo",
  "/manuscripts/packages",
  "/manuscripts/comps",
  "/queries/analytics",
] as const;

/** Whether the bar carries the page's breadcrumb on this path (an exact route, no sub-routes). */
export function isLivingRoute(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return (LIVING_ROUTES as readonly string[]).includes(p);
}
