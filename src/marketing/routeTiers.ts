/**
 * Route-tier model — every route belongs to exactly one tier, and each tier owns its chrome
 * (design ref: design-refs/chrome-overview-v1.html).
 *
 *   marketing  — public shop window: "/" (landing) + "/pricing". MarketingShell chrome.
 *                Rendered for EVERYONE — a signed-in user is never auto-redirected off "/".
 *   focus      — step-out-of-the-workshop pages: /account · /plans · /help. FocusShell
 *                (slim bar, no rail). Requires auth — the existing global guard applies.
 *   workspace  — the workshop. Existing AppShell, untouched by the landing build.
 *
 * Pure module: no React, no Firebase — App.tsx branches on tierForPath, and the tests lock
 * the resolution table.
 */

export const MARKETING_PATHS = new Set(["/", "/pricing"]);

export const FOCUS_PATHS = new Set(["/account", "/plans", "/help"]);

/** The workspace route set — the AppShell tier (was App.tsx's KNOWN_PATHS before the tiers). */
export const WORKSPACE_PATHS = new Set([
  "/dashboard", "/queries", "/todo", "/agents", "/agents/discover",
  "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/import",
  "/email-import-dev",
]);

export type RouteTier = "marketing" | "focus" | "workspace" | null;

/** Resolve a (trailing-slash-normalised) pathname to its tier; null = unknown → dashboard. */
export function tierForPath(path: string): RouteTier {
  if (MARKETING_PATHS.has(path)) return "marketing";
  if (FOCUS_PATHS.has(path)) return "focus";
  if (WORKSPACE_PATHS.has(path)) return "workspace";
  return null;
}

/** The focus bar's mono breadcrumb text for a focus path — "/ ACCOUNT" etc. */
export function focusCrumb(path: string): string {
  const leaf = path.replace(/^\//, "");
  return "/ " + leaf.toUpperCase();
}
