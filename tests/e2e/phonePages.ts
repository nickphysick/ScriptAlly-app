/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Decision 2's pages (phone fixes v1): every phone page that must reach its last item by touch. One list, read by PF1's
 * F1 and by the journeys' J4 — a module of its own, because importing one spec from another runs its tests twice.
 */
export const PAGES = [
  "/dashboard", "/queries", "/todo", "/agents", "/todo/corkboard",
  "/queries/analytics", "/queries/responses", "/manuscripts", "/queries/packages", "/manuscripts/comps", "/manuscripts/versions",
  "/goals", "/agents/discover", "/help",
  "/account", "/account/profile", "/account/preferences", "/account/notifications", "/account/tasks", "/account/security", "/account/data", "/account/plan",
  "/plans", "/import",
];
