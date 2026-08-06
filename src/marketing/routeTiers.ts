/**
 * Route-tier model — every route belongs to exactly one tier, and each tier owns its chrome.
 *
 *   marketing  — public shop window: "/" (landing) + "/pricing". MarketingShell chrome.
 *                Rendered for EVERYONE — a signed-in user is never auto-redirected off "/".
 *   workspace  — EVERYTHING signed-in, in the ONE capsule shell (capsule fixes P5: the focus
 *                tier is retired — /account, /plans and /help are workspace routes now; the
 *                shell census is capsule · marketing · onboarding-outside, nothing else).
 *
 * Pure module: no React, no Firebase — App.tsx branches on tierForPath, and the tests lock
 * the resolution table.
 */

export const MARKETING_PATHS = new Set(["/", "/pricing"]);

/** The workspace route set — the capsule-shell tier (every authenticated route). */
export const WORKSPACE_PATHS = new Set([
  "/dashboard", "/queries",
  // The To-do WORKSPACE — four pages, one section (workspace pack P1).
  "/todo", "/todo/today", "/todo/calendar", "/todo/noteboard",
  "/agents", "/agents/discover",
  "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/import",
  "/account", "/plans", "/help",
]);

export type RouteTier = "marketing" | "workspace" | null;

/** Resolve a (trailing-slash-normalised) pathname to its tier; null = unknown → dashboard. */
export function tierForPath(path: string): RouteTier {
  if (MARKETING_PATHS.has(path)) return "marketing";
  if (WORKSPACE_PATHS.has(path)) return "workspace";
  return null;
}
